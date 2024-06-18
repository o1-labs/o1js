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
} from '../../../index.js';
import {
  expectBalance,
  testLocal,
  transaction,
} from '../test/test-contract.js';
const { IndexedMerkleMap, BatchReducer } = Experimental;

const AMOUNT = 100_000n;

class MerkleMap extends IndexedMerkleMap(10) {}

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
  async claim() {
    let address = this.sender.getUnconstrained();

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
    // witness merkle map and require that it matches the onchain root
    let eligibleMap = Provable.witness(MerkleMap.provable, () =>
      eligible.clone()
    );
    this.eligibleRoot.requireEquals(eligibleMap.root);

    // process claims by reducing actions
    await batchReducer.processNextBatch(proof, (address, isDummy) => {
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
  }) => {
    // create a new map of accounts that are eligible for the airdrop
    // for every eligible account, we store 1 in the map, representing TRUE
    eligible.overwrite(new MerkleMap());

    // eve is not eligible, the others are
    [alice, bob, charlie, danny].forEach((address) =>
      eligible.insert(key(address), 1n)
    );
    let newEligible = eligible; // for tracking updates to the eligible map

    return [
      // preparation: sender funds the contract with 10M MINA
      transaction('fund contract', async () => {
        AccountUpdate.createSigned(sender).send({
          to: contract.address,
          amount: 10_000_000n,
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
        let proof = await batchReducer.proveNextBatch();
        console.timeEnd('batch proof 1');

        return transaction('settle claims 1', async () => {
          newEligible = await contract.settleClaims(proof);
        });
      },
      () => eligible.overwrite(newEligible), // update the eligible map

      expectBalance(alice, AMOUNT),
      expectBalance(bob, AMOUNT),
      expectBalance(eve, 0n), // eve was not eligible
      expectBalance(charlie, 0n), // we only processed 3 claims, charlie was the 4th
      expectBalance(danny, 0n), // danny didn't claim yet

      // another claim + final settling
      transaction.from(danny)('danny claims', () => contract.claim()),

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
      expectBalance(danny, AMOUNT),
    ];
  }
);
