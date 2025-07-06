"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkField = exports.checkRange = exports.sizeInBits = exports.pseudoClass = exports.SignableFp = exports.BinableFp = exports.Sign = exports.UInt64 = exports.UInt32 = exports.Bool = exports.Field = void 0;
const random_js_1 = require("../../bindings/crypto/random.js");
const finite_field_js_1 = require("../../bindings/crypto/finite-field.js");
const derivers_bigint_js_1 = require("./derivers-bigint.js");
const sizeInBits = finite_field_js_1.Fp.sizeInBits;
exports.sizeInBits = sizeInBits;
const minusOne = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;
const checkField = checkRange(0n, finite_field_js_1.Fp.modulus, 'Field');
exports.checkField = checkField;
const checkBool = checkAllowList(new Set([0n, 1n]), 'Bool');
const checkBoolBytes = checkAllowList(new Set([0, 1]), 'Bool');
const checkSign = checkAllowList(new Set([1n, minusOne]), 'Sign');
const BinableFp = (0, derivers_bigint_js_1.BinableBigint)(finite_field_js_1.Fp.sizeInBits, checkField);
exports.BinableFp = BinableFp;
const SignableFp = (0, derivers_bigint_js_1.SignableBigint)(checkField);
exports.SignableFp = SignableFp;
/**
 * The base field of the Pallas curve
 */
const Field = pseudoClass(function Field(value) {
    return (0, finite_field_js_1.mod)(BigInt(value), finite_field_js_1.Fp.modulus);
}, { ...SignableFp, ...BinableFp, ...finite_field_js_1.Fp, toBigint: (x) => x });
exports.Field = Field;
/**
 * A field element which is either 0 or 1
 */
const Bool = pseudoClass(function Bool(value) {
    return value;
}, {
    ...(0, derivers_bigint_js_1.BinableBool)(checkBoolBytes),
    fromBigint(x) {
        checkBool(x);
        return x === 0n ? false : true;
    },
    toBigint(x) {
        return x ? 1n : 0n;
    },
    toInput(x) {
        return { fields: [], packed: [[Bool.toBigint(x), 1]] };
    },
    toBoolean(x) {
        return x;
    },
    toJSON(x) {
        return x;
    },
    fromJSON(b) {
        return b;
    },
    empty() {
        return false;
    },
    sizeInBytes: 1,
    fromField(x) {
        return Bool.fromBigint(x);
    },
});
exports.Bool = Bool;
function Unsigned(bits) {
    let maxValue = (1n << BigInt(bits)) - 1n;
    let checkUnsigned = checkRange(0n, 1n << BigInt(bits), `UInt${bits}`);
    let binable = (0, derivers_bigint_js_1.BinableBigint)(bits, checkUnsigned);
    let bytes = Math.ceil(bits / 8);
    return pseudoClass(function Unsigned(value) {
        let x = BigInt(value);
        checkUnsigned(x);
        return x;
    }, {
        ...(0, derivers_bigint_js_1.SignableBigint)(checkUnsigned),
        ...binable,
        toInput(x) {
            return { fields: [], packed: [[x, bits]] };
        },
        maxValue,
        random() {
            return binable.fromBytes([...(0, random_js_1.randomBytes)(bytes)]);
        },
    });
}
const UInt32 = Unsigned(32);
exports.UInt32 = UInt32;
const UInt64 = Unsigned(64);
exports.UInt64 = UInt64;
const Sign = pseudoClass(function Sign(value) {
    if (value !== 1 && value !== -1)
        throw Error('Sign: input must be 1 or -1.');
    return (0, finite_field_js_1.mod)(BigInt(value), finite_field_js_1.Fp.modulus);
}, {
    ...(0, derivers_bigint_js_1.SignableBigint)(checkSign),
    ...(0, derivers_bigint_js_1.BinableBigint)(1, checkSign),
    empty() {
        return 1n;
    },
    toInput(x) {
        return { fields: [], packed: [[x === 1n ? 1n : 0n, 1]] };
    },
    fromFields([x]) {
        if (x === 0n)
            return 1n;
        checkSign(x);
        return x;
    },
    toJSON(x) {
        return x === 1n ? 'Positive' : 'Negative';
    },
    fromJSON(x) {
        if (x !== 'Positive' && x !== 'Negative')
            throw Error('Sign: invalid input');
        return x === 'Positive' ? 1n : minusOne;
    },
});
exports.Sign = Sign;
// helper
function pseudoClass(constructor, module) {
    return Object.assign(constructor, module);
}
exports.pseudoClass = pseudoClass;
// validity checks
function checkRange(lower, upper, name) {
    return (x) => {
        if (x < lower)
            throw Error(`${name}: inputs smaller than ${lower} are not allowed, got ${x}`);
        if (x >= upper)
            throw Error(`${name}: inputs larger than ${upper - 1n} are not allowed, got ${x}`);
    };
}
exports.checkRange = checkRange;
function checkAllowList(valid, name) {
    return (x) => {
        if (!valid.has(x)) {
            throw Error(`${name}: input must be one of ${[...valid].join(', ')}, got ${x}`);
        }
    };
}
