import { MerkleList } from '../../../provable/merkle-list.js';
import { Field } from '../../../provable/wrapped.js';
import { InferProvable } from '../../../provable/types/struct.js';
import { Actionable } from './offchain-state-serialization.js';
import { Actions } from '../account-update.js';
import { Hashed } from '../../../provable/packed.js';
import { hashWithPrefix } from '../../../provable/crypto/poseidon.js';
import { prefixes } from '../../../../bindings/crypto/constants.js';
import { ProvableType } from '../../../provable/types/provable-intf.js';

export { MerkleActions, MerkleActionHashes, HashedAction, FlatActions };
export { emptyActionState, emptyActionsHash };

const emptyActionsHash = Actions.empty().hash;
const emptyActionState = Actions.emptyActionState();

/**
 * Provable representation of actions and their three levels of Merkleization.
 */
type MerkleActions<T> = MerkleList<MerkleList<Hashed<T>>>;

function MerkleActions<A extends Actionable<any>>(actionType: A, fromActionState?: Field) {
  return MerkleList.create(
    MerkleActionList(actionType),
    (hash, actions) => hashWithPrefix(prefixes.sequenceEvents, [hash, actions.hash]),
    fromActionState ?? emptyActionState
  );
}
MerkleActions.fromFields = actionFieldsToMerkleList;

type MerkleActionList<T> = MerkleList<Hashed<T>>;

function MerkleActionList<A extends Actionable<any>>(actionType: A) {
  return MerkleList.create(
    HashedAction(actionType),
    (hash, action) => hashWithPrefix(prefixes.sequenceEvents, [hash, action.hash]),
    emptyActionsHash
  );
}

type HashedAction<T> = Hashed<T>;

function HashedAction<A extends Actionable<any>>(actionType: A) {
  let type = ProvableType.get(actionType as Actionable<InferProvable<A>>);
  return Hashed.create(type, (action) => hashWithPrefix(prefixes.event, type.toFields(action)));
}

function actionFieldsToMerkleList<T>(
  actionType: Actionable<T>,
  fields: bigint[][][],
  fromActionState?: bigint
) {
  let type = ProvableType.get(actionType);
  const HashedActionT = HashedAction(type);
  const MerkleActionListT = MerkleActionList(type);
  const MerkleActionsT = MerkleActions(type, fromActionState ? Field(fromActionState) : undefined);
  let actions = fields.map((event) => event.map((action) => type.fromFields(action.map(Field))));
  let hashes = actions.map((as) => as.map((a) => HashedActionT.hash(a)));
  return MerkleActionsT.from(hashes.map((h) => MerkleActionListT.from(h)));
}

/**
 * Simplified representation of actions where we don't use inner action lists but
 * only their hashes, which are plain Field elements.
 */
type MerkleActionHashes = MerkleList<Field>;

function MerkleActionHashes(fromActionState?: Field) {
  return MerkleList.create(
    Field,
    (hash, actionsHash) => hashWithPrefix(prefixes.sequenceEvents, [hash, actionsHash]),
    fromActionState ?? emptyActionState
  );
}

/**
 * Provable representation of a flat list of actions.
 *
 * If the amount of logic per action is heavy, it is usually good to flatten the nested actions
 * list into a single list like this one.
 */
type FlatActions<T> = MerkleList<Hashed<T>>;

function FlatActions<A extends Actionable<any>>(actionType: A) {
  return MerkleList.create(HashedAction(actionType));
}
