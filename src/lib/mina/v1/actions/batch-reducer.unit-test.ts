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
  assert,
} from '../../../index.js';
import {
  TestInstruction,
  expectBalance,
  testLocal,
  transaction,
} from '../test/test-contract.js';
const { IndexedMerkleMap, BatchReducer } = Experimental;

const MINA = 1_000_000_000n;
const AMOUNT = 10n * MINA;

class MerkleMap extends IndexedMerkleMap(10) {}

// set up reducer
let batchReducer = new BatchReducer({
  actionType: PublicKey,

  // artificially low batch size to test batch splitting more easily
  batchSize: 3,

  // artificially low max pending action lists we process per proof, to test recursive proofs
  // the default is 100 in the final (zkApp) proof, and 300 per recursive proof
  // these could be set even higher (at the cost of larger proof times in the case of few actions)
  maxUpdatesFinalProof: 4,
  maxUpdatesPerProof: 4,
});
class Batch extends batchReducer.Batch {}
class BatchProof extends batchReducer.BatchProof {}

/**
 * Contract that manages airdrop claims.
 *
 * WARNING: This airdrop design is UNSAFE against attacks by users that set their permissions such that sending them MINA is impossible.
 * A single such user which claims the airdrop will cause the reducer to be deadlocked forever.
 * Workarounds exist but they require too much code which this example is not about.
 *
 * THIS IS JUST FOR TESTING. BE CAREFUL ABOUT REDUCER DEADLOCKS IN PRODUCTION CODE!
 */
class UnsafeAirdrop extends SmartContract {
  // Batch reducer related
  @state(Field)
  actionState = State(BatchReducer.initialActionState);
  @state(Field)
  actionStack = State(BatchReducer.initialActionStack);

  // Merkle map related
  @state(Field)
  eligibleRoot = State(eligible.root);
  @state(Field)
  eligibleLength = State(eligible.length);

  /**
   * Claim an airdrop.
   */
  @method
  async claim() {
    let address = this.sender.getUnconstrained();

    // ensure that the MINA account already exists and that the sender knows its private key
    let au = AccountUpdate.createSigned(address);
    au.body.useFullCommitment = Bool(true); // ensures the signature attests to the entire transaction

    batchReducer.dispatch(address);
  }

  /**
   * Go through pending claims and pay them out.
   *
   * Note: This two-step process is necessary so that multiple users can claim concurrently.
   */
  @method.returns(MerkleMap)
  async settleClaims(batch: Batch, proof: BatchProof) {
    // witness merkle map and require that it matches the onchain root
    let eligibleMap = Provable.witness(MerkleMap, () => eligible.clone());
    this.eligibleRoot.requireEquals(eligibleMap.root);
    this.eligibleLength.requireEquals(eligibleMap.length);

    // process claims by reducing actions
    batchReducer.processBatch({ batch, proof }, (address, isDummy) => {
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
  UnsafeAirdrop,
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
        let batches = await batchReducer.prepareBatches();

        // should cause 2 batches because we have 4 claims and batchSize is 3
        assert(batches.length === 2, 'two batches');

        // should not cause a recursive proof because onchain action processing was set to handle 4 actions
        assert(
          batches[0].batch.isRecursive.toBoolean() === false,
          'not recursive'
        );

        return batches.flatMap(({ batch, proof }, i) => [
          // we create one transaction for each batch
          transaction(`settle claims 1-${i}`, async () => {
            newEligible = await contract.settleClaims(batch, proof);
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
      // we submit the same claim 9 times to cause 2 recursive proofs
      // and to check that double claims are rejected
      () => Local.setProofsEnabled(false),
      ...Array.from({ length: 9 }, () =>
        transaction.from(danny)('danny claims 9x', () => contract.claim())
      ),
      () => Local.resetProofsEnabled(),

      // settle claims, 2
      async () => {
        console.time('recursive batch proof 2x');
        let batches = await batchReducer.prepareBatches();
        console.timeEnd('recursive batch proof 2x');

        // should cause 9/3 === 3 batches
        assert(batches.length === 3, 'three batches');

        // should have caused a recursive proof (2 actually) because ceil(9/4) = 3 proofs are needed (one of them done as part of the zkApp)
        assert(
          batches[0].batch.isRecursive.toBoolean() === true,
          'is recursive'
        );

        return batches.flatMap(({ batch, proof }, i) => [
          // we create one transaction for each batch
          transaction(`settle claims 2-${i}`, async () => {
            newEligible = await contract.settleClaims(batch, proof);
          }),
          // after each transaction, we update our local merkle map
          () => eligible.overwrite(newEligible),
        ]);
      },

      expectBalance(alice, AMOUNT),
      expectBalance(bob, AMOUNT),
      expectBalance(eve, 0n),
      expectBalance(charlie, AMOUNT),
      expectBalance(danny, AMOUNT), // only danny's first claim was fulfilled

      // no more claims to settle
      async () => {
        let batches = await batchReducer.prepareBatches();

        // sanity check that batchReducer doesn't create transactions if there is nothing to reduce
        assert(batches.length === 0, 'no more claims to settle');
      },
    ];
  }
);
