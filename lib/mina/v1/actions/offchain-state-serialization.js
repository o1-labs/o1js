"use strict";
/**
 * This defines a custom way to serialize various kinds of offchain state into an action.
 *
 * There is a special trick of including Merkle map (keyHash, valueHash) pairs _at the end_ of each action.
 * Thanks to the properties of Poseidon, this enables us to compute the action hash cheaply
 * if we only need to prove that (key, value) are part of it.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMerkleMap = exports.fetchMerkleMap = exports.fetchMerkleLeaves = exports.ActionList = exports.LinearizedActionList = exports.LinearizedAction = exports.MerkleLeaf = exports.fromActionWithoutHashes = exports.toAction = exports.toKeyHash = void 0;
const provable_intf_js_1 = require("../../../provable/types/provable-intf.js");
const poseidon_js_1 = require("../../../provable/crypto/poseidon.js");
const wrapped_js_1 = require("../../../provable/wrapped.js");
const common_js_1 = require("../../../provable/gadgets/common.js");
const constants_js_1 = require("../../../../bindings/crypto/constants.js");
const struct_js_1 = require("../../../provable/types/struct.js");
const unconstrained_js_1 = require("../../../provable/types/unconstrained.js");
const merkle_list_js_1 = require("../../../provable/merkle-list.js");
const Mina = require("../mina.js");
const provable_js_1 = require("../../../provable/provable.js");
const account_update_js_1 = require("../account-update.js");
const merkle_tree_indexed_js_1 = require("../../../provable/merkle-tree-indexed.js");
function toKeyHash(prefix, keyType, key) {
    return hashPackedWithPrefix([prefix, (0, wrapped_js_1.Field)(0)], keyType, key);
}
exports.toKeyHash = toKeyHash;
function toAction({ prefix, keyType, valueType, key, value, previousValue, }) {
    valueType = provable_intf_js_1.ProvableType.get(valueType);
    let valueSize = valueType.sizeInFields();
    let padding = valueSize % 2 === 0 ? [] : [(0, wrapped_js_1.Field)(0)];
    let keyHash = hashPackedWithPrefix([prefix, (0, wrapped_js_1.Field)(0)], keyType, key);
    let usesPreviousValue = (0, wrapped_js_1.Bool)(previousValue !== undefined).toField();
    let previousValueHash = previousValue !== undefined
        ? provable_js_1.Provable.if(previousValue.isSome, poseidon_js_1.Poseidon.hashPacked(valueType, previousValue.value), (0, wrapped_js_1.Field)(0))
        : (0, wrapped_js_1.Field)(0);
    let valueHash = poseidon_js_1.Poseidon.hashPacked(valueType, value);
    return [
        ...valueType.toFields(value),
        ...padding,
        usesPreviousValue,
        previousValueHash,
        keyHash,
        valueHash,
    ];
}
exports.toAction = toAction;
function fromActionWithoutHashes(valueType, action) {
    valueType = provable_intf_js_1.ProvableType.get(valueType);
    let valueSize = valueType.sizeInFields();
    let paddingSize = valueSize % 2 === 0 ? 0 : 1;
    (0, common_js_1.assert)(action.length === valueSize + paddingSize, 'invalid action size');
    let value = valueType.fromFields(action.slice(0, valueSize));
    valueType.check(value);
    return value;
}
exports.fromActionWithoutHashes = fromActionWithoutHashes;
function hashPackedWithPrefix(prefix, type, value) {
    // hash constant prefix
    let state = poseidon_js_1.Poseidon.initialState();
    state = poseidon_js_1.Poseidon.update(state, prefix);
    // hash value if a type was passed in
    if (type !== undefined) {
        let input = provable_intf_js_1.ProvableType.get(type).toInput(value);
        let packed = (0, poseidon_js_1.packToFields)(input);
        state = poseidon_js_1.Poseidon.update(state, packed);
    }
    return state[0];
}
/**
 * This represents a custom kind of action which includes a Merkle map key and value in its serialization,
 * and doesn't represent the rest of the action's field elements in provable code.
 */
class MerkleLeaf extends (0, struct_js_1.Struct)({
    key: wrapped_js_1.Field,
    value: wrapped_js_1.Field,
    usesPreviousValue: wrapped_js_1.Bool,
    previousValue: wrapped_js_1.Field,
    prefix: unconstrained_js_1.Unconstrained.withEmpty([]),
}) {
    static fromAction(action) {
        (0, common_js_1.assert)(action.length >= 4, 'invalid action size');
        let [usesPreviousValue_, previousValue, key, value] = action.slice(-4);
        let usesPreviousValue = usesPreviousValue_.assertBool();
        let prefix = unconstrained_js_1.Unconstrained.from(action.slice(0, -4));
        return new MerkleLeaf({
            usesPreviousValue,
            previousValue,
            key,
            value,
            prefix,
        });
    }
    /**
     * A custom method to hash an action which only hashes the key and value in provable code.
     * Therefore, it only proves that the key and value are part of the action, and nothing about
     * the rest of the action.
     */
    static hash(action) {
        let preHashState = provable_js_1.Provable.witnessFields(3, () => {
            let prefix = action.prefix.get();
            let init = (0, poseidon_js_1.salt)(constants_js_1.prefixes.event);
            return poseidon_js_1.Poseidon.update(init, prefix);
        });
        return poseidon_js_1.Poseidon.update(preHashState, [
            action.usesPreviousValue.toField(),
            action.previousValue,
            action.key,
            action.value,
        ])[0];
    }
}
exports.MerkleLeaf = MerkleLeaf;
function pushAction(actionsHash, action) {
    return (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.sequenceEvents, [actionsHash, MerkleLeaf.hash(action)]);
}
class ActionList extends merkle_list_js_1.MerkleList.create(MerkleLeaf, pushAction, account_update_js_1.Actions.empty().hash) {
}
exports.ActionList = ActionList;
class LinearizedAction extends (0, struct_js_1.Struct)({
    action: MerkleLeaf,
    /**
     * Whether this action is the last in an account update.
     * In a linearized sequence of actions, this value determines the points at which we commit an atomic update to the Merkle tree.
     */
    isCheckPoint: wrapped_js_1.Bool,
}) {
    /**
     * A custom method to hash an action which only hashes the key and value in provable code.
     * Therefore, it only proves that the key and value are part of the action, and nothing about
     * the rest of the action.
     */
    static hash({ action, isCheckPoint }) {
        let preHashState = provable_js_1.Provable.witnessFields(3, () => {
            let prefix = action.prefix.get();
            let init = (0, poseidon_js_1.salt)(constants_js_1.prefixes.event);
            return poseidon_js_1.Poseidon.update(init, prefix);
        });
        return poseidon_js_1.Poseidon.update(preHashState, [
            // pack two bools into 1 field
            action.usesPreviousValue.toField().add(isCheckPoint.toField().mul(2)),
            action.previousValue,
            action.key,
            action.value,
        ])[0];
    }
}
exports.LinearizedAction = LinearizedAction;
class LinearizedActionList extends merkle_list_js_1.MerkleList.create(LinearizedAction, (hash, action) => poseidon_js_1.Poseidon.hash([hash, LinearizedAction.hash(action)]), account_update_js_1.Actions.empty().hash) {
}
exports.LinearizedActionList = LinearizedActionList;
async function fetchMerkleLeaves(contract, config) {
    class MerkleActions extends merkle_list_js_1.MerkleList.create(ActionList, (hash, actions) => account_update_js_1.Actions.updateSequenceState(hash, actions.hash), 
    // if no "start" action hash was specified, this means we are fetching the entire history of actions, which started from the empty action state hash
    // otherwise we are only fetching a part of the history, which starts at `fromActionState`
    config?.fromActionState ?? account_update_js_1.Actions.emptyActionState()) {
    }
    let result = await Mina.fetchActions(contract.address, config, contract.tokenId);
    if ('error' in result)
        throw Error(JSON.stringify(result));
    // convert string-Fields back into the original action type
    let merkleLeafs = result.map((event) => event.actions.map((action) => MerkleLeaf.fromAction(action.map(wrapped_js_1.Field))));
    return MerkleActions.from(merkleLeafs.map((a) => ActionList.fromReverse(a)));
}
exports.fetchMerkleLeaves = fetchMerkleLeaves;
// TODO this should be `updateMerkleMap`, and we should call it on every get() and settle()
/**
 * Recreate Merkle tree from fetched actions.
 *
 * We also deserialize a keyHash -> value map from the leaves.
 */
async function fetchMerkleMap(height, contract, endActionState) {
    let result = await Mina.fetchActions(contract.address, { endActionState }, contract.tokenId);
    if ('error' in result)
        throw Error(JSON.stringify(result));
    let leaves = result.map((event) => event.actions.map((action) => MerkleLeaf.fromAction(action.map(wrapped_js_1.Field))).reverse());
    let merkleMap = new ((0, merkle_tree_indexed_js_1.IndexedMerkleMap)(height))();
    let valueMap = new Map();
    updateMerkleMap(leaves, merkleMap, valueMap);
    return { merkleMap, valueMap };
}
exports.fetchMerkleMap = fetchMerkleMap;
function updateMerkleMap(updates, tree, valueMap) {
    let intermediateTree = tree.clone();
    for (let leaves of updates) {
        let isValidUpdate = true;
        let updates = [];
        for (let leaf of leaves) {
            let { key, value, usesPreviousValue, previousValue, prefix } = MerkleLeaf.toValue(leaf);
            // the update is invalid if there is an unsatisfied precondition
            let previous = intermediateTree.getOption(key).orElse(0n);
            let isValidAction = !usesPreviousValue || previous.toBigInt() === previousValue;
            if (!isValidAction) {
                isValidUpdate = false;
                break;
            }
            // update the intermediate tree, save updates for final tree
            intermediateTree.set(key, value);
            updates.push({ key, fullValue: prefix });
        }
        if (isValidUpdate) {
            // if the update was valid, we can commit the updates
            tree.overwrite(intermediateTree);
            for (let { key, fullValue } of updates) {
                if (valueMap)
                    valueMap.set(key, fullValue);
            }
        }
        else {
            // if the update was invalid, we have to roll back the intermediate tree
            intermediateTree.overwrite(tree);
        }
    }
}
exports.updateMerkleMap = updateMerkleMap;
