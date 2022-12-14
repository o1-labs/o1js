import { Field, sizeInBits } from './field-bigint.js';
import { bitsToBytes } from './binable.js';
import { Poseidon } from '../js_crypto/poseidon.js';
import { prefixes } from '../js_crypto/constants.js';
import { createHashInput } from './provable-generic.js';
import { GenericHashInput } from './generic.js';
import { createHashHelpers } from '../lib/hash-generic.js';

export {
  Poseidon,
  Hash,
  HashInput,
  prefixes,
  packToFields,
  hashWithPrefix,
  packToFieldsLegacy,
};

type HashInput = GenericHashInput<Field>;
const HashInput = createHashInput<Field>();
let Hash = createHashHelpers(Field, Poseidon, packToFields);
let { hashWithPrefix } = Hash;

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
