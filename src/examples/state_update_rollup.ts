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

  stateUpdate = SmartContract.stateUpdate({
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

  @method incrementCounter(y: Field) {
    this.stateUpdate.emit(y);
    SmartContract.runOutsideCircuit(() => {
      recentStateUpdates.updates.push([y.toConstant()]);
    });
  }

  @method rollupStateUpdate() {
    let { state, stateHash } = this.stateUpdate.applyUpdates(
      recentStateUpdates.state,
      recentStateUpdates.stateHash,
      recentStateUpdates.updates
    );
    SmartContract.runOutsideCircuit(() => {
      recentStateUpdates = {
        state: { counter: state.counter.toConstant() },
        stateHash: stateHash.toConstant(),
        updates: [],
      };
    });
    this.counter.set(state.counter);
  }
}

const doProofs = true;

// this is a data structure where we keep track of the current state, and update events since the last state change
// TODO: get these from a Mina node / the local blockchain
const initialCounter = Field.zero;
let recentStateUpdates = {
  state: { counter: initialCounter },
  stateHash: SmartContract.stateUpdate.initialStateHash,
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
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter(Field(3));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('update 2');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter(Field(2));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log(
  'state (on-chain; should be initial state): ' + zkapp.counter.get()
);

console.log('rollup transaction');
tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupStateUpdate();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
tx.send();

console.log('state (on-chain): ' + zkapp.counter.get());
console.log('state (internal): ' + recentStateUpdates.state.counter);
