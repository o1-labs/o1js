/**
 * This example shows how to iterate through incoming actions, not using `Reducer.reduce` but by
 * treating the actions as a merkle list and using the built in `Iterator`.
 *
 * This is mainly intended as an example for using `Iterator` and `MerkleList`, but it might also be useful as
 * a blueprint for processing actions in a custom and more explicit way.
 *
 * Warning: The reducer API in o1js is currently not safe to use in production applications. The `reduce()`
 * method breaks if more than the hard-coded number (default: 32) of actions are pending. Work is actively
 * in progress to mitigate this limitation.
 */
import { Field, Mina, State, state, Reducer, SmartContract, method, assert } from 'o1js';

export { ActionsContract, testLocal };

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
  async twoIncrements(inc1: Field, inc2: Field) {
    this.reducer.dispatch(inc1);
    this.reducer.dispatch(inc2);
  }

  @method
  async accumulate() {
    // get actions and, in a witness block, wrap them in a Merkle list of lists

    // get all actions
    let actions = this.reducer.getActions();

    // prove that we know the correct action state
    this.account.actionState.requireEquals(actions.hash);

    let counter = Field(0);

    let iter = actions.startIterating();
    let lastAction = Field(0);

    for (let i = 0; i < MAX_UPDATES_WITH_ACTIONS; i++) {
      let merkleActions = iter.next();
      let innerIter = merkleActions.startIterating();
      for (let j = 0; j < MAX_ACTIONS_PER_UPDATE; j++) {
        let action = innerIter.next();
        counter = counter.add(action);

        // we require that every action is greater than the previous one, except for dummy (0) actions
        // this checks that actions are applied in the right order
        assert(action.equals(0).or(action.greaterThan(lastAction)));
        lastAction = action;
      }
      innerIter.assertAtEnd();
    }
    iter.assertAtEnd();

    this.counter.set(this.counter.getAndRequireEquals().add(counter));
  }
}

// TESTS

async function testLocal() {
  // set up a local blockchain

  let Local = await Mina.LocalBlockchain({ proofsEnabled: true });
  Mina.setActiveInstance(Local);

  let [sender, contractAddress] = Local.testAccounts.slice(4);

  let contract = new ActionsContract(contractAddress);

  // deploy the contract

  await ActionsContract.compile();
  console.log(
    `rows for ${MAX_UPDATES_WITH_ACTIONS} updates with actions`,
    (await ActionsContract.analyzeMethods()).accumulate.rows
  );
  let deployTx = await Mina.transaction(sender, async () => contract.deploy());
  await deployTx.sign([sender.key, contractAddress.key]).send();

  // push some actions

  let dispatchTx = await Mina.transaction(sender, async () => {
    await contract.increment(Field(1));
    await contract.increment(Field(3));
    await contract.increment(Field(5));
    await contract.increment(Field(9));
    await contract.twoIncrements(Field(18), Field(19));
  });
  await dispatchTx.prove();
  await dispatchTx.sign([sender.key]).send();

  assert(contract.reducer.getActions().data.get().length === 5);

  // accumulate actions

  Local.setProofsEnabled(true);
  let accTx = await Mina.transaction(sender, () => contract.accumulate());
  await accTx.prove();
  await accTx.sign([sender.key]).send();

  assert(contract.counter.get().toBigInt() === 55n);
}
