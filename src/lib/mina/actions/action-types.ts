import { MerkleList } from '../../provable/merkle-list.js';
import { Field } from '../../provable/wrapped.js';
import { InferProvable } from '../../provable/types/struct.js';
import { Actionable } from './offchain-state-serialization.js';
import { Actions } from '../account-update.js';
import { Hashed } from '../../provable/packed.js';
import { hashWithPrefix } from '../../provable/crypto/poseidon.js';
import { prefixes } from '../../../bindings/crypto/constants.js';

export { MerkleActions };

const emptyActionsHash = Actions.empty().hash;
const emptyActionState = Actions.emptyActionState();

/**
 * Provable representation of actions and their three levels of Merkleization.
 */
type MerkleActions<T> = MerkleList<MerkleList<Hashed<T>>>;

function MerkleActions<
  A extends Actionable<any>,
  T extends InferProvable<A> = InferProvable<A>
>(actionType: A, fromActionState?: Field) {
  const HashedAction = Hashed.create(actionType as Actionable<T>, (action) =>
    hashWithPrefix(prefixes.event, actionType.toFields(action))
  );

  const ActionList = MerkleList.create(
    HashedAction.provable,
    (hash, action) =>
      hashWithPrefix(prefixes.sequenceEvents, [hash, action.hash]),
    emptyActionsHash
  );

  return MerkleList.create(
    ActionList.provable,
    (hash, actions) =>
      hashWithPrefix(prefixes.sequenceEvents, [hash, actions.hash]),
    fromActionState ?? emptyActionState
  );
}
