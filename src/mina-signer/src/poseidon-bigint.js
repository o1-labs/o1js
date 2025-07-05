import { Field, sizeInBits } from './field-bigint.js';
import { Poseidon, PoseidonLegacy } from '../../bindings/crypto/poseidon.js';
import { prefixes } from '../../bindings/crypto/constants.js';
import { createHashInput } from '../../bindings/lib/provable-generic.js';
import { createHashHelpers } from '../../lib/provable/crypto/hash-generic.js';
export { Poseidon, HashHelpers, HashInput, prefixes, packToFields, hashWithPrefix, packToFieldsLegacy, HashInputLegacy, inputToBitsLegacy, HashLegacy, };
const HashInput = createHashInput();
const HashHelpers = createHashHelpers(Field, Poseidon);
let { hashWithPrefix } = HashHelpers;
const HashLegacy = createHashHelpers(Field, PoseidonLegacy);
/**
 * Convert the {fields, packed} hash input representation to a list of field elements
 * Random_oracle_input.Chunked.pack_to_fields
 */
function packToFields({ fields = [], packed = [] }) {
    if (packed.length === 0)
        return fields;
    let packedBits = [];
    let currentPackedField = 0n;
    let currentSize = 0;
    for (let [field, size] of packed) {
        currentSize += size;
        if (currentSize < 255) {
            currentPackedField = currentPackedField * (1n << BigInt(size)) + field;
        }
        else {
            packedBits.push(currentPackedField);
            currentSize = size;
            currentPackedField = field;
        }
    }
    packedBits.push(currentPackedField);
    return fields.concat(packedBits);
}
/**
 * Random_oracle_input.Legacy.pack_to_fields
 */
function packToFieldsLegacy({ fields, bits }) {
    let packedFields = [];
    while (bits.length > 0) {
        let fieldBits = bits.splice(0, sizeInBits - 1);
        let field = Field.fromBits(fieldBits);
        packedFields.push(field);
    }
    return fields.concat(packedFields);
}
function inputToBitsLegacy({ fields, bits }) {
    let fieldBits = fields.map(Field.toBits).flat();
    return fieldBits.concat(bits);
}
const HashInputLegacy = {
    empty() {
        return { fields: [], bits: [] };
    },
    bits(bits) {
        return { fields: [], bits };
    },
    append(input1, input2) {
        return {
            fields: (input1.fields ?? []).concat(input2.fields ?? []),
            bits: (input1.bits ?? []).concat(input2.bits ?? []),
        };
    },
};
