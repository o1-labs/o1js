import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  Party,
  isReady,
  Permissions,
  circuitValue,
} from 'snarkyjs';

await isReady;

// version of the "simple zkapp" which accepts concurrent updates
class ReducerZkapp extends SmartContract {
  // the "reducer" field describes a state and how it can be updated
  // (the state doesn't have to be related to on-chain state. here it is, though)
  reducer = SmartContract.Reducer({
    // type for the state
    state: circuitValue<{ counter: Field }>({ counter: Field }),
    // type for the action
    actionType: Field,
    // function that says how to apply an action
    apply(state: { counter: Field }, action: Field) {
      state.counter = state.counter.add(action);
      return state;
    },
  });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionsHash = State<Field>();

  // dispatches an action
  @method incrementCounter(increment: Field) {
    this.reducer.dispatch(increment);
  }

  @method rollupActions() {
    // get previous state and assert that it's the same as on-chain state
    let counter = this.counter.get();
    let oldActionsHash = this.actionsHash.get();
    this.counter.assertEquals(counter);
    this.actionsHash.assertEquals(oldActionsHash);
    // compute the new state and hash from pending actions
    // remark: it's not feasible to pass in the pending actions as method arguments, because they have dynamic size
    let { state, actionsHash } = this.reducer.reduce({
      state: { counter },
      actionsHash: oldActionsHash,
      actions: pendingActions,
    });
    // update on-chain state
    this.counter.set(state.counter);
    this.actionsHash.set(actionsHash);
  }
}

const doProofs = false;
const initialCounter = Field.zero;

// this is a data structure where we internally keep track of the pending actions
// TODO: get these from a Mina node / the local blockchain
// note: each entry in pendingActions is itself an array -- the list of actions dispatched by one method
// this is the structure we need to do the hashing correctly
let pendingActions: Field[][] = [];

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let zkapp = new ReducerZkapp(zkappAddress);
if (doProofs) {
  console.log('compile');
  await ReducerZkapp.compile(zkappAddress);
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
  zkapp.actionsHash.set(SmartContract.Reducer.initialActionsHash);
});
tx.send();

console.log('action 1');
let increment = Field(3);
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter(increment);
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
pendingActions.push([increment]);

console.log('action 2');
increment = Field(2);
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter(increment);
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
pendingActions.push([increment]);

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('pending actions:', JSON.stringify(pendingActions));

console.log('rollup transaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupActions();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// reset pending actions
pendingActions = [];

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('pending actions:', JSON.stringify(pendingActions));
