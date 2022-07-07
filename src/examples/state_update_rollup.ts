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
class StateUpdateZkapp extends SmartContract {
  // the "stateUpdate" field describes a state and how it can be updated
  // (the state doesn't have to be related to on-chain state. here it is, though)
  stateUpdate = SmartContract.StateUpdate({
    // type for the state
    state: circuitValue<{ counter: Field }>({ counter: Field }),
    // type for the update
    update: Field,
    // function that says how to apply an update
    apply(state: { counter: Field }, update: Field) {
      state.counter = state.counter.add(update);
      return state;
    },
  });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of updates
  @state(Field) counter = State<Field>();
  // helper field to store the point in the update history that our on-chain state is at
  @state(Field) stateHash = State<Field>();

  // emits an update
  @method incrementCounter(increment: Field) {
    this.stateUpdate.emit(increment);
  }

  @method rollupStateUpdate() {
    // get previous state and assert that it's the same as on-chain state
    let counter = this.counter.get();
    let oldStateHash = this.stateHash.get();
    this.account.balance.get();
    this.account.balance.assertNothing();
    this.counter.assertEquals(counter);
    this.stateHash.assertEquals(oldStateHash);
    // compute the new state and hash from pending updates
    // remark: it's not feasible to pass in the pending updates as method arguments, because they have dynamic size
    let { state, stateHash } = this.stateUpdate.applyUpdates({
      state: { counter },
      stateHash: oldStateHash,
      updates: pendingUpdates,
    });
    // update on-chain state
    this.counter.set(state.counter);
    this.stateHash.set(stateHash);
  }
}

const doProofs = true;
const initialCounter = Field.zero;

// this is a data structure where we internally keep track of the pending updates
// TODO: get these from a Mina node / the local blockchain
// note: each entry in pendingUpdates is itself an array -- the list of updates emitted by one method
// this is the structure we need to do the hashing correctly
let pendingUpdates: Field[][] = [];

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.random();
let zkappAddress = zkappKey.toPublicKey();

let zkapp = new StateUpdateZkapp(zkappAddress);
if (doProofs) {
  console.log('compile');
  await StateUpdateZkapp.compile(zkappAddress);
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
  zkapp.stateHash.set(SmartContract.StateUpdate.initialStateHash);
});
tx.send();

console.log('update 1');
let increment = Field(3);
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter(increment);
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
pendingUpdates.push([increment]);

console.log('update 2');
increment = Field(2);
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter(increment);
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
pendingUpdates.push([increment]);

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('pending updates:', JSON.stringify(pendingUpdates));

console.log('rollup transaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupStateUpdate();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// reset pending updates
pendingUpdates = [];

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('pending updates:', JSON.stringify(pendingUpdates));
