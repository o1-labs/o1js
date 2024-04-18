import { match } from 'o1js';
import {
  Field,
  method,
  Reducer,
  SmartContract,
  State,
  state,
  Struct,
  UInt64,
} from 'o1js';

class Increment extends Struct({
  increment: UInt64,
}) {}

class Decrement extends Struct({
  decrement: UInt64,
}) {}

// TODO: represent this for runtime
type Action = typeof Increment | typeof Decrement;

export class FungibleTokenBase extends SmartContract {
  // TODO: ...
  reducer = Reducer({ actionType: null! as Action });

  @state(Field)
  actionState = State<Field>();

  @state(UInt64)
  state = State<UInt64>();

  @method
  async increment() {
    this.reducer.dispatch(new Increment({ increment: new UInt64(1) }));
  }

  @method
  async decrement() {
    this.reducer.dispatch(new Decrement({ decrement: new UInt64(1) }));
  }

  @method
  async rollup() {
    const actionState = this.actionState.getAndRequireEquals();
    const pending = this.reducer.getActions({ fromActionState: actionState });
    const reduced = this.reducer.reduce(
      pending,
      UInt64,
      (state, action) =>
        match(action, (_) =>
          _.whenInstance(Increment, (value) => {
            return state.add(value.increment);
          }).whenInstance(Decrement, (value) => {
            return state.add(value.decrement);
          })
        ),
      {
        state: this.state.getAndRequireEquals(),
        actionState,
      }
    );
    this.state.set(reduced.state);
  }
}
