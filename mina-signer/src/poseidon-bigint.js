"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashLegacy = exports.inputToBitsLegacy = exports.HashInputLegacy = exports.packToFieldsLegacy = exports.hashWithPrefix = exports.packToFields = exports.prefixes = exports.HashInput = exports.HashHelpers = exports.Poseidon = void 0;
const field_bigint_js_1 = require("./field-bigint.js");
const poseidon_js_1 = require("../../bindings/crypto/poseidon.js");
Object.defineProperty(exports, "Poseidon", { enumerable: true, get: function () { return poseidon_js_1.Poseidon; } });
const constants_js_1 = require("../../bindings/crypto/constants.js");
Object.defineProperty(exports, "prefixes", { enumerable: true, get: function () { return constants_js_1.prefixes; } });
const provable_generic_js_1 = require("../../bindings/lib/provable-generic.js");
const hash_generic_js_1 = require("../../lib/provable/crypto/hash-generic.js");
const HashInput = (0, provable_generic_js_1.createHashInput)();
exports.HashInput = HashInput;
const HashHelpers = (0, hash_generic_js_1.createHashHelpers)(field_bigint_js_1.Field, poseidon_js_1.Poseidon);
exports.HashHelpers = HashHelpers;
let { hashWithPrefix } = HashHelpers;
exports.hashWithPrefix = hashWithPrefix;
const HashLegacy = (0, hash_generic_js_1.createHashHelpers)(field_bigint_js_1.Field, poseidon_js_1.PoseidonLegacy);
exports.HashLegacy = HashLegacy;
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
exports.packToFields = packToFields;
/**
 * Random_oracle_input.Legacy.pack_to_fields
 */
function packToFieldsLegacy({ fields, bits }) {
    let packedFields = [];
    while (bits.length > 0) {
        let fieldBits = bits.splice(0, field_bigint_js_1.sizeInBits - 1);
        let field = field_bigint_js_1.Field.fromBits(fieldBits);
        packedFields.push(field);
    }
    return fields.concat(packedFields);
}
exports.packToFieldsLegacy = packToFieldsLegacy;
function inputToBitsLegacy({ fields, bits }) {
    let fieldBits = fields.map(field_bigint_js_1.Field.toBits).flat();
    return fieldBits.concat(bits);
}
exports.inputToBitsLegacy = inputToBitsLegacy;
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
exports.HashInputLegacy = HashInputLegacy;
