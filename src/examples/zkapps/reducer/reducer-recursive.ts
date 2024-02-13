import { Field, method, SmartContract, Reducer } from 'o1js';

const INCREMENT = Field(1);

class CounterZkapp extends SmartContract {
  reducer = Reducer({ actionType: Field });

  @method rollupIncrements() {
    let actionState = Field(0);

    let pendingActions = this.reducer.getActions({
      fromActionState: actionState,
    });

    let { state: newCounter, actionState: newActionState } =
      this.reducer.reduce(
        pendingActions,
        Field,
        (state: Field, _action: Field) => {
          return state.add(1);
        },
        { state: Field(0), actionState },
        { useRecursion: true }
      );
  }
}
