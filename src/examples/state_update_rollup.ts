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
  DeployArgs,
  circuitValue,
} from 'snarkyjs';

await isReady;

// version of the "simple zkapp" which accepts concurrent updates
class StateUpdateZkapp extends SmartContract {
  @state(Field) counter = State<Field>();

  stateUpdate = SmartContract.StateUpdate({
    state: circuitValue<{ counter: Field }>({ counter: Field }),
    update: Field,
    apply(state: { counter: Field }, update: Field) {
      state.counter = state.counter.add(update);
      return state;
    },
  });

  deploy(args: DeployArgs) {
    super.deploy(args);
    if (!doProofs) {
      this.setPermissions({
        ...Permissions.default(),
        editState: Permissions.proofOrSignature(),
        editSequenceState: Permissions.proofOrSignature(),
      });
    }
    this.counter.set(initialCounter);
  }

  @method incrementCounter(increment: Field) {
    this.stateUpdate.emit(increment);
  }

  @method rollupStateUpdate() {
    // remark: it's not feasible to pass in the pending updates as method arguments, because they don't have static size
    let { state, stateHash } = this.stateUpdate.applyUpdates(
      stateAndPendingUpdates
    );
    this.counter.set(state.counter);
    // return the new stateAndPendingUpdates
    return { state, stateHash, updates: [] };
  }
}

const doProofs = true;
const initialCounter = Field.zero;

// this is a data structure where we internally keep track of the current state, state hash and pending updates
// TODO: get these from a Mina node / the local blockchain
let stateAndPendingUpdates = {
  state: { counter: initialCounter },
  stateHash: SmartContract.StateUpdate.initialStateHash,
  updates: [] as Field[][],
};

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
stateAndPendingUpdates.updates.push([increment]);

console.log('update 2');
increment = Field(2);
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter(increment);
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
stateAndPendingUpdates.updates.push([increment]);

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('state (internal): ' + stateAndPendingUpdates.state.counter);
console.log(
  'pending updates (internal):',
  JSON.stringify(stateAndPendingUpdates.updates)
);

console.log('rollup transaction');
let newStateAndUpdates: typeof stateAndPendingUpdates;
tx = await Mina.transaction(feePayer, () => {
  newStateAndUpdates = zkapp.rollupStateUpdate();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();
// update internal state
stateAndPendingUpdates = newStateAndUpdates!;

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('state (internal): ' + stateAndPendingUpdates.state.counter);
console.log(
  'pending updates (internal):',
  JSON.stringify(stateAndPendingUpdates.updates)
);
