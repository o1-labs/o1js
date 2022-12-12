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
let Hash = createHashHelpers(Field, Poseidon);
let { packToFields, hashWithPrefix } = Hash;

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
