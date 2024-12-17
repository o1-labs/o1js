// The type of a withdrawal request. Values of this type are submitted into the action queue by
// users (with an accompanying WithdrawalProgram proof), and is reduced off-chain by the
// AirdropStateMachine.
//
// NOTE TO TEAM: Since Aidrop only needs a withdrawal action, it is not a compelling example of why
//               ZkEnum should be scoped into the MVP.
class Withdrawal extends Struct({
  nullifierHash: Field,
  withdrawalAddress: PublicKey
}) {}

// This program is utilized by users requesting withdrawals in order to prove they are the owner
// of a given nullifier hash.
const WithdrawalProgram = ZkProgram({
  name: 'WithdrawalProgram',
  publicInput: Field, // claimsRoot
  publicOutput: Withdrawal,

  methods: {
    withdraw: {
      privateInputs: [
        Unconstrained<MerkleTree>,
        Field,
        Field,
        PrivateKey
      ],

      method(
        claims: Unconstrained<MerkleTree>,
        claimIndex: Field,
        nullifier: Field,
        privateKey: PrivateKey
      ): Withdrawal {
        const withdrawalAddress = privateKey.toPublicKey();
        const nullifierHash = Poseidon.hash([nullifier]);
        const claim = Posiedon.hash([nullifier, ...privateKey.toFields()]);

        const claimWitness = Provable.witness(() => AirdropClaimWitness(claims.get(), claimIndex));
        const claimsRoot = claimWitness.verify(claim);

        return new Withdrawal({
          claimsRoot,
          nullifierHash,
          withdrawalAddress
        });
      }
    }
  }
});

// This buffer is used to accumulate successful withdrawals after they have been confirmed by the
// AirdropStateMachine. The max-size of this buffer is such that all of the accumulated withdrawals
// can be processed in the same transaction that a AirdropStateMachine reduction proof is included.
const SuccessfulWithdrawalBuffer = ZkBuffer(PublicKey, MAX_PROOF_CARRYING_ACCOUNT_UPDATES - 1);

// This program represents the core state-reduction model of the MinaAirdrop zkApp. It reduces
// withdrawal requests submitted by users into the used nullifier tree, checking for potential
// double withdrawals along the way. Every reduction emits a SuccessfulWithdrawalBuffer which
// tracks all of the withdrawals that were confirmed to not be duplicates.
const AirdropStateMachine = ZkStateMachine({
  name: 'AirdropStateMachine',
  State: Field, // usedNullifiersRoot
  Transition: Withdrawal,
  BatchAccumulator: SuccessfulWithdrawalBuffer,

  // globalPublicInput is constrained to be equal upon all invocations of step within a batch
  globalPublicInput: Field, // claimsRoot
  privateInputs: [Unconstrained<MerkleTree>]

  initBatch(): SuccessfulWithdrawalBuffer {
    return SuccessfulWithdrawalBuffer.empty();
  }

  stepEnabled(
    _claimsRoot: Field,
    pendingWithdrawals: SuccessfulWithdrawalBuffer,
    _usedNullifiersRoot: Field,
    _withdrawal: Withdrawal,
    _claims: Unconstrained<MerkleTree>
  ): Bool {
    return pendingWithdrawals.isFull().not();
  }

  step(
    claimsRoot: Field,
    pendingWithdrawals: SuccessfulWithdrawalBuffer,
    usedNullifiersRoot: Field,
    withdrawal: Withdrawal,
    claims: Unconstrained<MerkleTree>
  ): {reductionAccumulator: WithdrawalBuffer, state: Field} {
    const claimWitness = Provable.witness(() => new AirdropClaimWitness(claims.get(), withdrawal.claimIndex));
    claimWitness.calculateIndex().assertEquals(withdrawal.claimIndex);
    claimWitness.calculateRoot(withdrawal.nullifier).assertEquals(claimsRoot);

    const usedNullifierWitness = Provable.witness(() => new AirdropClaimWitness(usedNullifiers.get(), withdrawal.claimIndex));
    usedNullifierWitness.calculateIndex().assertEquals(withdrawal.claimIndex);
    const withdrawalIsValid = usedNullifierWitness.calculateRoot(new Field(0)).equals(usedNullifiersRoot);

    Provable.witness(() => usedNullifiers.set(), withdrawal.claimIndex, withdrawal.nullifer);
    const newUsedNullifiersRoot = const usedNullifierWitness.calculateRoot(withdrawal.nullifer);
    pendingWithdrawals.pushIf(withdrawalIsValid, withdrawal.withdrawalAddress);

    return {
      reductionAccumulator: pendingWithdrawals,
      state: newUsedNullifiersRoot
    };
  }
});

// NOTE TO TEAM: We can improve this state API with something like the following.
//   const MinaAirdropState = State(...);
//
//   const MyProgram: MinaProgram<typeof MinaAirdropState.Layout> = MinaProgram({
//     StateLayout: MinaAirdropState,
//
//     ...
//   });
type MinaAirdropState = {
  actionSnapshot: typeof Field,
  claimsRoot: typeof Field,
  usedNullifiersRoot: typeof Field
};
const MinaAirdropState = State({
  actionSnapshot: Field,
  claimsRoot: Field,
  usedNullifiersRoot: Field
});

const MinaAirdrop = MinaProgram({
  name: 'MinaAirdrop',
  State: MinaAirdropState,
  Action: Withdrawal,
  Event: GenericData,

  methods: {
    init: {
      privateInputs: [],

      method(env: MinaProgramEnv, claimsSumProof: ClaimsSumProof) {
        claimsSumProof.verify();
        const claimsRoot = claimsSumProof.publicInput;
        const claimsSum = claimsSumProof.publicOutput;
        const usedNullifiersRoot = MerkleMap.emptyRoot();

        return {
          authorizationKind: 'SignatureAndProof',
          useFullCommitment: new Bool(true),
          preconditions: {
            account:  {
              balance: claimsSum,
              isProved: new Bool(false)
            }
          },
          setState: {
            actionSnapshot: new Field(0),
            claimsRoot,
            usedNullifiersRoot
          }
        }
      }
    }

    requestWithdrawal: {
      privateInputs: [WithdrawalProgramProof],

      method(env: MinaProgramEnv, withdrawalProof: WithdrawalProgramProof) {
        withdrawalProof.verify();
        const claimsRoot = withdrawalProof.publicInput;
        const withdrawal = withdrawalProof.publicOutput;

        // PROBLEM: To make this non-replayable, we have to commit to the nonce, which has a race
        //          condition issue with other users.
        return {
          incrementNonce: new Bool(true),
          preconditions: {
            account: {
              isProved: new Bool(true),
              nonce: env.nonce.read(),
              state: {
                claimsRoot
              }
            },
          },
          pushActions: [withdrawal]
        };
      }
    },

    takeActionSnapshot: {
      privateInputs: [ActionSnapshotProof],

      method(env: MinaProgramEnv, snapshotProof: ActionSnapshotProof) {
        snapshotProof.verify();
        const snapshottedActionState = snapshotProof.publicInputg;
        const actionSnapshot = snapshotProof.publicOutput;

        return {
          incrementNonce: new Bool(true),
          preconditions: {
            account: {
              isProved: new Bool(true),
              nonce: env.account.nonce.read(),
              actionState: snapshottedActionState,
              state: {
                actionSnapshot: new Field(0)
              }
            }
          },
          setState: {
            actionSnapshot: actionSnapshot;
          }
        }
      }
    },

    reduce: {
      privateInputs: [AirdropStateTransitionProof],

      method(env: MinaProgramEnv, transitionProof: AirdropStateTransitionProof) {
        transitionProof.verify();
        const claimsRoot = transitionProof.globalPublicInput;
        const usedNullifiersRoot = transitionProof.inputState;
        const updatedUsedNullifiersRoot = transitionProof.outputState;
        const withdrawals = transitionProof.reductionAccumulator;

        let totalWithdrawn = UInt64.zero;
        const childUpdates = new DynamicAccountUpdateChildren();

        for(const i = 0; i < WithdrawalBuffer.MAX_SIZE; i++) {
          const withdrawalEntry = withdrawals.get(i);
          const {withdrawalAmount, withdrawalAddress} = withdrawalEntry.value;
          const withdrawalUpdate = new AccountUpdate({
            accountId: new AccountId(withdrawalAddress, TokenId.MINA),
            authorizationKind: 'None',
            balanceChange: Int64.create(withdrawalAmount, Sign.one)
          });

          totalWithdrawn = totalWithdrawn.add(withdrawalAmount);
          childUpdates.pushIf(withdrawalEntry.exists, withdrawalUpdate);
        }

        return {
          incrementNonce: new Bool(true),
          preconditions: {
            account: {
              isProved: new Bool(true),
              nonce: env.account.nonce.read(),
              state: {
                claimsRoot,
                usedNullifiersRoot
              }
            }
            // TODO: IMPORTANT -- we have to show we consumed actions from the stack
          },
          balanceChange: Int64.create(totalWithdrawn, Sign.minusOne),
          setState: {
            usedNullifiersRoot: updatedUsedNullifiersRoot
          },
          children: childUpdates
        }
      }
    }
  }
});
