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

class Action extends Struct({
  isIncrement: Bool,
  data: Field,
}) {
  static increment(count: number) {
    return new this({
      isIncrement: Bool(true),
      data: Field(count),
    });
  }

  static other(data: Field) {
    return new this({
      isIncrement: Bool(false),
      data,
    });
  }
}

class CounterState extends Struct({
  count: Field,
  rollup: Field, // helper field to store the point in the action history that our on-chain state is at
}) {
  static initial = new this({
    count: Field(0),
    rollup: Reducer.initialActionState,
  });
}

class Counter extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Reducer({ actionType: Action });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(CounterState) state = State<CounterState>();

  @method async increment() {
    this.reducer.dispatch(Action.increment(1));
  }

  @method async other(data: Field) {
    this.reducer.dispatch(Action.other(data));
  }

  @method async rollup() {
    // get previous counter & actions hash, assert that they're the same as on-chain values
    const state = this.state.getAndRequireEquals();

    // compute the new counter and hash from pending actions
    const pending = this.reducer.getActions({
      fromActionState: state.rollup,
    });

    const reduced = this.reducer.reduce(
      // state type
      pending,
      // the accumulator type
      CounterState,
      // function that says how to apply an action
      (state, action) => {
        const count = Provable.if(
          action.isIncrement,
          state.count.add(1),
          state.count
        );
        return new CounterState({ ...state, count });
      },
      { state, actionState: state.rollup }
    );

    // update on-chain state
    this.state.set(reduced.state);
  }
}

const ReducerProfiler = getProfiler('Reducer zkApp');
ReducerProfiler.start('Reducer zkApp test flow');
const doProofs = true;

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

console.log('deploy');
await Mina.transaction(feePayer, async () => {
  AccountUpdate.fundNewAccount(feePayer);
  await contract.deploy();
  contract.state.set(CounterState.initial);
})
  .sign([feePayer.key, contractAccount.key])
  .prove()
  .send();

console.log('applying actions..');

console.log('action 1');
await increment();

console.log('action 2');
await increment();

console.log('action 3');
await increment();

console.log('count before: ' + contract.state.get().count);

console.log('rolling up pending actions..');
await rollup();

console.log('state after rollup:', contract.state.get().count);
assert.deepEqual(contract.state.get().count.toString(), '3');

console.log('applying more actions');

console.log('action 4 (no increment)');
await Mina.transaction(feePayer, async () => {
  await contract.other(Field.random());
})
  .prove()
  .sign([feePayer.key])
  .send();

console.log('action 5');
await increment();

console.log('rolling up pending actions..');

console.log('state before: ' + contract.state.get().count);

await rollup();

console.log('state after rollup: ' + contract.state.get().count);
assert.equal(contract.state.get().count.toString(), '4');
ReducerProfiler.stop().store();

//

function increment() {
  return Mina.transaction(feePayer, async () => {
    await contract.increment();
  })
    .prove()
    .sign([feePayer.key])
    .send();
}

function rollup() {
  return Mina.transaction(feePayer, async () => {
    await contract.rollup();
  })
    .prove()
    .sign([feePayer.key])
    .send();
}
