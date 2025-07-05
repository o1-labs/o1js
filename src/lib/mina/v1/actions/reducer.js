import { Field } from '../../../provable/wrapped.js';
import { Actions } from '../account-update.js';
import { provable } from '../../../provable/types/provable-derivers.js';
import { Provable } from '../../../provable/provable.js';
import * as Mina from '../mina.js';
import { MerkleList } from '../../../provable/merkle-list.js';
export { Reducer, getReducer };
const Reducer = Object.defineProperty(function (reducer) {
    // we lie about the return value here, and instead overwrite this.reducer with
    // a getter, so we can get access to `this` inside functions on this.reducer (see constructor)
    return reducer;
}, 'initialActionState', { get: Actions.emptyActionState });
function getReducer(contract) {
    var _a;
    let reducer = ((_a = contract)._ ?? (_a._ = {})).reducer;
    if (reducer === undefined)
        throw Error('You are trying to use a reducer without having declared its type.\n' +
            `Make sure to add a property \`reducer\` on ${contract.constructor.name}, for example:
class ${contract.constructor.name} extends SmartContract {
  reducer = Reducer({ actionType: Field });
}`);
    return {
        dispatch(action) {
            let accountUpdate = contract.self;
            let canonical = Provable.toCanonical(reducer.actionType, action);
            let eventFields = reducer.actionType.toFields(canonical);
            accountUpdate.body.actions = Actions.pushEvent(accountUpdate.body.actions, eventFields);
        },
        reduce(actionLists, stateType, reduce, state, { maxUpdatesWithActions = 32, maxActionsPerUpdate = 1, skipActionStatePrecondition = false, } = {}) {
            Provable.asProver(() => {
                if (actionLists.data.get().length > maxUpdatesWithActions) {
                    throw Error(`reducer.reduce: Exceeded the maximum number of lists of actions, ${maxUpdatesWithActions}.
  Use the optional \`maxUpdatesWithActions\` argument to increase this number.`);
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
                    let action = Provable.witness(reducer.actionType, () => actionIter.data.get()[0]?.element ?? actionIter.innerProvable.empty());
                    let emptyHash = actionIter.Constructor.emptyHash;
                    let finalHash = actionIter.nextHash(emptyHash, action);
                    finalHash = Provable.if(isDummy, emptyHash, finalHash);
                    // note: this asserts nothing in the isDummy case, because `actionIter.hash` is not well-defined
                    // but it doesn't matter because we're also skipping all state and action state updates in that case
                    actionIter.hash.assertEquals(finalHash);
                    newState = reduce(newState, action);
                }
                else {
                    for (let j = 0; j < maxActionsPerUpdate; j++) {
                        let { element: action, isDummy } = actionIter.Unsafe.next();
                        newState = Provable.if(isDummy, stateType, newState, reduce(newState, action));
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
        forEach(actionLists, callback, config) {
            const stateType = provable(null);
            this.reduce(actionLists, stateType, (_, action) => {
                callback(action);
                return null;
            }, null, config);
        },
        getActions(config) {
            const Action = reducer.actionType;
            const emptyHash = Actions.empty().hash;
            const nextHash = (hash, action) => Actions.pushEvent({ hash, data: [] }, Action.toFields(action)).hash;
            class ActionList extends MerkleList.create(Action, nextHash, emptyHash) {
            }
            class MerkleActions extends MerkleList.create(ActionList, (hash, actions) => Actions.updateSequenceState(hash, actions.hash), 
            // if no "start" action hash was specified, this means we are fetching the entire history of actions, which started from the empty action state hash
            // otherwise we are only fetching a part of the history, which starts at `fromActionState`
            // TODO does this show that `emptyHash` should be part of the instance, not the class? that would make the provable representation bigger though
            config?.fromActionState ?? Actions.emptyActionState()) {
            }
            let actions = Provable.witness(MerkleActions, () => {
                let actionFields = Mina.getActions(contract.address, config, contract.tokenId);
                // convert string-Fields back into the original action type
                let actions = actionFields.map((event) => event.actions.map((action) => reducer.actionType.fromFields(action.map(Field))));
                return MerkleActions.from(actions.map((a) => ActionList.fromReverse(a)));
            });
            // note that we don't have to assert anything about the initial action state here,
            // because it is taken directly and not witnessed
            if (config?.endActionState !== undefined) {
                actions.hash.assertEquals(config.endActionState);
            }
            return actions;
        },
        async fetchActions(config) {
            let result = await Mina.fetchActions(contract.address, config, contract.tokenId);
            if ('error' in result) {
                throw Error(JSON.stringify(result));
            }
            return result.map((event) => 
            // putting our string-Fields back into the original action type
            event.actions.map((action) => reducer.actionType.fromFields(action.map(Field))));
        },
    };
}
