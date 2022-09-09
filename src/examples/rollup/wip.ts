import {
  Field,
  CircuitValue,
  prop,
  PrivateKey,
  PublicKey,
  Signature,
  AccountUpdate,
  Permissions,
  State,
  SmartContract,
  state,
  method,
  Mina,
  UInt32,
  UInt64,
  Int64,
  isReady,
  proofSystem,
  branch,
  ProofWithInput,
} from 'snarkyjs';

import {
  AccumulatorMembershipProof,
  Index,
  IndexedAccumulator,
  KeyedAccumulatorFactory,
  MerkleAccumulatorFactory,
  MerkleProof,
} from './merkle_proof';
import { MerkleStack } from './merkle_stack';
import * as DataStore from './data_store';

await isReady;

const AccountDbDepth: number = 32;
const AccountDb = KeyedAccumulatorFactory<PublicKey, RollupAccount>(
  AccountDbDepth
);
type AccountDb = InstanceType<typeof AccountDb>;

class RollupAccount extends CircuitValue {
  @prop balance: UInt64;
  @prop nonce: UInt32;
  @prop publicKey: PublicKey;
}

class RollupTransaction extends CircuitValue {
  @prop amount: UInt64;
  @prop nonce: UInt32;
  @prop sender: PublicKey;
  @prop receiver: PublicKey;
}

class RollupDeposit extends CircuitValue {
  @prop publicKey: PublicKey;
  @prop amount: UInt64;
}

class RollupState extends CircuitValue {
  @prop pendingDepositsCommitment: Field;
  @prop accountDbCommitment: Field;
}

class RollupStateTransition extends CircuitValue {
  @prop source: RollupState;
  @prop target: RollupState;
}

// a recursive proof system is kind of like an "enum"

@proofSystem
class RollupProof extends ProofWithInput<RollupStateTransition> {
  @branch static processDeposit(
    pending: MerkleStack<RollupDeposit>,
    accountDb: AccountDb
  ): RollupProof {
    let before = new RollupState(pending.commitment, accountDb.commitment());
    // let deposit = pending.pop();

    // TODO: Apply deposit to db

    let after = new RollupState(pending.commitment, accountDb.commitment());

    return new RollupProof(new RollupStateTransition(before, after));
  }

  @branch static transaction(
    t: RollupTransaction,
    s: Signature,
    pending: MerkleStack<RollupDeposit>,
    accountDb: AccountDb
  ): RollupProof {
    s.verify(t.sender, t.toFields()).assertEquals(true);
    let stateBefore = new RollupState(
      pending.commitment,
      accountDb.commitment()
    );

    let [senderAccount, senderPos] = accountDb.get(t.sender);
    senderAccount.isSome.assertEquals(true);
    senderAccount.value.nonce.assertEquals(t.nonce);

    senderAccount.value.balance = senderAccount.value.balance.sub(t.amount);
    senderAccount.value.nonce = senderAccount.value.nonce.add(1);

    accountDb.set(senderPos, senderAccount.value);

    let [receiverAccount, receiverPos] = accountDb.get(t.receiver);
    receiverAccount.value.balance = receiverAccount.value.balance.add(t.amount);
    accountDb.set(receiverPos, receiverAccount.value);

    let stateAfter = new RollupState(
      pending.commitment,
      accountDb.commitment()
    );
    return new RollupProof(new RollupStateTransition(stateBefore, stateAfter));
  }

  // Is branch a good name?
  @branch static merge(p1: RollupProof, p2: RollupProof): RollupProof {
    p1.publicInput.target.assertEquals(p2.publicInput.source);
    return new RollupProof(
      new RollupStateTransition(p1.publicInput.source, p2.publicInput.target)
    );
  }
}

const OperatorsDbDepth: number = 8;
const OperatorsDb = MerkleAccumulatorFactory<PublicKey>(OperatorsDbDepth);
type OperatorsDb = InstanceType<typeof OperatorsDb>;

// Rollup proof system itself (executed off chain)

// Rollup zkapp

/*
  There is a database of accounts that exists offchain ("hosted" on IPFS)
    - rollup state

  There is a database of permissioned rollup operator public keys, that's private
  and stored on the disk of the owner of this zkapp account.

  - if you're the owner, you can add a permissioned operator to the set of operators
    - you can only do this every 20 slots
  - if you're a user, you can deposit funds into the rollup (in the future you can withdraw too)
  - if you're a rollup operator, you can post a rollup proof to the zkapp account and thus
    update its state


    - init 
    - usage
    - methods
    - state
*/

/*
A zkapp transaction is a list of permissioned, precondition, updates

- where a permission is a proof or a signature or nothing
- a precondition is a series of assertions about the current state on Mina
  - network preconditions (assertions on the protocol state)
  - account preconditions (specific to state in an account)
- an update is an edit to the on-chain state.
*/

/*
  
general stuff for defining types that can be used as private/public inputs
@prop

smart contract specific
@state
@method

A circuit is a function that whose inputs are divided into
public inputs and private inputs

A smart contract is basically 
- a description of the on-chain state used by that smart contract

  the @state decorator is used to list out the onchain state
- a list of circuits all of which have as their public input
  the same thing, which is essentially a zkapp transaction
  
  - zkapp transaction
    - pr
  
  the @method decorator is used to list out all these circuits

  and each individual circuit basically checks, "is this zkapp
  transaction (i.e., the one currently being constructed) 
  acceptable to me"
*/

class RollupZkapp extends SmartContract {
  @state(Field) operatorsCommitment = State<Field>(); // state slot 0
  @state(RollupState) rollupState = State<RollupState>(); // state slots 1, 2
  // RollupState public rollupState;

  // The 5 slot period during which this was last updated
  @state(UInt32) lastUpdatedPeriod = State<UInt32>(); // state slot 3
  // UInt32 public lastUpdatedPeriod

  // maybe try something like react state hooks?

  static instanceOnChain(address: PublicKey): RollupZkapp {
    throw 'instanceonchain';
  }

  static periodLength = 5;
  static newOperatorGapSlots = 20;
  static newOperatorGapPeriods =
    RollupZkapp.newOperatorGapSlots / RollupZkapp.periodLength;

  deploy(
    senderAmount: UInt64,
    operatorsDb: OperatorsDb,
    accountDb: AccountDb,
    deposits: MerkleStack<RollupDeposit>,
    lastUpatedPeriod: UInt32
  ) {
    this.self.balance.addInPlace(senderAmount);
    this.operatorsCommitment.set(operatorsDb.commitment());
    this.lastUpdatedPeriod.set(lastUpatedPeriod);
    this.rollupState.set(
      new RollupState(deposits.commitment, accountDb.commitment())
    );
    let perms = Permissions.default();
    // Force users to use the deposit method to send to this account
    perms.receive = Permissions.proof();
    perms.editState = Permissions.proof();
    this.self.update.permissions.setValue(perms);
  }

  // Only allowed to update every so often
  @method addOperator(
    submittedSlot: UInt32,
    operatorsDb: OperatorsDb,
    pk: PublicKey,
    s: Signature
  ) {
    let period = submittedSlot.div(RollupZkapp.periodLength);
    let startSlot = period.mul(RollupZkapp.periodLength);

    /*
    this.deferToOnChain((onChainState) => {
    })
    */

    /*
    *
    precondition.network({ protocolState } => {
      protocolState.globalSlotSinceGenesis.assertBetween(
        startSlot, startSlot.add(RollupZkapp.periodLength));
      )
    })

    this.self.precondition({ accountState } => {

    });

    */

    /*
    this.protocolState.globalSlotSinceGenesis.assertBetween(
      startSlot, startSlot.add(RollupZkapp.periodLength));
      */

    // Check it has been a while since the last addition of a new
    // operator
    /*
    period.assertGt(
      this.lastUpdatedPeriod.get()
      .add(RollupZkapp.newOperatorGapPeriods)
    );
    */
    this.lastUpdatedPeriod.set(period);

    this.operatorsCommitment.assertEquals(operatorsDb.commitment());

    const self = this.self;

    // verify signature on
    // message = [ submittedSlot, operatorPubKey ]
    let message = submittedSlot.toFields().concat(pk.toFields());
    s.verify(self.publicKey, message).assertEquals(true);

    operatorsDb.add(pk);
    this.operatorsCommitment.set(operatorsDb.commitment());
  }

  @method depositFunds(
    depositor: AccountUpdate & { predicate: UInt32 },
    depositAmount: UInt64
  ) {
    const self = this.self;

    self.balance.addInPlace(depositAmount);
    depositor.balance.subInPlace(depositAmount);

    let deposit = new RollupDeposit(depositor.publicKey, depositAmount);
    this.emitEvent(deposit);
    const rollupState = this.rollupState.get();

    /*
    rollupState.pendingDepositsCommitment = MerkleStack.pushCommitment(
      deposit, rollupState.pendingDepositsCommitment
    );
    this.rollupState.set(rollupState);
    */
  }

  @method updateRollupState(
    // TODO: Explicitly verify the proof
    rollupProof: RollupProof,
    operatorMembership: AccumulatorMembershipProof,
    // Operator signs the new rollup state
    operator: PublicKey,
    operatorSignature: Signature
  ) {
    // What you can actually do with zkapp state fields is
    // - assert that they have a given value
    // - set them to a new value
    /*
    operatorMembership.verify(this.operatorsCommitment.get(), operator)
    .assertEquals(true);

    operatorSignature.verify(operator, rollupProof.publicInput.target.toFields())
    .assertEquals(true);

    // account precondition
    this.rollupState.assertEquals(rollupProof.publicInput.source);
    // account update
    this.rollupState.set(rollupProof.publicInput.target);
    */
  }
}

function main() {
  const minaSender = PrivateKey.random();
  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const largeValue = '30000000000';
  Local.addAccount(minaSender.toPublicKey(), largeValue);

  // TODO: Put real value
  let zkappOwnerKey = PrivateKey.random();
  let zkappPubkey = zkappOwnerKey.toPublicKey();
  console.log(0);

  let depositorPrivkey = PrivateKey.random();
  let depositorPubkey = depositorPrivkey.toPublicKey();
  console.log('depositorpubkey', depositorPubkey.toJSON());
  Local.addAccount(depositorPubkey, largeValue);

  console.log(1);
  const depth = 8;
  // Private state. Lives on disk.
  let operatorsDbStore = DataStore.InMemory<PublicKey>(PublicKey, depth);

  let operatorsDb = OperatorsDb.fromStore(operatorsDbStore);

  console.log(2);
  // Add a new rollup operator
  let newOperatorPrivkey = PrivateKey.random();
  let newOperatorPubkey = newOperatorPrivkey.toPublicKey();
  let currentSlot = Mina.currentSlot();
  let message = currentSlot.toFields().concat(newOperatorPubkey.toFields());
  let signature = Signature.create(zkappOwnerKey, message);
  console.log(3);

  let accountKey = (a: RollupAccount) => a.publicKey;
  // Public state, the state of accounts on the rollup.
  let accountDbStore = DataStore.Keyed.InMemory(
    RollupAccount,
    PublicKey,
    accountKey,
    AccountDbDepth
  );
  let accountDb: AccountDb = AccountDb.create(accountKey, accountDbStore);

  let pendingDeposits = new MerkleStack<RollupDeposit>(RollupDeposit, () => []); // todo: storage

  let RollupInstance: RollupZkapp;

  console.log(4);

  // TODO: Have a mock Mina module for testing purposes
  // TODO: Make sure that modifications to data stores are not
  // committed before corresponding changes happen on chain

  // Executes a zkapp method, broadcasts the transaction to chain.
  return Mina.getAccount(minaSender.toPublicKey())
    .then((a) => {
      console.log('sender account', JSON.stringify(a));
    })
    .then(() =>
      Mina.transaction(minaSender, () => {
        const amount = UInt64.fromNumber(1000000000);

        return AccountUpdate.createSigned(depositorPrivkey).then((p) => {
          p.body.delta = Int64.fromUnsigned(amount).neg();
          RollupInstance = new RollupZkapp(zkappPubkey);
          RollupInstance.deploy(
            amount,
            operatorsDb,
            accountDb,
            pendingDeposits,
            UInt32.fromNumber(0)
          );
        });
      })
        .send()
        .wait()
    )
    .then(() => {
      console.log('after init');
      return Mina.getAccount(zkappPubkey)
        .then((a) => {
          console.log('got account', JSON.stringify(a));
        })
        .catch((e) => {
          console.log('bad', e);
          throw e;
        });
    })
    .then(() => {
      return Mina.transaction(minaSender, () => {
        console.log('main', 5);
        RollupInstance.addOperator(
          Mina.currentSlot(),
          operatorsDb,
          newOperatorPubkey,
          signature
        );
      })
        .send()
        .wait()
        .catch((e) => {
          console.log('fuc', e);
          throw e;
        })
        .then(() => {
          console.log('main', 6);
          return Mina.transaction(minaSender, () => {
            return AccountUpdate.createSigned(depositorPrivkey).then(
              (depositor) => {
                // TODO: Figure out nicer way to have a second party.

                return Mina.getBalance(depositorPubkey).then(
                  (depositorBalance) => {
                    // Deposit some funds into the rollup
                    RollupInstance.depositFunds(
                      depositor,
                      depositorBalance.div(2)
                    );
                  }
                );
              }
            );
          })
            .send()
            .wait()
            .catch((e) => {
              console.log('fuc', e);
              throw e;
            });
        })
        .then(() => {
          console.log('main', 7);
          let rollupAmount = UInt64.fromNumber(10);
          let rollupNonce = UInt32.fromNumber(0);
          let rollupSender = depositorPubkey;
          let rollupReceiver = depositorPubkey;
          let rollupTransaction = new RollupTransaction(
            rollupAmount,
            rollupNonce,
            rollupSender,
            rollupReceiver
          );
          console.log('main', 8);

          const p1 = RollupProof.processDeposit(pendingDeposits, accountDb);
          console.log('main', 80);
          const p2 = RollupProof.transaction(
            rollupTransaction,
            Signature.create(depositorPrivkey, rollupTransaction.toFields()),
            pendingDeposits,
            accountDb
          );

          console.log('main', 81);
          let rollupProof = RollupProof.merge(p1, p2);

          console.log('main', 9);
          return Mina.transaction(minaSender, () => {
            console.log('main', 10);
            let membershipProof =
              operatorsDb.getMembershipProof(newOperatorPubkey);
            console.log('main', 11);
            if (membershipProof === null) {
              throw 'not an operator';
            }
            RollupInstance.updateRollupState(
              rollupProof,
              membershipProof,
              newOperatorPubkey,
              Signature.create(
                newOperatorPrivkey,
                rollupProof.publicInput.target.toFields()
              )
            );
          })
            .send()
            .wait()
            .catch((e) => {
              console.log('rrr', e);
              throw e;
            });
        });
    });
}

main();
