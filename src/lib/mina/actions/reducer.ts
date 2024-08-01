import { Field } from '../../provable/wrapped.js';
import { Actions } from '../account-update.js';
import {
  FlexibleProvablePure,
  InferProvable,
} from '../../provable/types/struct.js';
import { provable } from '../../provable/types/provable-derivers.js';
import { Provable } from '../../provable/provable.js';
import { ProvableHashable } from '../../provable/crypto/poseidon.js';
import * as Mina from '../mina.js';
import { ProvablePure } from '../../provable/types/provable-intf.js';
import { MerkleList } from '../../provable/merkle-list.js';
import type { SmartContract } from '../zkapp.js';

export { Reducer, getReducer };

const Reducer: (<
  T extends FlexibleProvablePure<any>,
  A extends InferProvable<T> = InferProvable<T>
>(reducer: {
  actionType: T;
}) => ReducerReturn<A>) & {
  initialActionState: Field;
} = Object.defineProperty(
  function (reducer: any) {
    // we lie about the return value here, and instead overwrite this.reducer with
    // a getter, so we can get access to `this` inside functions on this.reducer (see constructor)
    return reducer;
  },
  'initialActionState',
  { get: Actions.emptyActionState }
) as any;

type Reducer<Action> = {
  actionType: FlexibleProvablePure<Action>;
};

type ReducerReturn<Action> = {
  /**
   * Dispatches an {@link Action}. Similar to normal {@link Event}s,
   * {@link Action}s can be stored by archive nodes and later reduced within a {@link SmartContract} method
   * to change the state of the contract accordingly
   *
   * ```ts
   * this.reducer.dispatch(Field(1)); // emits one action
   * ```
   *
   * */
  dispatch(action: Action): void;
  /**
   * Reduces a list of {@link Action}s, similar to `Array.reduce()`.
   *
   * ```ts
   *  let pendingActions = this.reducer.getActions({
   *    fromActionState: actionState,
   *  });
   *
   *  let newState = this.reducer.reduce(
   *    pendingActions,
   *    Field, // the state type
   *    (state: Field, _action: Field) => {
   *      return state.add(1);
   *    },
   *    initialState // initial state
   * );
   * ```
   *
   * Warning: The reducer API in o1js is currently not safe to use in production applications. The `reduce()`
   * method breaks if more than the hard-coded number (default: 32) of actions are pending. Work is actively
   * in progress to mitigate this limitation.
   */
  reduce<State>(
    actions: MerkleList<MerkleList<Action>>,
    stateType: Provable<State>,
    reduce: (state: State, action: Action) => State,
    initial: State,
    options?: {
      maxUpdatesWithActions?: number;
      maxActionsPerUpdate?: number;
      skipActionStatePrecondition?: boolean;
    }
  ): State;
  /**
   * Perform circuit logic for every {@link Action} in the list.
   *
   * This is a wrapper around {@link reduce} for when you don't need `state`.
   */
  forEach(
    actions: MerkleList<MerkleList<Action>>,
    reduce: (action: Action) => void,
    options?: {
      maxUpdatesWithActions?: number;
      maxActionsPerUpdate?: number;
      skipActionStatePrecondition?: boolean;
    }
  ): void;
  /**
   * Fetches the list of previously emitted {@link Action}s by this {@link SmartContract}.
   * ```ts
   * let pendingActions = this.reducer.getActions({
   *    fromActionState: actionState,
   * });
   * ```
   *
   * The final action state can be accessed on `pendingActions.hash`.
   * ```ts
   * let endActionState = pendingActions.hash;
   * ```
   *
   * If the optional `endActionState` is provided, the list of actions will be fetched up to that state.
   * In that case, `pendingActions.hash` is guaranteed to equal `endActionState`.
   */
  getActions({
    fromActionState,
    endActionState,
  }?: {
    fromActionState?: Field;
    endActionState?: Field;
  }): MerkleList<MerkleList<Action>>;
  /**
   * Fetches the list of previously emitted {@link Action}s by zkapp {@link SmartContract}.
   * ```ts
   * let pendingActions = await zkapp.reducer.fetchActions({
   *    fromActionState: actionState,
   * });
   * ```
   */
  fetchActions({
    fromActionState,
    endActionState,
  }?: {
    fromActionState?: Field;
    endActionState?: Field;
  }): Promise<Action[][]>;
};

function getReducer<A>(contract: SmartContract): ReducerReturn<A> {
  let reducer: Reducer<A> = ((contract as any)._ ??= {}).reducer;
  if (reducer === undefined)
    throw Error(
      'You are trying to use a reducer without having declared its type.\n' +
        `Make sure to add a property \`reducer\` on ${contract.constructor.name}, for example:
class ${contract.constructor.name} extends SmartContract {
  reducer = Reducer({ actionType: Field });
}`
    );
  return {
    dispatch(action: A) {
      let accountUpdate = contract.self;
      let canonical = Provable.toCanonical(
        reducer.actionType as Provable<A>,
        action
      );
      let eventFields = reducer.actionType.toFields(canonical);
      accountUpdate.body.actions = Actions.pushEvent(
        accountUpdate.body.actions,
        eventFields
      );
    },

    reduce<S>(
      actionLists: MerkleList<MerkleList<A>>,
      stateType: Provable<S>,
      reduce: (state: S, action: A) => S,
      state: S,
      {
        maxUpdatesWithActions = 32,
        maxActionsPerUpdate = 1,
        skipActionStatePrecondition = false,
      } = {}
    ): S {
      Provable.asProver(() => {
        if (actionLists.data.get().length > maxUpdatesWithActions) {
          throw Error(
            `reducer.reduce: Exceeded the maximum number of lists of actions, ${maxUpdatesWithActions}.
  Use the optional \`maxUpdatesWithActions\` argument to increase this number.`
          );
        }
      });

      if (!skipActionStatePrecondition) {
        // the actionList.hash is the hash of all actions in that list, appended to the previous hash (the previous list of historical actions)
        // this must equal one of the action states as preconditions to build a chain to that we only use actions that were dispatched between the current on chain action state and the initialActionState
        contract.account.actionState.requireEquals(actionLists.hash);
      }

      const listIter = actionLists.startIterating();

      for (let i = 0; i < maxUpdatesWithActions; i++) {
        let { element: merkleActions, isDummy } = listIter.Unsafe.next();
        let actionIter = merkleActions.startIterating();
        let newState = state;

        if (maxActionsPerUpdate === 1) {
          // special case with less work, because the only action is a dummy iff merkleActions is a dummy
          let action = Provable.witness(
            reducer.actionType,
            () =>
              actionIter.data.get()[0]?.element ??
              actionIter.innerProvable.empty()
          );
          let emptyHash = actionIter.Constructor.emptyHash;
          let finalHash = actionIter.nextHash(emptyHash, action);
          finalHash = Provable.if(isDummy, emptyHash, finalHash);

          // note: this asserts nothing in the isDummy case, because `actionIter.hash` is not well-defined
          // but it doesn't matter because we're also skipping all state and action state updates in that case
          actionIter.hash.assertEquals(finalHash);

          newState = reduce(newState, action);
        } else {
          for (let j = 0; j < maxActionsPerUpdate; j++) {
            let { element: action, isDummy } = actionIter.Unsafe.next();
            newState = Provable.if(
              isDummy,
              stateType,
              newState,
              reduce(newState, action)
            );
          }
          // note: this asserts nothing about the iterated actions if `MerkleActions` is a dummy
          // which doesn't matter because we're also skipping all state and action state updates in that case
          actionIter.assertAtEnd();
        }

        state = Provable.if(isDummy, stateType, state, newState);
      }

      // important: we check that by iterating, we actually reached the claimed final action state
      listIter.assertAtEnd();

      return state;
    },

    forEach(
      actionLists: MerkleList<MerkleList<A>>,
      callback: (action: A) => void,
      config
    ) {
      const stateType = provable(null);
      this.reduce(
        actionLists,
        stateType,
        (_, action) => {
          callback(action);
          return null;
        },
        null,
        config
      );
    },

    getActions(config?: {
      fromActionState?: Field;
      endActionState?: Field;
    }): MerkleList<MerkleList<A>> {
      const Action = reducer.actionType;
      const emptyHash = Actions.empty().hash;
      const nextHash = (hash: Field, action: A) =>
        Actions.pushEvent({ hash, data: [] }, Action.toFields(action)).hash;

      class ActionList extends MerkleList.create(
        Action as unknown as ProvableHashable<A>,
        nextHash,
        emptyHash
      ) {}

      class MerkleActions extends MerkleList.create(
        ActionList,
        (hash: Field, actions: ActionList) =>
          Actions.updateSequenceState(hash, actions.hash),
        // if no "start" action hash was specified, this means we are fetching the entire history of actions, which started from the empty action state hash
        // otherwise we are only fetching a part of the history, which starts at `fromActionState`
        // TODO does this show that `emptyHash` should be part of the instance, not the class? that would make the provable representation bigger though
        config?.fromActionState ?? Actions.emptyActionState()
      ) {}

      let actions = Provable.witness(MerkleActions, () => {
        let actionFields = Mina.getActions(
          contract.address,
          config,
          contract.tokenId
        );
        // convert string-Fields back into the original action type
        let actions = actionFields.map((event) =>
          event.actions.map((action) =>
            (reducer.actionType as ProvablePure<A>).fromFields(
              action.map(Field)
            )
          )
        );
        return MerkleActions.from(
          actions.map((a) => ActionList.fromReverse(a))
        );
      });
      // note that we don't have to assert anything about the initial action state here,
      // because it is taken directly and not witnessed
      if (config?.endActionState !== undefined) {
        actions.hash.assertEquals(config.endActionState);
      }
      return actions;
    },

    async fetchActions(config?: {
      fromActionState?: Field;
      endActionState?: Field;
    }): Promise<A[][]> {
      let result = await Mina.fetchActions(
        contract.address,
        config,
        contract.tokenId
      );
      if ('error' in result) {
        throw Error(JSON.stringify(result));
      }
      return result.map((event) =>
        // putting our string-Fields back into the original action type
        event.actions.map((action) =>
          (reducer.actionType as ProvablePure<A>).fromFields(action.map(Field))
        )
      );
    },
  };
}
