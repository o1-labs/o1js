/**
 * This defines a custom way to serialize various kinds of offchain state into an action.
 *
 * There is a special trick of including Merkle map (keyHash, valueHash) pairs _at the end_ of each action.
 * Thanks to the properties of Poseidon, this enables us to compute the action hash cheaply
 * if we only need to prove that (key, value) are part of it.
 */

import { ProvablePure } from 'src/lib/provable/types/provable-intf.js';
import {
  Poseidon,
  ProvableHashable,
  hashWithPrefix,
} from '../../provable/crypto/poseidon.js';
import { Field } from '../../provable/wrapped.js';
import { assert } from '../../provable/gadgets/common.js';
import { prefixes } from '../../../bindings/crypto/constants.js';

export { fromAction, toAction, pushActionCustom, merkleLeafFromAction };

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
 * A custom method to hash an action which only hashes the keyHash and valueHash inside the circuit.
 * Therefore, it only proves that the keyHash and valueHash are part of the action, and nothing about
 * the rest of the action.
 */
function pushActionCustom(actionsHash: Field, action: Action) {
  let eventHash = hashWithPrefix(prefixes.event, action);
  let hash = hashWithPrefix(prefixes.sequenceEvents, [actionsHash, eventHash]);
  return hash;
}

function merkleLeafFromAction(action: Action) {
  assert(action.length >= 2, 'invalid action size');
  let [key, value] = action.slice(-2);
  return { key, value };
}
