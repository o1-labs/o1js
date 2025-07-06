"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyActionsHash = exports.emptyActionState = exports.FlatActions = exports.HashedAction = exports.MerkleActionHashes = exports.MerkleActions = void 0;
const merkle_list_js_1 = require("../../../provable/merkle-list.js");
const wrapped_js_1 = require("../../../provable/wrapped.js");
const account_update_js_1 = require("../account-update.js");
const packed_js_1 = require("../../../provable/packed.js");
const poseidon_js_1 = require("../../../provable/crypto/poseidon.js");
const constants_js_1 = require("../../../../bindings/crypto/constants.js");
const provable_intf_js_1 = require("../../../provable/types/provable-intf.js");
const emptyActionsHash = account_update_js_1.Actions.empty().hash;
exports.emptyActionsHash = emptyActionsHash;
const emptyActionState = account_update_js_1.Actions.emptyActionState();
exports.emptyActionState = emptyActionState;
function MerkleActions(actionType, fromActionState) {
    return merkle_list_js_1.MerkleList.create(MerkleActionList(actionType), (hash, actions) => (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.sequenceEvents, [hash, actions.hash]), fromActionState ?? emptyActionState);
}
exports.MerkleActions = MerkleActions;
MerkleActions.fromFields = actionFieldsToMerkleList;
function MerkleActionList(actionType) {
    return merkle_list_js_1.MerkleList.create(HashedAction(actionType), (hash, action) => (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.sequenceEvents, [hash, action.hash]), emptyActionsHash);
}
function HashedAction(actionType) {
    let type = provable_intf_js_1.ProvableType.get(actionType);
    return packed_js_1.Hashed.create(type, (action) => (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.event, type.toFields(action)));
}
exports.HashedAction = HashedAction;
function actionFieldsToMerkleList(actionType, fields, fromActionState) {
    let type = provable_intf_js_1.ProvableType.get(actionType);
    const HashedActionT = HashedAction(type);
    const MerkleActionListT = MerkleActionList(type);
    const MerkleActionsT = MerkleActions(type, fromActionState ? (0, wrapped_js_1.Field)(fromActionState) : undefined);
    let actions = fields.map((event) => event.map((action) => type.fromFields(action.map(wrapped_js_1.Field))));
    let hashes = actions.map((as) => as.map((a) => HashedActionT.hash(a)));
    return MerkleActionsT.from(hashes.map((h) => MerkleActionListT.from(h)));
}
function MerkleActionHashes(fromActionState) {
    return merkle_list_js_1.MerkleList.create(wrapped_js_1.Field, (hash, actionsHash) => (0, poseidon_js_1.hashWithPrefix)(constants_js_1.prefixes.sequenceEvents, [hash, actionsHash]), fromActionState ?? emptyActionState);
}
exports.MerkleActionHashes = MerkleActionHashes;
function FlatActions(actionType) {
    return merkle_list_js_1.MerkleList.create(HashedAction(actionType));
}
exports.FlatActions = FlatActions;
