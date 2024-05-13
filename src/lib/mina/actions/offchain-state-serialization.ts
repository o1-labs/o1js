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
  packToFields,
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
import { MerkleMap } from '../../provable/merkle-map.js';

export {
  toKeyHash,
  toAction,
  fromActionWithoutHashes,
  MerkleLeaf,
  ActionList,
  fetchMerkleLeaves,
  fetchMerkleMap,
  Actionable,
};

type Action = [...Field[], Field, Field];
type Actionable<T, V = any> = ProvableHashable<T, V> & ProvablePure<T, V>;

function toKeyHash<K, KeyType extends Actionable<K> | undefined>(
  prefix: Field,
  keyType: KeyType,
  key: KeyType extends undefined ? undefined : K
): Field {
  let keySize = keyType?.sizeInFields() ?? 0;
  return hashPackedWithPrefix([prefix, Field(keySize)], keyType, key);
}

function toAction<K, V, KeyType extends Actionable<K> | undefined>(
  prefix: Field,
  keyType: KeyType,
  valueType: Actionable<V>,
  key: KeyType extends undefined ? undefined : K,
  value: V
): Action {
  let combinedSize = valueType.sizeInFields();
  let padding = combinedSize % 2 === 0 ? [] : [Field(0)];

  let keyHash = hashPackedWithPrefix([prefix, Field(0)], keyType, key);
  let valueHash = Poseidon.hashPacked(valueType, value);
  return [...valueType.toFields(value), ...padding, keyHash, valueHash];
}

function fromActionWithoutHashes<V>(
  valueType: Actionable<V>,
  action: Field[]
): V {
  let valueSize = valueType.sizeInFields();
  let paddingSize = valueSize % 2 === 0 ? 0 : 1;
  assert(action.length === valueSize + paddingSize, 'invalid action size');

  let value = valueType.fromFields(action.slice(0, valueSize));
  valueType.check(value);

  return value;
}

function hashPackedWithPrefix<T, Type extends Actionable<T> | undefined>(
  prefix: [Field, Field],
  type: Type,
  value: Type extends undefined ? undefined : T
) {
  // hash constant prefix
  let state = Poseidon.initialState();
  state = Poseidon.update(state, prefix);

  // hash value if a type was passed in
  if (type !== undefined) {
    let input = type.toInput(value as T);
    let packed = packToFields(input);
    state = Poseidon.update(state, packed);
  }
  return state[0];
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

/**
 * Recreate Merkle tree from fetched actions.
 *
 * We also deserialize a keyHash -> value map from the leaves.
 */
async function fetchMerkleMap(
  contract: { address: PublicKey; tokenId: Field },
  endActionState?: Field
): Promise<{ merkleMap: MerkleMap; valueMap: Map<bigint, Field[]> }> {
  let result = await Mina.fetchActions(
    contract.address,
    { endActionState },
    contract.tokenId
  );
  if ('error' in result) throw Error(JSON.stringify(result));

  let leaves = result
    .map((event) =>
      event.actions
        .map((action) => MerkleLeaf.fromAction(action.map(Field)))
        .reverse()
    )
    .flat();

  let merkleMap = new MerkleMap();
  let valueMap = new Map<bigint, Field[]>();

  for (let leaf of leaves) {
    merkleMap.set(leaf.key, leaf.value);
    valueMap.set(leaf.key.toBigInt(), leaf.prefix.get());
  }

  return { merkleMap, valueMap };
}
