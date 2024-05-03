/**
 * This defines a custom way to serialize various kinds of offchain state into an action.
 *
 * There is a special trick of including Merkle map (keyHash, valueHash) pairs _at the end_ of each action.
 * Thanks to the properties of Poseidon, this enables us to compute the action hash cheaply
 * if we only need to prove that (key, value) are part of it.
 */

import { ProvablePure } from '../../provable/types/provable-intf.js';
import {
  Poseidon,
  ProvableHashable,
  hashWithPrefix,
  salt,
} from '../../provable/crypto/poseidon.js';
import { Field } from '../../provable/wrapped.js';
import { assert } from '../../provable/gadgets/common.js';
import { prefixes } from '../../../bindings/crypto/constants.js';
import { Struct } from '../../provable/types/struct.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { MerkleList } from '../../provable/merkle-list.js';
import * as Mina from '../mina.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Provable } from '../../provable/provable.js';
import { Actions } from '../account-update.js';

export {
  fromAction,
  toAction,
  MerkleLeaf,
  ActionList,
  fetchMerkleLeaves,
  Actionable,
};

type Action = [...Field[], Field, Field];
type Actionable<T> = ProvableHashable<T> & ProvablePure<T>;

function toAction<K, V>(
  keyType: Actionable<K>,
  valueType: Actionable<V>,
  key: K,
  value: V
): Action {
  let combinedSize = keyType.sizeInFields() + valueType.sizeInFields();
  let padding = combinedSize % 2 === 0 ? [] : [Field(0)];

  let keyHash = Poseidon.hashPacked(keyType, key);
  let valueHash = Poseidon.hashPacked(valueType, value);
  return [
    ...keyType.toFields(key),
    ...valueType.toFields(value),
    ...padding,
    keyHash,
    valueHash,
  ];
}

function fromAction<K, V>(
  keyType: Actionable<K>,
  valueType: Actionable<V>,
  action: Action
): { key: K; value: V } {
  let keySize = keyType.sizeInFields();
  let valueSize = valueType.sizeInFields();
  let paddingSize = (keySize + valueSize) % 2 === 0 ? 0 : 1;
  assert(
    action.length === keySize + valueSize + paddingSize + 2,
    'invalid action size'
  );

  let key = keyType.fromFields(action.slice(0, keySize));
  keyType.check(key);

  let value = valueType.fromFields(action.slice(keySize, keySize + valueSize));
  valueType.check(value);

  return { key, value };
}

/**
 * This represents a custom kind of action which includes a Merkle map key and value in its serialization,
 * and doesn't represent the rest of the action's field elements in provable code.
 */
class MerkleLeaf extends Struct({
  key: Field,
  value: Field,
  prefix: Unconstrained.provable as Provable<Unconstrained<Field[]>>,
}) {
  static fromAction(action: Field[]) {
    assert(action.length >= 2, 'invalid action size');
    let [key, value] = action.slice(-2);
    let prefix = Unconstrained.from(action.slice(0, -2));
    return new MerkleLeaf({ key, value, prefix });
  }

  /**
   * A custom method to hash an action which only hashes the key and value in provable code.
   * Therefore, it only proves that the key and value are part of the action, and nothing about
   * the rest of the action.
   */
  static hash(action: MerkleLeaf) {
    let preHashState = Provable.witnessFields(3, () => {
      let prefix = action.prefix.get();
      let init = salt(prefixes.event) as [Field, Field, Field];
      return Poseidon.update(init, prefix);
    });
    return Poseidon.update(preHashState, [action.key, action.value])[0];
  }
}

function pushAction(actionsHash: Field, action: MerkleLeaf) {
  return hashWithPrefix(prefixes.sequenceEvents, [
    actionsHash,
    MerkleLeaf.hash(action),
  ]);
}

class ActionList extends MerkleList.create(
  MerkleLeaf,
  pushAction,
  Actions.empty().hash
) {}

async function fetchMerkleLeaves(
  contract: { address: PublicKey; tokenId: Field },
  config?: {
    fromActionState?: Field;
    endActionState?: Field;
  }
): Promise<MerkleList<MerkleList<MerkleLeaf>>> {
  class MerkleActions extends MerkleList.create(
    ActionList.provable,
    (hash: Field, actions: ActionList) =>
      Actions.updateSequenceState(hash, actions.hash),
    // if no "start" action hash was specified, this means we are fetching the entire history of actions, which started from the empty action state hash
    // otherwise we are only fetching a part of the history, which starts at `fromActionState`
    config?.fromActionState ?? Actions.emptyActionState()
  ) {}

  let result = await Mina.fetchActions(
    contract.address,
    config,
    contract.tokenId
  );
  if ('error' in result) throw Error(JSON.stringify(result));

  // convert string-Fields back into the original action type
  let merkleLeafs = result.map((event) =>
    event.actions.map((action) => MerkleLeaf.fromAction(action.map(Field)))
  );
  return MerkleActions.from(merkleLeafs.map((a) => ActionList.fromReverse(a)));
}
