"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConstant = exports.packBits = exports.divideWithRemainder = exports.bit = exports.bitSlice = exports.assert = exports.isVar = exports.toVar = exports.toVars = void 0;
const fieldvar_js_1 = require("../core/fieldvar.js");
const types_js_1 = require("../../util/types.js");
const gates_js_1 = require("../gates.js");
const exists_js_1 = require("../core/exists.js");
const field_constructor_js_1 = require("../core/field-constructor.js");
/**
 * @internal
 * Given a Field, collapse its AST to a pure Var. See {@link FieldVar}.
 *
 * This is useful to prevent rogue Generic gates added in the middle of gate chains,
 * which are caused by snarky auto-resolving constants, adds and scales to vars.
 *
 * Same as `Field.seal()` with the difference that `seal()` leaves constants as is.
 */
function toVar(x_) {
    let x = (0, field_constructor_js_1.createField)(x_);
    // don't change existing vars
    if (isVar(x))
        return x;
    let xVar = (0, exists_js_1.existsOne)(() => x.toBigInt());
    xVar.assertEquals(x);
    return xVar;
}
exports.toVar = toVar;
function isVar(x) {
    return fieldvar_js_1.FieldVar.isVar((0, gates_js_1.fieldVar)(x));
}
exports.isVar = isVar;
/**
 * Apply {@link toVar} to each element of a tuple.
 */
function toVars(fields) {
    return types_js_1.Tuple.map(fields, toVar);
}
exports.toVars = toVars;
/**
 * Assert that a statement is true. If the statement is false, throws an error with the given message.
 * Can be used in provable code.
 */
function assert(stmt, message) {
    if (typeof stmt === 'boolean') {
        if (!stmt)
            throw Error(message ?? 'Assertion failed');
    }
    else {
        stmt.assertTrue(message ?? 'Assertion failed');
    }
}
exports.assert = assert;
function bitSlice(x, start, length) {
    return (x >> BigInt(start)) & ((1n << BigInt(length)) - 1n);
}
exports.bitSlice = bitSlice;
function bit(x, i) {
    return (x >> BigInt(i)) & 1n;
}
exports.bit = bit;
function divideWithRemainder(numerator, denominator) {
    const quotient = numerator / denominator;
    const remainder = numerator - denominator * quotient;
    return { quotient, remainder };
}
exports.divideWithRemainder = divideWithRemainder;
// pack bools into a single field element
/**
 * Helper function to provably pack bits into a single field element.
 * Just returns the sum without any boolean checks.
 */
function packBits(bits) {
    let n = bits.length;
    let sum = (0, field_constructor_js_1.createField)(0n);
    for (let i = 0; i < n; i++) {
        let bit = bits[i];
        if ((0, field_constructor_js_1.isBool)(bit))
            bit = bit.toField();
        sum = sum.add(bit.mul(1n << BigInt(i)));
    }
    return sum.seal();
}
exports.packBits = packBits;
function isConstant(...args) {
    return args.every((x) => x.isConstant());
}
exports.isConstant = isConstant;
