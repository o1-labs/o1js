import { MerkleList } from '../../../provable/merkle-list.js';
import { Field } from '../../../provable/wrapped.js';
import { Actions } from '../account-update.js';
import { Hashed } from '../../../provable/packed.js';
import { hashWithPrefix } from '../../../provable/crypto/poseidon.js';
import { prefixes } from '../../../../bindings/crypto/constants.js';
import { ProvableType } from '../../../provable/types/provable-intf.js';
export { MerkleActions, MerkleActionHashes, HashedAction, FlatActions };
export { emptyActionState, emptyActionsHash };
const emptyActionsHash = Actions.empty().hash;
const emptyActionState = Actions.emptyActionState();
function MerkleActions(actionType, fromActionState) {
    return MerkleList.create(MerkleActionList(actionType), (hash, actions) => hashWithPrefix(prefixes.sequenceEvents, [hash, actions.hash]), fromActionState ?? emptyActionState);
}
MerkleActions.fromFields = actionFieldsToMerkleList;
function MerkleActionList(actionType) {
    return MerkleList.create(HashedAction(actionType), (hash, action) => hashWithPrefix(prefixes.sequenceEvents, [hash, action.hash]), emptyActionsHash);
}
function HashedAction(actionType) {
    let type = ProvableType.get(actionType);
    return Hashed.create(type, (action) => hashWithPrefix(prefixes.event, type.toFields(action)));
}
function actionFieldsToMerkleList(actionType, fields, fromActionState) {
    let type = ProvableType.get(actionType);
    const HashedActionT = HashedAction(type);
    const MerkleActionListT = MerkleActionList(type);
    const MerkleActionsT = MerkleActions(type, fromActionState ? Field(fromActionState) : undefined);
    let actions = fields.map((event) => event.map((action) => type.fromFields(action.map(Field))));
    let hashes = actions.map((as) => as.map((a) => HashedActionT.hash(a)));
    return MerkleActionsT.from(hashes.map((h) => MerkleActionListT.from(h)));
}
function MerkleActionHashes(fromActionState) {
    return MerkleList.create(Field, (hash, actionsHash) => hashWithPrefix(prefixes.sequenceEvents, [hash, actionsHash]), fromActionState ?? emptyActionState);
}
function FlatActions(actionType) {
    return MerkleList.create(HashedAction(actionType));
}
