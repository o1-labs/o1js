"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldToField3 = exports.compareCompatible = exports.isOddAndHigh = exports.lessThanOrEqualFull = exports.lessThanFull = exports.assertLessThanOrEqualFull = exports.assertLessThanFull = exports.lessThanOrEqualGeneric = exports.lessThanGeneric = exports.assertLessThanOrEqualGeneric = exports.assertLessThanGeneric = void 0;
const field_constructor_js_1 = require("../core/field-constructor.js");
const finite_field_js_1 = require("../../../bindings/crypto/finite-field.js");
const assert_js_1 = require("../../../lib/util/assert.js");
const exists_js_1 = require("../core/exists.js");
const compatible_js_1 = require("./compatible.js");
const foreign_field_js_1 = require("./foreign-field.js");
const range_check_js_1 = require("./range-check.js");
const witness_js_1 = require("../types/witness.js");
/**
 * Prove x <= y assuming 0 <= x, y < c.
 * The upper bound c must satisfy 2c <= p, where p is the field order.
 *
 * Expects a function `rangeCheck(v: Field)` which proves that v is in [0, p-c).
 * (Note: the range check on v can be looser than the assumption on x and y, but it doesn't have to be)
 * The efficiency of the gadget largely depends on the efficiency of `rangeCheck()`.
 *
 * **Warning:** The gadget does not prove x <= y if either 2c > p or x or y are not in [0, c).
 * Neither of these conditions are enforced by the gadget.
 */
function assertLessThanOrEqualGeneric(x, y, rangeCheck) {
    // since 0 <= x, y < c, we have y - x in [0, c) u (p-c, p)
    // because of c <= p-c, the two ranges are disjoint. therefore,
    // y - x in [0, p-c) is equivalent to x <= y
    rangeCheck(y.sub(x).seal());
}
exports.assertLessThanOrEqualGeneric = assertLessThanOrEqualGeneric;
/**
 * Prove x < y assuming 0 <= x, y < c.
 *
 * Assumptions are the same as in {@link assertLessThanOrEqualGeneric}.
 */
function assertLessThanGeneric(x, y, rangeCheck) {
    // since 0 <= x, y < c, we have y - 1 - x in [0, c) u [p-c, p)
    // because of c <= p-c, the two ranges are disjoint. therefore,
    // y - 1 - x in [0, p-c) is equivalent to x <= y - 1 which is equivalent to x < y
    rangeCheck(y.sub(1).sub(x).seal());
}
exports.assertLessThanGeneric = assertLessThanGeneric;
/**
 * Return a Bool b that is true if and only if x < y.
 *
 * Assumptions are similar as in {@link assertLessThanOrEqualGeneric}, with some important differences:
 * - c is a required input
 * - the `rangeCheck` function must fully prove that its input is in [0, c)
 */
function lessThanGeneric(x, y, c, rangeCheck) {
    // we prove that there exists b such that b*c + x - y is in [0, c)
    // if b = 0, this implies x - y is in [0, c), and so x >= y
    // if b = 1, this implies x - y is in [p-c, p), and so x < y because p-c >= c
    let b = (0, exists_js_1.existsOne)(() => BigInt(x.toBigInt() < y.toBigInt()));
    let isLessThan = b.assertBool();
    // b*c + x - y in [0, c)
    rangeCheck(b.mul(c).add(x).sub(y).seal());
    return isLessThan;
}
exports.lessThanGeneric = lessThanGeneric;
/**
 * Return a Bool b that is true if and only if x <= y.
 *
 * Assumptions are similar as in {@link assertLessThanOrEqualGeneric}, with some important differences:
 * - c is a required input
 * - the `rangeCheck` function must fully prove that its input is in [0, c)
 */
function lessThanOrEqualGeneric(x, y, c, rangeCheck) {
    // we prove that there exists b such that b*c + x - y - 1 is in [0, c)
    // if b = 0, this implies x - y - 1 is in [0, c), and so x > y
    // if b = 1, this implies x - y - 1 is in [p-c, p), and so x <= y because p-c >= c
    let b = (0, exists_js_1.existsOne)(() => BigInt(x.toBigInt() <= y.toBigInt()));
    let isLessThanOrEqual = b.assertBool();
    // b*c + x - y - 1 in [0, c)
    rangeCheck(b.mul(c).add(x).sub(y).sub(1).seal());
    return isLessThanOrEqual;
}
exports.lessThanOrEqualGeneric = lessThanOrEqualGeneric;
/**
 * Assert that x < y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function assertLessThanFull(x, y) {
    let xBig = fieldToField3(x);
    let yBig = fieldToField3(y);
    // x < y as bigints
    foreign_field_js_1.ForeignField.assertLessThan(xBig, yBig);
    // y < p, so y is canonical. implies x < p as well.
    // (if we didn't do this check, we would prove nothing.
    // e.g. yBig could be the bigint representation of y + p, and only _therefore_ larger than xBig)
    foreign_field_js_1.ForeignField.assertLessThan(yBig, finite_field_js_1.Fp.modulus);
}
exports.assertLessThanFull = assertLessThanFull;
/**
 * Assert that x <= y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function assertLessThanOrEqualFull(x, y) {
    let xBig = fieldToField3(x);
    let yBig = fieldToField3(y);
    foreign_field_js_1.ForeignField.assertLessThanOrEqual(xBig, yBig);
    foreign_field_js_1.ForeignField.assertLessThan(yBig, finite_field_js_1.Fp.modulus);
}
exports.assertLessThanOrEqualFull = assertLessThanOrEqualFull;
/**
 * Return a Bool b that is true if and only if x < y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function lessThanFull(x, y) {
    // same logic as in lessThanGeneric:
    // we witness b such that b*p + x - y is in [0, p), where the sum is done in bigint arithmetic
    // if b = 0, x - y is in [0, p), and so x >= y
    // if b = 1, x - y is in [-p, 0), and so x < y
    // we must also check that both x and y are canonical, or else the connection between the bigint and the Field is lost
    let b = (0, exists_js_1.existsOne)(() => BigInt(x.toBigInt() < y.toBigInt()));
    let isLessThan = b.assertBool();
    let xBig = fieldToField3(x);
    let yBig = fieldToField3(y);
    foreign_field_js_1.ForeignField.assertLessThan(xBig, finite_field_js_1.Fp.modulus);
    foreign_field_js_1.ForeignField.assertLessThan(yBig, finite_field_js_1.Fp.modulus);
    let [p0, p1, p2] = foreign_field_js_1.Field3.from(finite_field_js_1.Fp.modulus);
    let bTimesP = [p0.mul(b), p1.mul(b), p2.mul(b)];
    // b*p + x - y in [0, p)
    let z = foreign_field_js_1.ForeignField.sum([bTimesP, xBig, yBig], [1n, -1n], 0n);
    foreign_field_js_1.ForeignField.assertLessThan(z, finite_field_js_1.Fp.modulus);
    return isLessThan;
}
exports.lessThanFull = lessThanFull;
/**
 * Return a Bool b that is true if and only if x <= y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function lessThanOrEqualFull(x, y) {
    // keep it simple and just use x <= y <=> !(y < x)
    return lessThanFull(y, x).not();
}
exports.lessThanOrEqualFull = lessThanOrEqualFull;
/**
 * Splits a field element into a low bit `isOdd` and a 254-bit `high` part.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function isOddAndHigh(x) {
    if (x.isConstant()) {
        let x0 = x.toBigInt();
        return { isOdd: (0, field_constructor_js_1.createBool)((x0 & 1n) === 1n), high: (0, field_constructor_js_1.createField)(x0 >> 1n) };
    }
    // witness a bit b such that x = b + 2z for some z <= (p-1)/2
    // this is always possible, and unique _except_ in the edge case where x = 0 = 0 + 2*0 = 1 + 2*(p-1)/2
    // so we must assert that x = 0 implies b = 0
    let [b, z] = (0, exists_js_1.exists)(2, () => {
        let x0 = x.toBigInt();
        return [x0 & 1n, x0 >> 1n];
    });
    let isOdd = b.assertBool();
    z.assertLessThan((finite_field_js_1.Fp.modulus + 1n) / 2n);
    // x == b + 2z
    b.add(z.mul(2n)).assertEquals(x);
    // prevent overflow case when x = 0
    // we witness x' such that b == x * x', which makes it impossible to have x = 0 and b = 1
    let x_ = (0, exists_js_1.existsOne)(() => (b.toBigInt() === 0n ? 0n : finite_field_js_1.Fp.inverse(x.toBigInt()) ?? 0n));
    x.mul(x_).assertEquals(b);
    return { isOdd, high: z };
}
exports.isOddAndHigh = isOddAndHigh;
/**
 * internal helper, split Field into a 3-limb bigint
 *
 * **Warning:** the output is underconstrained up to a multiple of the modulus that could be added to the bigint.
 */
function fieldToField3(x) {
    if (x.isConstant())
        return foreign_field_js_1.Field3.from(x.toBigInt());
    let xBig = (0, witness_js_1.witness)(foreign_field_js_1.Field3, () => x.toBigInt());
    (0, range_check_js_1.multiRangeCheck)(xBig);
    let [x0, x1, x2] = xBig;
    // prove that x == x0 + x1*2^l + x2*2^2l
    let x_ = x0.add(x1.mul(1n << range_check_js_1.l)).add(x2.mul(1n << range_check_js_1.l2));
    x_.assertEquals(x);
    return xBig;
}
exports.fieldToField3 = fieldToField3;
/**
 * Compare x and y assuming both have at most `n` bits.
 *
 * **Important:** If `x` and `y` have more than `n` bits, this doesn't prove the comparison correctly.
 * It is up to the caller to prove that `x` and `y` have at most `n` bits.
 *
 * **Warning:** This was created for 1:1 compatibility with snarky's `compare` gadget.
 * It was designed for R1CS and is extremely inefficient when used with plonkish arithmetization.
 */
function compareCompatible(x, y, n = finite_field_js_1.Fp.sizeInBits - 2) {
    let maxLength = finite_field_js_1.Fp.sizeInBits - 2;
    (0, assert_js_1.assert)(n <= maxLength, `bitLength must be at most ${maxLength}`);
    // z = 2^n + y - x
    let z = (0, field_constructor_js_1.createField)(1n << BigInt(n))
        .add(y)
        .sub(x);
    let zBits = unpack(z, n + 1);
    // highest (n-th) bit tells us if z >= 2^n
    // which is equivalent to x <= y
    let lessOrEqual = zBits[n];
    // other bits tell us if x = y
    let prefix = zBits.slice(0, n);
    let notAllZeros = any(prefix);
    let less = lessOrEqual.and(notAllZeros);
    return { lessOrEqual, less };
}
exports.compareCompatible = compareCompatible;
// helper functions for `compareCompatible()`
// custom version of toBits to be compatible
function unpack(x, length) {
    let bits = (0, exists_js_1.exists)(length, () => {
        let x0 = x.toBigInt();
        return Array.from({ length }, (_, k) => (x0 >> BigInt(k)) & 1n);
    });
    bits.forEach((b) => b.assertBool());
    let lc = bits.reduce((acc, b, i) => acc.add(b.mul(1n << BigInt(i))), (0, field_constructor_js_1.createField)(0));
    (0, compatible_js_1.assertMul)(lc, (0, field_constructor_js_1.createField)(1), x);
    return bits.map((b) => (0, field_constructor_js_1.createBoolUnsafe)(b));
}
function any(xs) {
    let sum = xs.reduce((a, b) => a.add(b.toField()), (0, field_constructor_js_1.createField)(0));
    let allZero = isZero(sum);
    return allZero.not();
}
// custom isZero to be compatible
function isZero(x) {
    // create witnesses z = 1/x (or z=0 if x=0), and b = 1 - zx
    let [b, z] = (0, exists_js_1.exists)(2, () => {
        let xmy = x.toBigInt();
        let z = finite_field_js_1.Fp.inverse(xmy) ?? 0n;
        let b = finite_field_js_1.Fp.sub(1n, finite_field_js_1.Fp.mul(z, xmy));
        return [b, z];
    });
    // b * x === 0
    (0, compatible_js_1.assertMul)(b, x, (0, field_constructor_js_1.createField)(0));
    // z * x === 1 - b
    (0, compatible_js_1.assertMul)(z, x, (0, field_constructor_js_1.createField)(1).sub(b));
    return (0, field_constructor_js_1.createBoolUnsafe)(b);
}
