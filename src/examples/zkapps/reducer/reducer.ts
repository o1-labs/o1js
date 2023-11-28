import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  isReady,
  Permissions,
  Reducer,
} from 'o1js';

await isReady;

const INCREMENT = Field(1);

class CounterZkapp extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Reducer({ actionType: Field });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionState = State<Field>();

  @method incrementCounter() {
    this.reducer.dispatch(INCREMENT);
  }

  @method rollupIncrements() {
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
        (state: Field, _action: Field) => {
          return state.add(1);
        },
        { state: counter, actionState }
      );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionState.set(newActionState);
  }
}

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
} else {
  // TODO: if we don't do this, then `analyzeMethods()` will be called during `runUnchecked()` in the tx callback below,
  // which currently fails due to `finalize_is_running` in snarky not resetting internal state, and instead setting is_running unconditionally to false,
  // so we can't nest different snarky circuit runners
  CounterZkapp.analyzeMethods();
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  zkapp.deploy();
  zkapp.counter.set(initialCounter);
  zkapp.actionState.set(Reducer.initialActionState);
});
await tx.sign([feePayerKey, zkappKey]).send();

console.log('applying actions..');

console.log('action 1');

tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('action 2');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('action 3');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('rolling up pending actions..');

console.log('state before: ' + zkapp.counter.get());

tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupIncrements();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('state after rollup: ' + zkapp.counter.get());

console.log('applying more actions');

console.log('action 4');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('action 5');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('rolling up pending actions..');

console.log('state before: ' + zkapp.counter.get());

tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupIncrements();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('state after rollup: ' + zkapp.counter.get());
