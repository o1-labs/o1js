import { prefixes } from '../lib/hash.js';
import { Field, HashInput, sizeInBits } from './field-bigint.js';
import { bitsToBytes, prefixToField } from './binable.js';
import { Poseidon } from '../js_crypto/poseidon.js';

export { Poseidon, prefixes, packToFields, hashWithPrefix, packToFieldsLegacy };

function salt(prefix: string) {
  return Poseidon.update(Poseidon.initialState(), [
    prefixToField(Field, prefix),
  ]);
}
function hashWithPrefix(prefix: string, input: Field[]) {
  let init = salt(prefix);
  return Poseidon.update(init, input)[0];
}

/**
 * Convert the {fields, packed} hash input representation to a list of field elements
 * Random_oracle_input.Chunked.pack_to_fields
 */
function packToFields({ fields = [], packed = [] }: HashInput) {
  if (packed.length === 0) return fields;
  let packedBits = [];
  let currentPackedField = 0n;
  let currentSize = 0;
  for (let [field, size] of packed) {
    currentSize += size;
    if (currentSize < 255) {
      currentPackedField = currentPackedField * (1n << BigInt(size)) + field;
    } else {
      packedBits.push(currentPackedField);
      currentSize = size;
      currentPackedField = field;
    }
  }
  packedBits.push(currentPackedField);
  return fields.concat(packedBits);
}
/**
 * Random_oracle_input.Legacy.pack_to_fields, for the special case of a single bitstring
 */
function packToFieldsLegacy([...bits]: boolean[]) {
  let fields = [];
  while (bits.length > 0) {
    let fieldBits = bits.splice(0, sizeInBits);
    let field = Field.fromBytes(bitsToBytes(fieldBits));
    fields.push(field);
  }
  return fields;
}
