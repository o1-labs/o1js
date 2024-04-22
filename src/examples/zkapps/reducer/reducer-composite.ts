import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  Bool,
  Struct,
  Reducer,
  Provable,
} from 'o1js';
import assert from 'node:assert/strict';
import { getProfiler } from '../../utils/profiler.js';

class MaybeIncrement extends Struct({
  isIncrement: Bool,
  otherData: Field,
}) {}
const INCREMENT = { isIncrement: Bool(true), otherData: Field(0) };

class Counter extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Reducer({ actionType: MaybeIncrement });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionState = State<Field>();

  @method async incrementCounter() {
    this.reducer.dispatch(INCREMENT);
  }
  @method async dispatchData(data: Field) {
    this.reducer.dispatch({ isIncrement: Bool(false), otherData: data });
  }

  @method async rollupIncrements() {
    // get previous counter & actions hash, assert that they're the same as on-chain values
    let counter = this.counter.getAndRequireEquals();
    let actionState = this.actionState.getAndRequireEquals();

    // compute the new counter and hash from pending actions
    let pendingActions = this.reducer.getActions({
      fromActionState: actionState,
    });

    let newCounter = this.reducer.reduce(
      pendingActions,
      // state type
      Field,
      // function that says how to apply an action
      (state: Field, action: MaybeIncrement) => {
        return Provable.if(action.isIncrement, state.add(1), state);
      },
      counter,
      { maxUpdatesWithActions: 10 }
    );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionState.set(pendingActions.hash);
  }
}

const ReducerProfiler = getProfiler('Reducer zkApp');
ReducerProfiler.start('Reducer zkApp test flow');
const doProofs = true;
const initialCounter = Field(0);

let Local = await Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);

let [feePayer] = Local.testAccounts;

// the contract account
let contractAccount = Mina.TestPublicKey(
  PrivateKey.fromBase58('EKEQc95PPQZnMY9d9p1vq1MWLeDJKtvKj4V75UDG3rjnf32BerWD')
);
let contract = new Counter(contractAccount);
if (doProofs) {
  console.log('compile');
  await Counter.compile();
}

console.log(
  'rows: ',
  (await Counter.analyzeMethods())['rollupIncrements'].rows
);

console.log('deploy');
let tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await contract.deploy();
  contract.counter.set(initialCounter);
  contract.actionState.set(Reducer.initialActionState);
});
await tx.sign([feePayer.key, contractAccount.key]).send();

console.log('applying actions..');

console.log('action 1');

tx = await Mina.transaction(feePayer, async () => {
  await contract.incrementCounter();
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('action 2');
tx = await Mina.transaction(feePayer, async () => {
  await contract.incrementCounter();
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('action 3');
tx = await Mina.transaction(feePayer, async () => {
  await contract.incrementCounter();
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('rolling up pending actions..');

console.log('state before: ' + contract.counter.get());

tx = await Mina.transaction(feePayer, async () => {
  await contract.rollupIncrements();
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('state after rollup: ' + contract.counter.get());
assert.deepEqual(contract.counter.get().toString(), '3');

console.log('applying more actions');

console.log('action 4 (no increment)');
tx = await Mina.transaction(feePayer, async () => {
  await contract.dispatchData(Field.random());
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('action 5');
tx = await Mina.transaction(feePayer, async () => {
  await contract.incrementCounter();
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('rolling up pending actions..');

console.log('state before: ' + contract.counter.get());

tx = await Mina.transaction(feePayer, async () => {
  await contract.rollupIncrements();
});
await tx.prove();
await tx.sign([feePayer.key]).send();

console.log('state after rollup: ' + contract.counter.get());
assert.equal(contract.counter.get().toString(), '4');
ReducerProfiler.stop().store();
