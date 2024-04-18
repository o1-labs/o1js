/**
 * This example shows how to iterate through incoming actions, not using `Reducer.reduce` but by
 * treating the actions as a merkle list and using the built in `Iterator`.
 *
 * This is mainly intended as an example for using `Iterator` and `MerkleList`, but it might also be useful as
 * a blueprint for processing actions in a custom and more explicit way.
 */
import {
  AccountUpdate,
  Bool,
  Field,
  MerkleList,
  Mina,
  Provable,
  State,
  state,
  Reducer,
  SmartContract,
  method,
  assert,
} from 'o1js';

const { Actions } = AccountUpdate;

// in this example, an action is just a increment of type Field
// the actions within one account update are a Merkle list with a custom hash
const emptyHash = Actions.empty().hash;
const nextHash = (hash: Field, action: Field) =>
  Actions.pushEvent({ hash, data: [] }, action.toFields()).hash;

class MerkleActions extends MerkleList.create(Field, nextHash, emptyHash) {}

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
 * This contract allows you to push custom increments
 * and has a reducer-like method which accumulates all increments
 */
class ActionsContract extends SmartContract {
  reducer = Reducer({ actionType: Field });

  @state(Field) counter = State<Field>();

  @method
  async increment(inc: Field) {
    this.reducer.dispatch(inc);
  }

  @method
  async accumulate() {
    // get actions and, in a witness block, wrap them in a Merkle list of lists

    // get all actions
    let actionss = this.reducer.getActions();

    let merkleActionss = Provable.witness(MerkleActionss.provable, () =>
      MerkleActionss.from(actionss.map((as) => MerkleActions.from(as)))
    );

    // prove that we know the correct action state
    this.account.actionState.requireEquals(merkleActionss.hash);

    let counter = Field(0);

    let iter = merkleActionss.startIterating();

    for (let i = 0; i < MAX_UPDATES_WITH_ACTIONS; i++) {
      let merkleActions = iter.next();
      let innerIter = merkleActions.startIterating();
      for (let j = 0; j < MAX_ACTIONS_PER_UPDATE; j++) {
        let action = innerIter.next();
        counter = counter.add(action);
      }
    }

    this.counter.set(this.counter.getAndRequireEquals().add(counter));
  }
}

// TESTS

// set up a local blockchain

let Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

let [sender, zkappAddress] = Local.testAccounts;

let zkapp = new ActionsContract(zkappAddress);

// deploy the contract

await ActionsContract.compile();
console.log(
  `rows for ${MAX_UPDATES_WITH_ACTIONS} updates with actions`,
  (await ActionsContract.analyzeMethods()).accumulate.rows
);
let deployTx = await Mina.transaction(sender, async () => zkapp.deploy());
await deployTx.sign([sender.key, zkappAddress.key]).send();

// push some actions

let dispatchTx = await Mina.transaction(sender, async () => {
  await zkapp.increment(Field(1));
  await zkapp.increment(Field(3));
  await zkapp.increment(Field(1));
  await zkapp.increment(Field(9));
  await zkapp.increment(Field(18));
});
await dispatchTx.prove();
await dispatchTx.sign([sender.key]).send();

assert(zkapp.reducer.getActions().length === 5);

// accumulate actions

Local.setProofsEnabled(true);
let accTx = await Mina.transaction(sender, () => zkapp.accumulate());
await accTx.prove();
await accTx.sign([sender.key]).send();

assert(zkapp.counter.get().toBigInt() === 32n);
