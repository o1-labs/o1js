import type { Field } from '../field.js';
import type { Bool } from '../bool.js';
import { createBool, createBoolUnsafe, createField } from '../core/field-constructor.js';
import { Fp } from '../../../bindings/crypto/finite-field.js';
import { assert } from '../../../lib/util/assert.js';
import { exists, existsOne } from '../core/exists.js';
import { assertMul } from './compatible.js';
import { Field3, ForeignField } from './foreign-field.js';
import { l, l2, multiRangeCheck } from './range-check.js';
import { witness } from '../types/witness.js';

export {
  // generic comparison gadgets for inputs in a narrower range < p/2
  assertLessThanGeneric,
  assertLessThanOrEqualGeneric,
  lessThanGeneric,
  lessThanOrEqualGeneric,

  // comparison gadgets for full range inputs
  assertLessThanFull,
  assertLessThanOrEqualFull,
  lessThanFull,
  lessThanOrEqualFull,

  // gadgets that are based on full comparisons
  isOddAndHigh,

  // legacy, unused
  compareCompatible,

  // internal helper
  fieldToField3,
};

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
function assertLessThanOrEqualGeneric(x: Field, y: Field, rangeCheck: (v: Field) => void) {
  // since 0 <= x, y < c, we have y - x in [0, c) u (p-c, p)
  // because of c <= p-c, the two ranges are disjoint. therefore,
  // y - x in [0, p-c) is equivalent to x <= y
  rangeCheck(y.sub(x).seal());
}

/**
 * Prove x < y assuming 0 <= x, y < c.
 *
 * Assumptions are the same as in {@link assertLessThanOrEqualGeneric}.
 */
function assertLessThanGeneric(x: Field, y: Field, rangeCheck: (v: Field) => void) {
  // since 0 <= x, y < c, we have y - 1 - x in [0, c) u [p-c, p)
  // because of c <= p-c, the two ranges are disjoint. therefore,
  // y - 1 - x in [0, p-c) is equivalent to x <= y - 1 which is equivalent to x < y
  rangeCheck(y.sub(1).sub(x).seal());
}

/**
 * Return a Bool b that is true if and only if x < y.
 *
 * Assumptions are similar as in {@link assertLessThanOrEqualGeneric}, with some important differences:
 * - c is a required input
 * - the `rangeCheck` function must fully prove that its input is in [0, c)
 */
function lessThanGeneric(x: Field, y: Field, c: bigint, rangeCheck: (v: Field) => void) {
  // we prove that there exists b such that b*c + x - y is in [0, c)
  // if b = 0, this implies x - y is in [0, c), and so x >= y
  // if b = 1, this implies x - y is in [p-c, p), and so x < y because p-c >= c
  let b = existsOne(() => BigInt(x.toBigInt() < y.toBigInt()));
  let isLessThan = b.assertBool();

  // b*c + x - y in [0, c)
  rangeCheck(b.mul(c).add(x).sub(y).seal());

  return isLessThan;
}

/**
 * Return a Bool b that is true if and only if x <= y.
 *
 * Assumptions are similar as in {@link assertLessThanOrEqualGeneric}, with some important differences:
 * - c is a required input
 * - the `rangeCheck` function must fully prove that its input is in [0, c)
 */
function lessThanOrEqualGeneric(x: Field, y: Field, c: bigint, rangeCheck: (v: Field) => void) {
  // we prove that there exists b such that b*c + x - y - 1 is in [0, c)
  // if b = 0, this implies x - y - 1 is in [0, c), and so x > y
  // if b = 1, this implies x - y - 1 is in [p-c, p), and so x <= y because p-c >= c
  let b = existsOne(() => BigInt(x.toBigInt() <= y.toBigInt()));
  let isLessThanOrEqual = b.assertBool();

  // b*c + x - y - 1 in [0, c)
  rangeCheck(b.mul(c).add(x).sub(y).sub(1).seal());

  return isLessThanOrEqual;
}

/**
 * Assert that x < y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function assertLessThanFull(x: Field, y: Field) {
  let xBig = fieldToField3(x);
  let yBig = fieldToField3(y);

  // x < y as bigints
  ForeignField.assertLessThan(xBig, yBig);

  // y < p, so y is canonical. implies x < p as well.
  // (if we didn't do this check, we would prove nothing.
  // e.g. yBig could be the bigint representation of y + p, and only _therefore_ larger than xBig)
  ForeignField.assertLessThan(yBig, Fp.modulus);
}

/**
 * Assert that x <= y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function assertLessThanOrEqualFull(x: Field, y: Field) {
  let xBig = fieldToField3(x);
  let yBig = fieldToField3(y);
  ForeignField.assertLessThanOrEqual(xBig, yBig);
  ForeignField.assertLessThan(yBig, Fp.modulus);
}

/**
 * Return a Bool b that is true if and only if x < y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function lessThanFull(x: Field, y: Field) {
  // same logic as in lessThanGeneric:
  // we witness b such that b*p + x - y is in [0, p), where the sum is done in bigint arithmetic
  // if b = 0, x - y is in [0, p), and so x >= y
  // if b = 1, x - y is in [-p, 0), and so x < y
  // we must also check that both x and y are canonical, or else the connection between the bigint and the Field is lost
  let b = existsOne(() => BigInt(x.toBigInt() < y.toBigInt()));
  let isLessThan = b.assertBool();

  let xBig = fieldToField3(x);
  let yBig = fieldToField3(y);
  ForeignField.assertLessThan(xBig, Fp.modulus);
  ForeignField.assertLessThan(yBig, Fp.modulus);

  let [p0, p1, p2] = Field3.from(Fp.modulus);
  let bTimesP: Field3 = [p0.mul(b), p1.mul(b), p2.mul(b)];

  // b*p + x - y in [0, p)
  let z = ForeignField.sum([bTimesP, xBig, yBig], [1n, -1n], 0n);
  ForeignField.assertLessThan(z, Fp.modulus);

  return isLessThan;
}

/**
 * Return a Bool b that is true if and only if x <= y.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function lessThanOrEqualFull(x: Field, y: Field) {
  // keep it simple and just use x <= y <=> !(y < x)
  return lessThanFull(y, x).not();
}

/**
 * Splits a field element into a low bit `isOdd` and a 254-bit `high` part.
 *
 * There are no assumptions on the range of x and y, they can occupy the full range [0, p).
 */
function isOddAndHigh(x: Field) {
  if (x.isConstant()) {
    let x0 = x.toBigInt();
    return { isOdd: createBool((x0 & 1n) === 1n), high: createField(x0 >> 1n) };
  }

  // witness a bit b such that x = b + 2z for some z <= (p-1)/2
  // this is always possible, and unique _except_ in the edge case where x = 0 = 0 + 2*0 = 1 + 2*(p-1)/2
  // so we must assert that x = 0 implies b = 0
  let [b, z] = exists(2, () => {
    let x0 = x.toBigInt();
    return [x0 & 1n, x0 >> 1n];
  });
  let isOdd = b.assertBool();
  z.assertLessThan((Fp.modulus + 1n) / 2n);

  // x == b + 2z
  b.add(z.mul(2n)).assertEquals(x);

  // prevent overflow case when x = 0
  // we witness x' such that b == x * x', which makes it impossible to have x = 0 and b = 1
  let x_ = existsOne(() => (b.toBigInt() === 0n ? 0n : Fp.inverse(x.toBigInt()) ?? 0n));
  x.mul(x_).assertEquals(b);

  return { isOdd, high: z };
}

/**
 * internal helper, split Field into a 3-limb bigint
 *
 * **Warning:** the output is underconstrained up to a multiple of the modulus that could be added to the bigint.
 */
function fieldToField3(x: Field) {
  if (x.isConstant()) return Field3.from(x.toBigInt());

  let xBig = witness(Field3, () => x.toBigInt());
  multiRangeCheck(xBig);
  let [x0, x1, x2] = xBig;

  // prove that x == x0 + x1*2^l + x2*2^2l
  let x_ = x0.add(x1.mul(1n << l)).add(x2.mul(1n << l2));
  x_.assertEquals(x);
  return xBig;
}

/**
 * Compare x and y assuming both have at most `n` bits.
 *
 * **Important:** If `x` and `y` have more than `n` bits, this doesn't prove the comparison correctly.
 * It is up to the caller to prove that `x` and `y` have at most `n` bits.
 *
 * **Warning:** This was created for 1:1 compatibility with snarky's `compare` gadget.
 * It was designed for R1CS and is extremely inefficient when used with plonkish arithmetization.
 */
function compareCompatible(x: Field, y: Field, n = Fp.sizeInBits - 2) {
  let maxLength = Fp.sizeInBits - 2;
  assert(n <= maxLength, `bitLength must be at most ${maxLength}`);

  // z = 2^n + y - x
  let z = createField(1n << BigInt(n))
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

// helper functions for `compareCompatible()`

// custom version of toBits to be compatible
function unpack(x: Field, length: number) {
  let bits = exists(length, () => {
    let x0 = x.toBigInt();
    return Array.from({ length }, (_, k) => (x0 >> BigInt(k)) & 1n);
  });
  bits.forEach((b) => b.assertBool());
  let lc = bits.reduce((acc, b, i) => acc.add(b.mul(1n << BigInt(i))), createField(0));
  assertMul(lc, createField(1), x);
  return bits.map((b) => createBoolUnsafe(b));
}

function any(xs: Bool[]) {
  let sum = xs.reduce((a, b) => a.add(b.toField()), createField(0));
  let allZero = isZero(sum);
  return allZero.not();
}

// custom isZero to be compatible
function isZero(x: Field): Bool {
  // create witnesses z = 1/x (or z=0 if x=0), and b = 1 - zx
  let [b, z] = exists(2, () => {
    let xmy = x.toBigInt();
    let z = Fp.inverse(xmy) ?? 0n;
    let b = Fp.sub(1n, Fp.mul(z, xmy));
    return [b, z];
  });
  // b * x === 0
  assertMul(b, x, createField(0));
  // z * x === 1 - b
  assertMul(z, x, createField(1).sub(b));
  return createBoolUnsafe(b);
}
