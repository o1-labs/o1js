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
} from 'snarkyjs';

await isReady;

const INCREMENT = Field.one;

class CounterZkapp extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Experimental.Reducer({ actionType: Field });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionsHash = State<Field>();

  @method incrementCounter() {
    this.reducer.dispatch(INCREMENT);
  }

  @method rollupIncrements() {
    // get previous counter & actions hash, assert that they're the same as on-chain values
    let counter = this.counter.get();
    this.counter.assertEquals(counter);
    let actionsHash = this.actionsHash.get();
    this.actionsHash.assertEquals(actionsHash);

    // compute the new counter and hash from pending actions
    // remark: it's not feasible to pass in the pending actions as method arguments, because they have dynamic size
    let { state: newCounter, actionsHash: newActionsHash } =
      this.reducer.reduce(
        pendingActions,
        // state type
        Field,
        // function that says how to apply an action
        (state: Field, _action: Field) => {
          return state.add(1);
        },
        { state: counter, actionsHash }
      );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionsHash.set(newActionsHash);
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

console.log('action 1');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
pendingActions.push([INCREMENT]);

console.log('action 2');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
pendingActions.push([INCREMENT]);

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('pending actions:', JSON.stringify(pendingActions));

console.log('rollup transaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupIncrements();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// reset pending actions
pendingActions = [];

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('pending actions:', JSON.stringify(pendingActions));
