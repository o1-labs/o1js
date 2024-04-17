import {
  Field,
  state,
  State,
  method,
  SmartContract,
  Bool,
  Struct,
  Reducer,
  Provable,
  PrivateKey,
} from 'o1js';

const maxTransactionsWithActions = Number(process.argv[3] ?? 0) || 1;

class MaybeIncrement extends Struct({ isIncrement: Bool, otherData: Field }) {}

class Counter extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Reducer({ actionType: MaybeIncrement });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionState = State<Field>();

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
        { state: counter, actionState },
        { maxTransactionsWithActions }
      );

    // update on-chain state
    this.counter.set(newCounter);
    this.actionState.set(newActionState);
  }
}

let contract = new Counter(PrivateKey.randomKeypair().publicKey);

let cs = await Provable.constraintSystem(() => {
  // get previous counter & actions hash, assert that they're the same as on-chain values
  let counter = contract.counter.get();
  let actionState = contract.actionState.get();

  // compute the new counter and hash from pending actions
  let pendingActions = contract.reducer.getActions({
    fromActionState: actionState,
  });

  contract.reducer.reduce(
    pendingActions,
    // state type
    Field,
    // function that says how to apply an action
    (state: Field, action: MaybeIncrement) => {
      return Provable.if(action.isIncrement, state.add(1), state);
    },
    { state: counter, actionState },
    { maxTransactionsWithActions }
  );
});

console.log(cs.print());
await Counter.analyzeMethods({ printSummary: true });
console.log(cs.summary());
