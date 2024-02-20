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

  @state(Field) actionState = State<Field>();

  @method incrementCounter() {
    this.reducer.dispatch(INCREMENT);
  }

  @method rollupIncrements() {
    let ac = this.actionState.get();
    this.actionState.requireEquals(ac);

    // compute the new counter and hash from pending actions
    let pendingActions = this.reducer.getActions({
      fromActionState: ac,
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
        { state: Field(0), actionState: Field(0) },
        { useRecursion: true }
      );
    this.actionState.set(newActionState);
  }
}

let Local = Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let feePayerKey = Local.testAccounts[0].privateKey;
let feePayer = Local.testAccounts[0].publicKey;

let zkappKey = PrivateKey.fromBase58(
  'EKEQc95PPQZnMY9d9p1vq1MWLeDJKtvKj4V75UDG3rjnf32BerWD'
);
let zkappAddress = zkappKey.toPublicKey();
let zkapp = new CounterZkapp(zkappAddress);

await CounterZkapp.compile();

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  zkapp.deploy();
  zkapp.actionState.set(Reducer.initialActionState);
});
await tx.sign([feePayerKey, zkappKey]).send();

console.log('action 1');
tx = await Mina.transaction(feePayer, () => {
  zkapp.incrementCounter();
});
await tx.prove();
await tx.sign([feePayerKey]).send();

console.log('rolling up pending actions..');

tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupIncrements();
});
await tx.prove();
await tx.sign([feePayerKey]).send();
