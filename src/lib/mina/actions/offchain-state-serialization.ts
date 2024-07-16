/**
 * This defines a custom way to serialize various kinds of offchain state into an action.
 *
 * There is a special trick of including Merkle map (keyHash, valueHash) pairs _at the end_ of each action.
 * Thanks to the properties of Poseidon, this enables us to compute the action hash cheaply
 * if we only need to prove that (key, value) are part of it.
 */

import {
  ProvablePure,
  ProvableType,
  WithProvable,
} from '../../provable/types/provable-intf.js';
import {
  Poseidon,
  ProvableHashable,
  hashWithPrefix,
  packToFields,
  salt,
} from '../../provable/crypto/poseidon.js';
import { Field, Bool } from '../../provable/wrapped.js';
import { assert } from '../../provable/gadgets/common.js';
import { prefixes } from '../../../bindings/crypto/constants.js';
import { Struct } from '../../provable/types/struct.js';
import { Unconstrained } from '../../provable/types/unconstrained.js';
import { MerkleList } from '../../provable/merkle-list.js';
import * as Mina from '../mina.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { Provable } from '../../provable/provable.js';
import { Actions } from '../account-update.js';
import { Option } from '../../provable/option.js';
import {
  IndexedMerkleMap,
  IndexedMerkleMapBase,
} from '../../provable/merkle-tree-indexed.js';

export {
  toKeyHash,
  toAction,
  fromActionWithoutHashes,
  MerkleLeaf,
  LinearizedAction,
  LinearizedActionList,
  ActionList,
  fetchMerkleLeaves,
  fetchMerkleMap,
  updateMerkleMap,
  Actionable,
};

type Action = [...Field[], Field, Field];
type Actionable<T, V = any> = WithProvable<
  ProvableHashable<T, V> & ProvablePure<T, V>
>;

function toKeyHash<K, KeyType extends Actionable<K> | undefined>(
  prefix: Field,
  keyType: KeyType,
  key: KeyType extends undefined ? undefined : K
): Field {
  return hashPackedWithPrefix([prefix, Field(0)], keyType, key);
}

function toAction<K, V, KeyType extends Actionable<K> | undefined>({
  prefix,
  keyType,
  valueType,
  key,
  value,
  previousValue,
}: {
  prefix: Field;
  keyType: KeyType;
  valueType: Actionable<V>;
  key: KeyType extends undefined ? undefined : K;
  value: V;
  previousValue?: Option<V>;
}): Action {
  valueType = ProvableType.get(valueType);
  let valueSize = valueType.sizeInFields();
  let padding = valueSize % 2 === 0 ? [] : [Field(0)];

  let keyHash = hashPackedWithPrefix([prefix, Field(0)], keyType, key);

  let usesPreviousValue = Bool(previousValue !== undefined).toField();
  let previousValueHash =
    previousValue !== undefined
      ? Provable.if(
          previousValue.isSome,
          Poseidon.hashPacked(valueType, previousValue.value),
          Field(0)
        )
      : Field(0);
  let valueHash = Poseidon.hashPacked(valueType, value);

  return [
    ...valueType.toFields(value),
    ...padding,
    usesPreviousValue,
    previousValueHash,
    keyHash,
    valueHash,
  ];
}

function fromActionWithoutHashes<V>(
  valueType: Actionable<V>,
  action: Field[]
): V {
  valueType = ProvableType.get(valueType);
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
    let input = ProvableType.get(type).toInput(value as T);
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
  usesPreviousValue: Bool,
  previousValue: Field,
  prefix: Unconstrained.withEmpty<Field[]>([]),
}) {
  static fromAction(action: Field[]) {
    assert(action.length >= 4, 'invalid action size');
    let [usesPreviousValue_, previousValue, key, value] = action.slice(-4);
    let usesPreviousValue = usesPreviousValue_.assertBool();
    let prefix = Unconstrained.from(action.slice(0, -4));
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
  static hash(action: MerkleLeaf) {
    let preHashState = Provable.witnessFields(3, () => {
      let prefix = action.prefix.get();
      let init = salt(prefixes.event) as [Field, Field, Field];
      return Poseidon.update(init, prefix);
    });
    return Poseidon.update(preHashState, [
      action.usesPreviousValue.toField(),
      action.previousValue,
      action.key,
      action.value,
    ])[0];
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

class LinearizedAction extends Struct({
  action: MerkleLeaf,
  /**
   * Whether this action is the last in an account update.
   * In a linearized sequence of actions, this value determines the points at which we commit an atomic update to the Merkle tree.
   */
  isCheckPoint: Bool,
}) {
  /**
   * A custom method to hash an action which only hashes the key and value in provable code.
   * Therefore, it only proves that the key and value are part of the action, and nothing about
   * the rest of the action.
   */
  static hash({ action, isCheckPoint }: LinearizedAction) {
    let preHashState = Provable.witnessFields(3, () => {
      let prefix = action.prefix.get();
      let init = salt(prefixes.event) as [Field, Field, Field];
      return Poseidon.update(init, prefix);
    });
    return Poseidon.update(preHashState, [
      // pack two bools into 1 field
      action.usesPreviousValue.toField().add(isCheckPoint.toField().mul(2)),
      action.previousValue,
      action.key,
      action.value,
    ])[0];
  }
}

class LinearizedActionList extends MerkleList.create(
  LinearizedAction,
  (hash: Field, action: LinearizedAction) =>
    Poseidon.hash([hash, LinearizedAction.hash(action)]),
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
    ActionList,
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

// TODO this should be `updateMerkleMap`, and we should call it on every get() and settle()
/**
 * Recreate Merkle tree from fetched actions.
 *
 * We also deserialize a keyHash -> value map from the leaves.
 */
async function fetchMerkleMap(
  height: number,
  contract: { address: PublicKey; tokenId: Field },
  endActionState?: Field
): Promise<{
  merkleMap: IndexedMerkleMapBase;
  valueMap: Map<bigint, Field[]>;
}> {
  let result = await Mina.fetchActions(
    contract.address,
    { endActionState },
    contract.tokenId
  );
  if ('error' in result) throw Error(JSON.stringify(result));

  let leaves = result.map((event) =>
    event.actions
      .map((action) => MerkleLeaf.fromAction(action.map(Field)))
      .reverse()
  );

  let merkleMap = new (IndexedMerkleMap(height))();
  let valueMap = new Map<bigint, Field[]>();

  updateMerkleMap(leaves, merkleMap, valueMap);

  return { merkleMap, valueMap };
}

function updateMerkleMap(
  updates: MerkleLeaf[][],
  tree: IndexedMerkleMapBase,
  valueMap?: Map<bigint, Field[]>
) {
  let intermediateTree = tree.clone();

  for (let leaves of updates) {
    let isValidUpdate = true;
    let updates: { key: bigint; fullValue: Field[] }[] = [];

    for (let leaf of leaves) {
      let { key, value, usesPreviousValue, previousValue, prefix } =
        MerkleLeaf.toValue(leaf);

      // the update is invalid if there is an unsatisfied precondition
      let previous = intermediateTree.getOption(key).orElse(0n);
      let isValidAction =
        !usesPreviousValue || previous.toBigInt() === previousValue;

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
        if (valueMap) valueMap.set(key, fullValue);
      }
    } else {
      // if the update was invalid, we have to roll back the intermediate tree
      intermediateTree.overwrite(tree);
    }
  }
}
