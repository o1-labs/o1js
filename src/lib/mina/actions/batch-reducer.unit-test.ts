/**
 * Example implementation of a MINA airdrop that allows concurrent withdrawals.
 */
import { setDebugContext } from 'src/lib/util/global-context.js';
import {
  AccountUpdate,
  Bool,
  Experimental,
  Field,
  method,
  Mina,
  Poseidon,
  Provable,
  PublicKey,
  SmartContract,
  State,
  state,
  UInt64,
  Permissions,
} from '../../../index.js';
import {
  expectBalance,
  testLocal,
  transaction,
} from '../test/test-contract.js';
const { IndexedMerkleMap, BatchReducer } = Experimental;

const AMOUNT = 100_000n;

class MerkleMap extends IndexedMerkleMap(10) {}

// a couple of test accounts
const accounts = Mina.TestPublicKey.random(20);

// create a map of accounts that are eligible for the airdrop
const eligible = createEligibleMap(accounts);

// set up reducer
let batchReducer = new BatchReducer({ actionType: PublicKey, batchSize: 3 });
class ActionBatchProof extends batchReducer.Proof {}

/**
 * Contract that manages airdrop claims.
 */
class Airdrop extends SmartContract {
  @state(Field)
  eligibleRoot = State(eligible.root);

  @state(Field)
  actionState = State(BatchReducer.initialActionState);

  @method
  async claim(address: PublicKey) {
    // ensure that the MINA account already exists and that the sender knows its private key
    let au = AccountUpdate.createSigned(address);
    au.body.useFullCommitment = Bool(true); // ensures the signature attests to the entire transaction

    // TODO we can only allow claiming to accounts that are disabling permissions updates
    // otherwise we risk contract deadlock if an account needs receive/access authorization
    au.account.permissions.set({
      ...Permissions.initial(),
      setPermissions: Permissions.impossible(),
    });

    batchReducer.dispatch(address);
  }

  @method.returns(MerkleMap.provable)
  async settleClaims(proof: ActionBatchProof) {
    // fetch merkle map and assert that it matches the onchain root
    let root = this.eligibleRoot.getAndRequireEquals();
    let eligible = await Provable.witnessAsync(
      MerkleMap.provable,
      fetchEligibleMap
    );
    eligible.root.assertEquals(root);

    // process claims by reducing actions
    await batchReducer.processNextBatch(proof, (address, isDummy) => {
      // check whether the claim is valid = exactly contained in the map
      let addressKey = key(address);
      let isValidField = eligible.getOption(addressKey).orElse(0n);
      Provable.log(address, isValidField, isDummy);
      isValidField = Provable.if(isDummy, Field(0), isValidField);
      let isValid = Bool.Unsafe.fromField(isValidField); // not unsafe, because only bools can be put in the map

      // if the claim is valid, zero out the account in the map
      eligible.setIf(isValid, addressKey, 0n);

      // if the claim is valid, send 100 MINA to the account
      let amount = Provable.if(isValid, UInt64.from(AMOUNT), UInt64.zero);
      let update = AccountUpdate.createIf(isValid, address);
      update.balance.addInPlace(amount);
      this.balance.subInPlace(amount);
    });

    // update the onchain root and action state pointer
    this.eligibleRoot.set(eligible.root);

    // return the updated eligible map
    return eligible;
  }
}

/**
 * Helper function to create a map of eligible accounts.
 */
function createEligibleMap(accounts: PublicKey[]) {
  // predefined MerkleMap of eligible accounts
  const eligible = new MerkleMap();

  // for every eligible account, we store 1 = TRUE in the map
  accounts.forEach((account) => eligible.insert(key(account), 1n));

  return eligible;
}

/**
 * How to map an address to a map key.
 */
function key(address: PublicKey) {
  return Poseidon.hash(address.toFields());
}

/**
 * Mock for fetching the (partial) Merkle Map from a service endpoint.
 */
async function fetchEligibleMap() {
  return eligible.clone();
}

// test below

let [alice, bob, charlie, dan] = accounts;
let eve = Mina.TestPublicKey.random();

let newEligible = eligible;
setDebugContext(true);

await testLocal(
  Airdrop,
  { proofsEnabled: true, batchReducer },
  ({ contract, accounts: { sender }, Local }) => [
    // preparation: sender funds the contract with 10M MINA
    transaction('fund contract', async () => {
      AccountUpdate.createSigned(sender).send({
        to: contract.address,
        amount: 10_000_000n,
      });
    }),

    // preparation: create alice, bob, and charlie accounts
    transaction('create accounts', async () => {
      AccountUpdate.fundNewAccount(sender, 5);

      for (let address of [alice, bob, charlie, dan, eve]) {
        AccountUpdate.create(address);
      }
    }),

    // first 4 accounts claim
    () => Local.setProofsEnabled(false),
    transaction.from(alice)('alice claims', () => contract.claim(alice)),
    transaction.from(bob)('bob claims', () => contract.claim(bob)),
    transaction.from(eve)('eve claims', () => contract.claim(eve)),
    transaction.from(charlie)('charlie claims', () => contract.claim(charlie)),
    () => Local.setProofsEnabled(true),

    // settle claims, 1
    async () => {
      console.time('batch proof 1');
      let proof = await batchReducer.proveNextBatch();
      console.timeEnd('batch proof 1');

      return transaction('settle claims 1', async () => {
        newEligible = await contract.settleClaims(proof);
      });
    },
    () => eligible.overwrite(newEligible),

    expectBalance(alice, AMOUNT),
    expectBalance(bob, AMOUNT),
    expectBalance(eve, 0n), // because eve was not eligible
    expectBalance(charlie, 0n), // because we only processed 3 claims
    expectBalance(dan, 0n), // didn't claim yet

    transaction.from(dan)('danny claims', async () => contract.claim(dan)),

    // settle claims, 2
    async () => {
      console.time('batch proof 2');
      let proof = await batchReducer.proveNextBatch();
      console.timeEnd('batch proof 2');

      return transaction('settle claims 2', async () => {
        newEligible = await contract.settleClaims(proof);
      });
    },
    () => eligible.overwrite(newEligible),

    expectBalance(alice, AMOUNT),
    expectBalance(bob, AMOUNT),
    expectBalance(eve, 0n),
    expectBalance(charlie, AMOUNT),
    expectBalance(dan, AMOUNT),
  ]
);
