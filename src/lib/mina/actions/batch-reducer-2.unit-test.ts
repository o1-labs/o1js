/**
 * Example implementation of a MINA airdrop that allows concurrent withdrawals.
 */
import {
  AccountUpdate,
  Bool,
  Experimental,
  Field,
  method,
  Poseidon,
  Provable,
  PublicKey,
  SmartContract,
  State,
  state,
  UInt64,
  Permissions,
  assert,
} from '../../../index.js';
import {
  TestInstruction,
  expectBalance,
  testLocal,
  transaction,
} from '../test/test-contract.js';
import { ActionStackHints } from './batch-reducer.js';
const { IndexedMerkleMap, BatchReducer } = Experimental;

const MINA = 1_000_000_000n;
const AMOUNT = 10n * MINA;

class MerkleMap extends IndexedMerkleMap(10) {}

// set up reducer
let batchReducer = new BatchReducer({
  actionType: PublicKey,
  batchSize: 3,
  maxUpdatesFinalProof: 6,
  maxUpdatesPerProof: 6,
});
class ActionStackProof extends batchReducer.StackProof {}
class Hints extends ActionStackHints(PublicKey) {}

/**
 * Contract that manages airdrop claims.
 */
class Airdrop extends SmartContract {
  @state(Field)
  eligibleRoot = State(eligible.root);

  @state(Field)
  eligibleLength = State(eligible.length);

  @state(Field)
  actionState = State(BatchReducer.initialActionState);

  @state(Field)
  actionStack = State(BatchReducer.initialActionStack);

  @method
  async claim() {
    let address = this.sender.getUnconstrained();

    // ensure that the MINA account already exists and that the sender knows its private key
    let au = AccountUpdate.createSigned(address);
    au.body.useFullCommitment = Bool(true); // ensures the signature attests to the entire transaction

    // TODO we can only allow claiming to accounts that are disabling permissions updates
    // otherwise we risk contract deadlock if an account needs receive/access authorization
    // au.account.permissions.set({
    //   ...Permissions.initial(),
    //   setPermissions: Permissions.impossible(),
    // });

    batchReducer.dispatch(address);
  }

  @method.returns(MerkleMap.provable)
  async settleClaims(proof: ActionStackProof, hints: Hints) {
    // witness merkle map and require that it matches the onchain root
    let eligibleMap = Provable.witness(MerkleMap.provable, () =>
      eligible.clone()
    );
    this.eligibleRoot.requireEquals(eligibleMap.root);
    this.eligibleLength.requireEquals(eligibleMap.length);

    // process claims by reducing actions
    await batchReducer.processBatch(proof, hints, (address, isDummy) => {
      // check whether the claim is valid = exactly contained in the map
      let addressKey = key(address);
      let isValidField = eligibleMap.getOption(addressKey).orElse(0n);
      isValidField = Provable.if(isDummy, Field(0), isValidField);
      let isValid = Bool.Unsafe.fromField(isValidField); // not unsafe, because only bools can be put in the map

      // if the claim is valid, zero out the account in the map
      eligibleMap.setIf(isValid, addressKey, 0n);

      // if the claim is valid, send 100 MINA to the account
      let amount = Provable.if(isValid, UInt64.from(AMOUNT), UInt64.zero);
      let update = AccountUpdate.createIf(isValid, address);
      update.balance.addInPlace(amount);
      this.balance.subInPlace(amount);
    });

    // update the onchain root and action state pointer
    this.eligibleRoot.set(eligibleMap.root);
    this.eligibleLength.set(eligibleMap.length);

    // return the updated eligible map
    return eligibleMap;
  }
}

/**
 * How to map an address to a map key.
 */
function key(address: PublicKey) {
  return Poseidon.hash(address.toFields());
}

// TEST BELOW

const eligible = new MerkleMap();

await testLocal(
  Airdrop,
  { proofsEnabled: 'both', batchReducer },
  ({
    contract,
    accounts: { sender },
    newAccounts: { alice, bob, charlie, danny, eve },
    Local,
  }): TestInstruction[] => {
    // create a new map of accounts that are eligible for the airdrop
    eligible.overwrite(new MerkleMap());

    // for every eligible account, we store 1 in the map, representing TRUE
    // eve is not eligible, the others are
    [alice, bob, charlie, danny].forEach((address) =>
      eligible.insert(key(address), 1n)
    );
    let newEligible = eligible; // for tracking updates to the eligible map

    return [
      // preparation: sender funds the contract with 100 MINA
      transaction('fund contract', async () => {
        AccountUpdate.createSigned(sender).send({
          to: contract.address,
          amount: 100n * MINA,
        });
      }),

      // preparation: create user accounts
      transaction('create accounts', async () => {
        for (let address of [alice, bob, charlie, danny, eve]) {
          AccountUpdate.create(address); // empty account update causes account creation
        }
        AccountUpdate.fundNewAccount(sender, 5);
      }),

      // first 4 accounts claim
      // (we skip proofs here because they're not interesting for this test)
      () => Local.setProofsEnabled(false),
      transaction.from(alice)('alice claims', () => contract.claim()),
      transaction.from(bob)('bob claims', () => contract.claim()),
      transaction.from(eve)('eve claims', () => contract.claim()),
      transaction.from(charlie)('charlie claims', () => contract.claim()),
      () => Local.resetProofsEnabled(),

      // settle claims, 1
      async () => {
        console.time('batch proof 1');
        let batches = await batchReducer.prepareBatches();
        console.timeEnd('batch proof 1');

        return batches.flatMap(({ proof, hints }, i) => [
          // we create one transaction for each batch
          transaction(`settle claims 1-${i}`, async () => {
            newEligible = await contract.settleClaims(proof, hints);
          }),
          // after each transaction, we update our local merkle map
          () => eligible.overwrite(newEligible),
        ]);
      },

      expectBalance(alice, AMOUNT),
      expectBalance(bob, AMOUNT),
      expectBalance(eve, 0n), // eve was not eligible
      expectBalance(charlie, AMOUNT),
      expectBalance(danny, 0n), // danny didn't claim yet

      // more claims + final settling
      // we submit the same claim 15 times to cause 2 recursive proofs
      // and to check that double claims are rejected
      () => Local.setProofsEnabled(false),
      () =>
        Array.from({ length: 15 }, () =>
          transaction.from(danny)('danny claims 15x', () => contract.claim())
        ),
      () => Local.resetProofsEnabled(),

      // settle claims, 2
      async () => {
        console.time('batch proof 2');
        let batches = await batchReducer.prepareBatches();
        console.timeEnd('batch proof 2');

        return batches.flatMap(({ proof, hints }, i) => [
          // we create one transaction for each batch
          transaction(`settle claims 2-${i}`, async () => {
            newEligible = await contract.settleClaims(proof, hints);
          }),
          // after each transaction, we update our local merkle map
          () => eligible.overwrite(newEligible),
        ]);
      },

      expectBalance(alice, AMOUNT),
      expectBalance(bob, AMOUNT),
      expectBalance(eve, 0n),
      expectBalance(charlie, AMOUNT),
      expectBalance(danny, AMOUNT),

      // no more claims to settle
      async () => {
        console.time('batch proof 3');
        let batches = await batchReducer.prepareBatches();
        console.timeEnd('batch proof 3');
        assert(batches.length === 0, 'no more claims to settle');
      },
    ];
  }
);
