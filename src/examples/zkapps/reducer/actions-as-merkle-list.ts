/**
 * This example shows how to iterate through incoming actions, not using `Reducer.reduce` but by
 * treating the actions as a merkle list.
 *
 * This is mainly intended as an example for using `MerkleList`, but it might also be useful as
 * a blueprint for processing actions in a custom and more explicit way.
 */
import {
  AccountUpdate,
  Bool,
  Field,
  MerkleList,
  Mina,
  Provable,
  PublicKey,
  Reducer,
  SmartContract,
  method,
  assert,
} from 'o1js';

const { Actions } = AccountUpdate;

// in this example, an action is just a public key
type Action = PublicKey;
const Action = PublicKey;

// the actions within one account update are a Merkle list with a custom hash
const emptyHash = Actions.empty().hash;
const nextHash = (hash: Field, action: Action) =>
  Actions.pushEvent({ hash, data: [] }, action.toFields()).hash;

class MerkleActions extends MerkleList.create(Action, nextHash, emptyHash) {}

// the "action state" / actions from many account updates is a Merkle list
// of the above Merkle list, with another custom hash
let emptyActionsHash = Actions.emptyActionState();
const nextActionsHash = (hash: Field, actions: MerkleActions) =>
  Actions.updateSequenceState(hash, actions.hash);

class MerkleActionss extends MerkleList.create(
  MerkleActions.provable,
  nextActionsHash,
  emptyActionsHash
) {}

// constants for our static-sized provable code
const MAX_UPDATES_WITH_ACTIONS = 100;
const MAX_ACTIONS_PER_UPDATE = 2;

/**
 * This contract allows you to push either 1 or 2 public keys as actions,
 * and has a reducer-like method which checks whether a given public key is contained in those actions.
 */
class ActionsContract extends SmartContract {
  reducer = Reducer({ actionType: Action });

  @method
  async postAddress(address: PublicKey) {
    this.reducer.dispatch(address);
  }

  // to exhibit the generality of reducer: can dispatch more than 1 action per account update
  @method async postTwoAddresses(a1: PublicKey, a2: PublicKey) {
    this.reducer.dispatch(a1);
    this.reducer.dispatch(a2);
  }

  @method
  async assertContainsAddress(address: PublicKey) {
    // get actions and, in a witness block, wrap them in a Merkle list of lists

    // note: need to reverse here because `getActions()` returns the last pushed action last,
    // but MerkleList.from() wants it to be first to match the natural iteration order
    let actionss = this.reducer.getActions().reverse();

    let merkleActionss = Provable.witness(MerkleActionss.provable, () =>
      MerkleActionss.from(actionss.map((as) => MerkleActions.from(as)))
    );

    // prove that we know the correct action state
    this.account.actionState.requireEquals(merkleActionss.hash);

    // now our provable code to process the actions is very straight-forward
    // (note: if we're past the actual sizes, `.pop()` returns a dummy Action -- in this case, the "empty" public key which is not equal to any real address)
    let hasAddress = Bool(false);

    let iter = merkleActionss.startIterating();

    for (let i = 0; i < MAX_UPDATES_WITH_ACTIONS; i++) {
      let merkleActions = iter.next();
      let innerIter = merkleActions.startIterating();
      for (let j = 0; j < MAX_ACTIONS_PER_UPDATE; j++) {
        let action = innerIter.next();
        hasAddress = hasAddress.or(action.equals(address));
      }
    }

    assert(hasAddress);
  }
}

// TESTS

// set up a local blockchain

let Local = Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

let [
  { publicKey: sender, privateKey: senderKey },
  { publicKey: zkappAddress, privateKey: zkappKey },
  { publicKey: otherAddress },
  { publicKey: anotherAddress },
] = Local.testAccounts;

let zkapp = new ActionsContract(zkappAddress);

// deploy the contract

await ActionsContract.compile();
console.log(
  `rows for ${MAX_UPDATES_WITH_ACTIONS} updates with actions`,
  (await ActionsContract.analyzeMethods()).assertContainsAddress.rows
);
let deployTx = await Mina.transaction(sender, async () => zkapp.deploy());
await deployTx.sign([senderKey, zkappKey]).send();

// push some actions

let dispatchTx = await Mina.transaction(sender, async () => {
  await zkapp.postAddress(otherAddress);
  await zkapp.postAddress(zkappAddress);
  await zkapp.postTwoAddresses(anotherAddress, sender);
  await zkapp.postAddress(anotherAddress);
  await zkapp.postTwoAddresses(zkappAddress, otherAddress);
});
await dispatchTx.prove();
await dispatchTx.sign([senderKey]).send();

assert(zkapp.reducer.getActions().length === 5);

// check if the actions contain the `sender` address

Local.setProofsEnabled(true);
let containsTx = await Mina.transaction(sender, () =>
  zkapp.assertContainsAddress(sender)
);
await containsTx.prove();
await containsTx.sign([senderKey]).send();
