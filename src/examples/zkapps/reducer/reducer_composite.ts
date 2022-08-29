import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Experimental,
  Mina,
  Party,
  isReady,
  Permissions,
  circuitValue,
  Bool,
  Circuit,
} from 'snarkyjs';
import assert from 'node:assert/strict';

await isReady;

type MaybeIncrement = { isIncrement: Bool; otherData: Field };
const MaybeIncrement = circuitValue<MaybeIncrement>({
  isIncrement: Bool,
  otherData: Field,
});
const INCREMENT = { isIncrement: Bool(true), otherData: Field.zero };

class CounterZkapp extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Experimental.Reducer({ actionType: MaybeIncrement });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionsHash = State<Field>();

  @method incrementCounter() {
    this.reducer.dispatch(INCREMENT);
  }
  @method dispatchData(data: Field) {
    this.reducer.dispatch({ isIncrement: Bool(false), otherData: data });
  }

  @method rollupIncrements() {
    // get previous counter & actions hash, assert that they're the same as on-chain values
    let counter = this.counter.get();
    this.counter.assertEquals(counter);
    let actionsHash = this.actionsHash.get();
    this.actionsHash.assertEquals(actionsHash);

    // compute the new counter and hash from pending actions
    let pendingActions = this.reducer.getActions({
      fromActionHash: actionsHash,
    });

    let { state: newCounter, actionsHash: newActionsHash } =
      this.reducer.reduce(
        pendingActions,
        // state type
        Field,
        // function that says how to apply an action
        (state: Field, action: MaybeIncrement) => {
          return Circuit.if(action.isIncrement, state.add(1), state);
        },
        { state: counter, actionsHash }
      );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionsHash.set(newActionsHash);
  }
}

const doProofs = true;
const initialCounter = Field.zero;

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.fromBase58(
  'EKEQc95PPQZnMY9d9p1vq1MWLeDJKtvKj4V75UDG3rjnf32BerWD'
);
let zkappAddress = zkappKey.toPublicKey();
let zkapp = new CounterZkapp(zkappAddress);
if (doProofs) {
  console.log('compile');
  await CounterZkapp.compile(zkappAddress);
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  Party.fundNewAccount(feePayer);
  zkapp.deploy({ zkappKey });
  if (!doProofs) {
    zkapp.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
  }
  zkapp.counter.set(initialCounter);
  zkapp.actionsHash.set(Experimental.Reducer.initialActionsHash);
});
tx.send();

console.log('applying actions..');

console.log('action 1');

tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('action 2');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('action 3');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('rolling up pending actions..');

console.log('state before: ' + zkapp.counter.get());

tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupIncrements();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('state after rollup: ' + zkapp.counter.get());
assert.deepEqual(zkapp.counter.get().toString(), '3');

console.log('applying more actions');

console.log('action 4 (no increment)');
tx = await Mina.transaction(feePayer, () => {
  zkapp.dispatchData(Field.random());
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('action 5');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('rolling up pending actions..');

console.log('state before: ' + zkapp.counter.get());

tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupIncrements();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('state after rollup: ' + zkapp.counter.get());
assert.equal(zkapp.counter.get().toString(), '4');
