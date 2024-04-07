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

class CounterZkapp extends SmartContract {
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
    let counter = this.counter.get();
    this.counter.requireEquals(counter);
    let actionState = this.actionState.get();
    this.actionState.requireEquals(actionState);

    // compute the new counter and hash from pending actions
    let pendingActions = this.reducer.getActions({
      fromActionState: actionState,
    });

    let { state: newCounter, actionState: newActionState } =
      this.reducer.reduce(
        pendingActions,
        // state type
        Field,
        // function that says how to apply an action
        (state: Field, action: MaybeIncrement) => {
          return Provable.if(action.isIncrement, state.add(1), state);
        },
        { state: counter, actionState }
      );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionState.set(newActionState);
  }
}

const ReducerProfiler = getProfiler('Reducer zkApp');
ReducerProfiler.start('Reducer zkApp test flow');
const doProofs = true;
const initialCounter = Field(0);

let Local = Mina.LocalBlockchain({ proofsEnabled: doProofs });
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayerKey = Local.testAccounts[0].privateKey;
let feePayer = Local.testAccounts[0].publicKey;

// the zkapp account
let zkappKey = PrivateKey.fromBase58(
  'EKEQc95PPQZnMY9d9p1vq1MWLeDJKtvKj4V75UDG3rjnf32BerWD'
);
let zkappAddress = zkappKey.toPublicKey();
let zkapp = new CounterZkapp(zkappAddress);
if (doProofs) {
  console.log('compile');
  await CounterZkapp.compile();
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await zkapp.deploy();
  zkapp.counter.set(initialCounter);
  zkapp.actionState.set(Reducer.initialActionState);
});
await tx.sign([feePayerKey, zkappKey]).send();

console.log('applying actions..');

console.log('action 1');

tx = await Mina.transaction(feePayer, async () => {
  await zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('action 2');
tx = await Mina.transaction(feePayer, async () => {
  await zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('action 3');
tx = await Mina.transaction(feePayer, async () => {
  await zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('rolling up pending actions..');

console.log('state before: ' + zkapp.counter.get());

tx = await Mina.transaction(feePayer, async () => {
  await zkapp.rollupIncrements();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('state after rollup: ' + zkapp.counter.get());
assert.deepEqual(zkapp.counter.get().toString(), '3');

console.log('applying more actions');

console.log('action 4 (no increment)');
tx = await Mina.transaction(feePayer, async () => {
  await zkapp.dispatchData(Field.random());
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('action 5');
tx = await Mina.transaction(feePayer, async () => {
  await zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('rolling up pending actions..');

console.log('state before: ' + zkapp.counter.get());

tx = await Mina.transaction(feePayer, async () => {
  await zkapp.rollupIncrements();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('state after rollup: ' + zkapp.counter.get());
assert.equal(zkapp.counter.get().toString(), '4');
ReducerProfiler.stop().store();
