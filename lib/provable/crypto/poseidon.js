"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Sponge_sponge;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHashable = exports.hashConstant = exports.emptyReceiptChainHash = exports.packToFields = exports.salt = exports.hashWithPrefix = exports.emptyHashWithPrefix = exports.HashHelpers = exports.HashInput = exports.TokenSymbol = exports.Poseidon = void 0;
const struct_js_1 = require("../types/struct.js");
Object.defineProperty(exports, "HashInput", { enumerable: true, get: function () { return struct_js_1.HashInput; } });
const bindings_js_1 = require("../../../bindings.js");
const wrapped_js_1 = require("../wrapped.js");
const hash_generic_js_1 = require("./hash-generic.js");
const provable_js_1 = require("../provable.js");
const fields_js_1 = require("../../ml/fields.js");
const poseidon_js_1 = require("../../../bindings/crypto/poseidon.js");
const errors_js_1 = require("../../util/errors.js");
const range_check_js_1 = require("../gadgets/range-check.js");
const types_js_1 = require("../../util/types.js");
const group_js_1 = require("../group.js");
const provable_intf_js_1 = require("../types/provable-intf.js");
const binable_js_1 = require("../../../bindings/lib/binable.js");
class Sponge {
    // TODO: implement constant version in TS. currently, you need to call `initializeBindings()` before successfully calling this
    constructor() {
        _Sponge_sponge.set(this, void 0);
        let isChecked = provable_js_1.Provable.inCheckedComputation();
        (0, errors_js_1.assert)(bindings_js_1.Snarky !== undefined, 'Poseidon.Sponge(): bindings are not initialized, try calling `await initializeBindings()` first.');
        __classPrivateFieldSet(this, _Sponge_sponge, bindings_js_1.Snarky.poseidon.sponge.create(isChecked), "f");
    }
    absorb(x) {
        bindings_js_1.Snarky.poseidon.sponge.absorb(__classPrivateFieldGet(this, _Sponge_sponge, "f"), x.value);
    }
    squeeze() {
        return (0, wrapped_js_1.Field)(bindings_js_1.Snarky.poseidon.sponge.squeeze(__classPrivateFieldGet(this, _Sponge_sponge, "f")));
    }
}
_Sponge_sponge = new WeakMap();
const Poseidon = {
    hash(input) {
        if (isConstant(input)) {
            return (0, wrapped_js_1.Field)(poseidon_js_1.Poseidon.hash(toBigints(input)));
        }
        return Poseidon.update(Poseidon.initialState(), input)[0];
    },
    update(state, input) {
        if (isConstant(state) && isConstant(input)) {
            let newState = poseidon_js_1.Poseidon.update(toBigints(state), toBigints(input));
            return types_js_1.TupleN.fromArray(3, newState.map(wrapped_js_1.Field));
        }
        let newState = bindings_js_1.Snarky.poseidon.update(fields_js_1.MlFieldArray.to(state), fields_js_1.MlFieldArray.to(input));
        return fields_js_1.MlFieldArray.from(newState);
    },
    hashWithPrefix(prefix, input) {
        let init = Poseidon.update(Poseidon.initialState(), [prefixToField(prefix)]);
        return Poseidon.update(init, input)[0];
    },
    initialState() {
        return [(0, wrapped_js_1.Field)(0), (0, wrapped_js_1.Field)(0), (0, wrapped_js_1.Field)(0)];
    },
    Unsafe: {
        /**
         * Low-level version of `Poseidon.hashToGroup()`.
         *
         * **Warning**: This function is marked unsafe because its output is not deterministic.
         * It returns the square root of a value without constraining which of the two possible
         * square roots is chosen. This allows the prover to choose between two different hashes,
         * which can be a vulnerability if consuming code treats the output as unique.
         */
        hashToGroup(input) {
            if (isConstant(input)) {
                let result = poseidon_js_1.Poseidon.hashToGroup(toBigints(input));
                (0, errors_js_1.assert)(result !== undefined, 'hashToGroup works on all inputs');
                return new group_js_1.Group(result);
            }
            // y = sqrt(y^2)
            let [, x, y] = bindings_js_1.Snarky.poseidon.hashToGroup(fields_js_1.MlFieldArray.to(input));
            return new group_js_1.Group({ x, y });
        },
    },
    /**
     * Hashes a list of field elements to a point on the Pallas curve.
     *
     * The output point is deterministic and its discrete log is not efficiently computable.
     */
    hashToGroup(input) {
        if (isConstant(input))
            return Poseidon.Unsafe.hashToGroup(input);
        let { x, y } = Poseidon.Unsafe.hashToGroup(input);
        // the y coordinate is calculated using a square root, so it has two possible values
        // to make the output deterministic, we negate y if it is odd
        let sign = wrapped_js_1.Field.from(1n).sub(y.isOdd().toField().mul(2n)); // -1 is y is odd, 1 else
        y = y.mul(sign);
        return new group_js_1.Group({ x, y });
    },
    /**
     * Hashes a provable type efficiently.
     *
     * ```ts
     * let skHash = Poseidon.hashPacked(PrivateKey, secretKey);
     * ```
     *
     * Note: Instead of just doing `Poseidon.hash(value.toFields())`, this
     * uses the `toInput()` method on the provable type to pack the input into as few
     * field elements as possible. This saves constraints because packing has a much
     * lower per-field element cost than hashing.
     */
    hashPacked(type, value) {
        let input = provable_intf_js_1.ProvableType.get(type).toInput(value);
        let packed = packToFields(input);
        return Poseidon.hash(packed);
    },
    Sponge,
};
exports.Poseidon = Poseidon;
function hashConstant(input) {
    return (0, wrapped_js_1.Field)(poseidon_js_1.Poseidon.hash(toBigints(input)));
}
exports.hashConstant = hashConstant;
const HashHelpers = (0, hash_generic_js_1.createHashHelpers)(wrapped_js_1.Field, Poseidon);
exports.HashHelpers = HashHelpers;
let { salt, emptyHashWithPrefix, hashWithPrefix } = HashHelpers;
exports.salt = salt;
exports.emptyHashWithPrefix = emptyHashWithPrefix;
exports.hashWithPrefix = hashWithPrefix;
// same as Random_oracle.prefix_to_field in OCaml
function prefixToField(prefix) {
    if (prefix.length * 8 >= 255)
        throw Error('prefix too long');
    let bits = [...prefix]
        .map((char) => {
        // convert char to 8 bits
        let bits = [];
        for (let j = 0, c = char.charCodeAt(0); j < 8; j++, c >>= 1) {
            if (j === 7)
                (0, errors_js_1.assert)(c === 0, `Invalid character ${char}, only ASCII characters are supported.`);
            bits.push(!!(c & 1));
        }
        return bits;
    })
        .flat();
    return wrapped_js_1.Field.fromBits(bits);
}
/**
 * Convert the {fields, packed} hash input representation to a list of field elements
 * Random_oracle_input.Chunked.pack_to_fields
 */
function packToFields({ fields = [], packed = [] }) {
    if (packed.length === 0)
        return fields;
    let packedBits = [];
    let currentPackedField = (0, wrapped_js_1.Field)(0);
    let currentSize = 0;
    for (let [field, size] of packed) {
        currentSize += size;
        if (currentSize < 255) {
            currentPackedField = currentPackedField.mul((0, wrapped_js_1.Field)(1n << BigInt(size))).add(field);
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
function isHashable(obj) {
    if (!obj) {
        return false;
    }
    const hasToInput = 'toInput' in obj && typeof obj.toInput === 'function';
    const hasEmpty = 'empty' in obj && typeof obj.empty === 'function';
    return hasToInput && hasEmpty;
}
exports.isHashable = isHashable;
const TokenSymbolPure = {
    toFields({ field }) {
        return [field];
    },
    toAuxiliary(value) {
        return [value?.symbol ?? ''];
    },
    fromFields([field], [symbol]) {
        return { symbol, field };
    },
    sizeInFields() {
        return 1;
    },
    check({ field }) {
        (0, range_check_js_1.rangeCheckN)(48, field);
    },
    toValue({ symbol }) {
        return symbol;
    },
    fromValue(symbol) {
        if (typeof symbol !== 'string')
            return symbol;
        let bytesLength = new TextEncoder().encode(symbol).length;
        if (bytesLength > MAX_TOKEN_SYMBOL_LENGTH)
            throw Error(`Token symbol ${symbol} should be a maximum of ${MAX_TOKEN_SYMBOL_LENGTH} bytes, but is ${bytesLength}`);
        let field = prefixToField(symbol);
        return { symbol, field };
    },
    toJSON({ symbol }) {
        return symbol;
    },
    fromJSON(symbol) {
        let field = prefixToField(symbol);
        return { symbol, field };
    },
    toInput({ field }) {
        return { packed: [[field, 48]] };
    },
    empty() {
        return { symbol: '', field: (0, wrapped_js_1.Field)(0n) };
    },
};
const MAX_TOKEN_SYMBOL_LENGTH = 6;
class TokenSymbol extends (0, struct_js_1.Struct)(TokenSymbolPure) {
    constructor(symbol) {
        if (typeof symbol === 'object') {
            super({ symbol: symbol.symbol, field: symbol.field });
        }
        else {
            let bytesLength = (0, binable_js_1.stringLengthInBytes)(symbol);
            if (bytesLength > MAX_TOKEN_SYMBOL_LENGTH) {
                throw Error(`Token symbol ${symbol} should be a maximum of ${MAX_TOKEN_SYMBOL_LENGTH} bytes, but is ${bytesLength}`);
            }
            super({ symbol: symbol, field: prefixToField(symbol) });
        }
    }
    static from(value) {
        return TokenSymbol.fromValue(value);
    }
    static empty() {
        return new TokenSymbol('');
    }
}
exports.TokenSymbol = TokenSymbol;
function emptyReceiptChainHash() {
    return emptyHashWithPrefix('CodaReceiptEmpty');
}
exports.emptyReceiptChainHash = emptyReceiptChainHash;
function isConstant(fields) {
    return fields.every((x) => x.isConstant());
}
function toBigints(fields) {
    return fields.map((x) => x.toBigInt());
}
