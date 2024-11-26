/**
 * Foreign field arithmetic gadgets.
 */
import {
  inverse as modInverse,
  mod,
} from '../../../bindings/crypto/finite-field.js';
import { provableTuple } from '../types/provable-derivers.js';
import { Unconstrained } from '../types/unconstrained.js';
import type { Field } from '../field.js';
import { Gates, foreignFieldAdd } from '../gates.js';
import { exists } from '../core/exists.js';
import { modifiedField } from '../types/fields.js';
import { Tuple, TupleN } from '../../util/types.js';
import { assertOneOf } from './basic.js';
import { assert, bitSlice, toVar, toVars } from './common.js';
import {
  l,
  lMask,
  multiRangeCheck,
  l2,
  l2Mask,
  l3,
  compactMultiRangeCheck,
} from './range-check.js';
import {
  createBool,
  createField,
  getField,
} from '../core/field-constructor.js';
import type { Bool } from '../bool.js';
import { ProvablePureExtended } from '../types/struct.js';

// external API
export { ForeignField, Field3 };

// internal API
export {
  bigint3,
  Sign,
  split,
  combine,
  weakBound,
  Sum,
  assertMul,
  field3FromBits,
};

/**
 * A 3-tuple of Fields, representing a 3-limb bigint.
 */
type Field3 = [Field, Field, Field];
type bigint3 = [bigint, bigint, bigint];
type Sign = -1n | 1n;

const ForeignField = {
  add(x: Field3, y: Field3, f: bigint) {
    return sum([x, y], [1n], f);
  },
  sub(x: Field3, y: Field3, f: bigint) {
    return sum([x, y], [-1n], f);
  },
  negate(x: Field3, f: bigint) {
    return sum([Field3.from(0n), x], [-1n], f);
  },
  sum,
  Sum(x: Field3) {
    return new Sum(x);
  },

  mul: multiply,
  inv: inverse,
  div: divide,
  assertMul,

  assertAlmostReduced,

  assertLessThan,
  assertLessThanOrEqual,

  equals,
  toCanonical,
};

/**
 * computes x[0] + sign[0] * x[1] + ... + sign[n-1] * x[n] modulo f
 *
 * assumes that inputs are range checked, does range check on the result.
 */
function sum(x: Field3[], sign: Sign[], f: bigint) {
  assert(x.length === sign.length + 1, 'inputs and operators match');

  // constant case
  if (x.every(Field3.isConstant)) {
    let xBig = x.map(Field3.toBigint);
    let sum = sign.reduce((sum, s, i) => sum + s * xBig[i + 1], xBig[0]);
    return Field3.from(mod(sum, f));
  }
  // provable case - create chain of ffadd rows
  x = x.map(toVars);
  let result = x[0];
  for (let i = 0; i < sign.length; i++) {
    ({ result } = singleAdd(result, x[i + 1], sign[i], f));
  }
  // final zero row to hold result
  Gates.zero(...result);

  // range check result
  indirectMultiRangeChange(result);

  return result;
}

/**
 * core building block for non-native addition
 *
 * **warning**: this just adds the `foreignFieldAdd` row;
 * it _must_ be chained with a second row that holds the result in its first 3 cells.
 *
 * the second row could, for example, be `zero`, `foreignFieldMul`, or another `foreignFieldAdd`.
 */
function singleAdd(x: Field3, y: Field3, sign: Sign, f: bigint) {
  let f_ = split(f);

  let [r0, r1, r2, overflow, carry] = exists(5, () => {
    let x_ = toBigint3(x);
    let y_ = toBigint3(y);

    // figure out if there's overflow
    let r = combine(x_) + sign * combine(y_);
    let overflow = 0n;
    if (sign === 1n && r >= f) overflow = 1n;
    if (sign === -1n && r < 0n) overflow = -1n;
    if (f === 0n) overflow = 0n; // special case where overflow doesn't change anything

    // do the add with carry
    // note: this "just works" with negative r01
    let r01 = combine2(x_) + sign * combine2(y_) - overflow * combine2(f_);
    let carry = r01 >> l2;
    r01 &= l2Mask;
    let [r0, r1] = split2(r01);
    let r2 = x_[2] + sign * y_[2] - overflow * f_[2] + carry;

    return [r0, r1, r2, overflow, carry];
  });

  foreignFieldAdd({ left: x, right: y, overflow, carry, modulus: f_, sign });

  return { result: [r0, r1, r2] satisfies Field3, overflow };
}

function multiply(a: Field3, b: Field3, f: bigint): Field3 {
  assert(f < 1n << 259n, 'Foreign modulus fits in 259 bits');

  // constant case
  if (Field3.isConstant(a) && Field3.isConstant(b)) {
    let ab = Field3.toBigint(a) * Field3.toBigint(b);
    return Field3.from(mod(ab, f));
  }

  // provable case
  let { r01, r2, q } = multiplyNoRangeCheck(a, b, f);

  // limb range checks on quotient and remainder
  multiRangeCheck(q);
  let r = compactMultiRangeCheck(r01, r2);
  return r;
}

function inverse(x: Field3, f: bigint): Field3 {
  assert(f < 1n << 259n, 'Foreign modulus fits in 259 bits');

  // constant case
  if (Field3.isConstant(x)) {
    let xInv = modInverse(Field3.toBigint(x), f);
    assert(xInv !== undefined, 'inverse exists');
    return Field3.from(xInv);
  }

  // provable case
  let xInv = exists(3, () => {
    let xInv = modInverse(Field3.toBigint(x), f);
    return xInv === undefined ? [0n, 0n, 0n] : split(xInv);
  });
  multiRangeCheck(xInv);
  // we need to bound xInv because it's a multiplication input
  let xInv2Bound = weakBound(xInv[2], f);

  let one: Field2 = [createField(1n), createField(0n)];
  assertMulInternal(x, xInv, one, f);

  // range check on result bound
  // TODO: this uses two RCs too many.. need global RC stack
  multiRangeCheck([xInv2Bound, createField(0n), createField(0n)]);

  return xInv;
}

function divide(
  x: Field3,
  y: Field3,
  f: bigint,
  { allowZeroOverZero = false } = {}
) {
  assert(f < 1n << 259n, 'Foreign modulus fits in 259 bits');

  // constant case
  if (Field3.isConstant(x) && Field3.isConstant(y)) {
    let yInv = modInverse(Field3.toBigint(y), f);
    assert(yInv !== undefined, 'inverse exists');
    return Field3.from(mod(Field3.toBigint(x) * yInv, f));
  }

  // provable case
  // to show that z = x/y, we prove that z*y = x and y != 0 (the latter avoids the unconstrained 0/0 case)
  let z = exists(3, () => {
    let yInv = modInverse(Field3.toBigint(y), f);
    if (yInv === undefined) return [0n, 0n, 0n];
    return split(mod(Field3.toBigint(x) * yInv, f));
  });
  multiRangeCheck(z);
  let z2Bound = weakBound(z[2], f);
  assertMulInternal(z, y, x, f);

  // range check on result bound
  multiRangeCheck([z2Bound, createField(0n), createField(0n)]);

  if (!allowZeroOverZero) {
    ForeignField.equals(y, 0n, f).assertFalse();
  }
  return z;
}

/**
 * Common logic for gadgets that expect a certain multiplication result a priori, instead of just using the remainder.
 */
function assertMulInternal(
  x: Field3,
  y: Field3,
  xy: Field3 | Field2,
  f: bigint,
  message?: string
) {
  let { r01, r2, q } = multiplyNoRangeCheck(x, y, f);

  // range check on quotient
  multiRangeCheck(q);

  // bind remainder to input xy
  if (xy.length === 2) {
    let [xy01, xy2] = xy;
    r01.assertEquals(xy01, message);
    r2.assertEquals(xy2, message);
  } else {
    let xy01 = xy[0].add(xy[1].mul(1n << l));
    r01.assertEquals(xy01, message);
    r2.assertEquals(xy[2], message);
  }
}

/**
 * Core building block for all gadgets using foreign field multiplication.
 */
function multiplyNoRangeCheck(a: Field3, b: Field3, f: bigint) {
  // notation follows https://github.com/o1-labs/rfcs/blob/main/0006-ffmul-revised.md
  let f_ = (1n << l3) - f;
  let [f_0, f_1, f_2] = split(f_);
  let f2 = f >> l2;
  let f2Bound = (1n << l) - f2 - 1n;

  let witnesses = exists(21, () => {
    // convert inputs to bigints
    let [a0, a1, a2] = toBigint3(a);
    let [b0, b1, b2] = toBigint3(b);

    // compute q and r such that a*b = q*f + r
    let ab = combine([a0, a1, a2]) * combine([b0, b1, b2]);
    let q = ab / f;
    let r = ab - q * f;

    let [q0, q1, q2] = split(q);
    let [r0, r1, r2] = split(r);
    let r01 = combine2([r0, r1]);

    // compute product terms
    let p0 = a0 * b0 + q0 * f_0;
    let p1 = a0 * b1 + a1 * b0 + q0 * f_1 + q1 * f_0;
    let p2 = a0 * b2 + a1 * b1 + a2 * b0 + q0 * f_2 + q1 * f_1 + q2 * f_0;

    let [p10, p110, p111] = split(p1);
    let p11 = combine2([p110, p111]);

    // carry bottom limbs
    let c0 = (p0 + (p10 << l) - r01) >> l2;

    // carry top limb
    let c1 = (p2 - r2 + p11 + c0) >> l;

    // split high carry
    let c1_00 = bitSlice(c1, 0, 12);
    let c1_12 = bitSlice(c1, 12, 12);
    let c1_24 = bitSlice(c1, 24, 12);
    let c1_36 = bitSlice(c1, 36, 12);
    let c1_48 = bitSlice(c1, 48, 12);
    let c1_60 = bitSlice(c1, 60, 12);
    let c1_72 = bitSlice(c1, 72, 12);
    let c1_84 = bitSlice(c1, 84, 2);
    let c1_86 = bitSlice(c1, 86, 2);
    let c1_88 = bitSlice(c1, 88, 2);
    let c1_90 = bitSlice(c1, 90, 1);

    // quotient high bound
    let q2Bound = q2 + f2Bound;

    // prettier-ignore
    return [
      r01, r2,
      q0, q1, q2,
      q2Bound,
      p10, p110, p111,
      c0,
      c1_00, c1_12, c1_24, c1_36, c1_48, c1_60, c1_72,
      c1_84, c1_86, c1_88, c1_90,
    ];
  });

  // prettier-ignore
  let [
    r01, r2,
    q0, q1, q2,
    q2Bound,
    p10, p110, p111,
    c0,
    c1_00, c1_12, c1_24, c1_36, c1_48, c1_60, c1_72,
    c1_84, c1_86, c1_88, c1_90,
  ] = witnesses;

  let q: Field3 = [q0, q1, q2];

  // ffmul gate. this already adds the following zero row.
  Gates.foreignFieldMul({
    left: a,
    right: b,
    remainder: [r01, r2],
    quotient: q,
    quotientHiBound: q2Bound,
    product1: [p10, p110, p111],
    carry0: c0,
    carry1p: [c1_00, c1_12, c1_24, c1_36, c1_48, c1_60, c1_72],
    carry1c: [c1_84, c1_86, c1_88, c1_90],
    foreignFieldModulus2: f2,
    negForeignFieldModulus: [f_0, f_1, f_2],
  });

  // multi-range check on internal values
  multiRangeCheck([p10, p110, q2Bound]);

  // note: this function is supposed to be the most flexible interface to the ffmul gate.
  // that's why we don't add range checks on q and r here, because there are valid use cases
  // for not range-checking either of them -- for example, they could be wired to other
  // variables that are already range-checked, or to constants / public inputs.
  return { r01, r2, q };
}

function weakBound(x: Field, f: bigint) {
  // if f0, f1 === 0, we can use a stronger bound x[2] < f2
  // because this is true for all field elements x in [0,f)
  if ((f & l2Mask) === 0n) {
    return x.add(lMask + 1n - (f >> l2));
  }
  // otherwise, we use x[2] < f2 + 1, so we allow x[2] === f2
  return x.add(lMask - (f >> l2));
}

/**
 * Apply range checks and weak bounds checks to a list of Field3s.
 * Optimal if the list length is a multiple of 3.
 */
function assertAlmostReduced(xs: Field3[], f: bigint, skipMrc = false) {
  let bounds: Field[] = [];

  for (let x of xs) {
    if (!skipMrc) multiRangeCheck(x);

    bounds.push(weakBound(x[2], f));
    if (TupleN.hasLength(3, bounds)) {
      multiRangeCheck(bounds);
      bounds = [];
    }
  }
  if (TupleN.hasLength(1, bounds)) {
    multiRangeCheck([...bounds, createField(0n), createField(0n)]);
  }
  if (TupleN.hasLength(2, bounds)) {
    multiRangeCheck([...bounds, createField(0n)]);
  }
}

/**
 * check whether x = c mod f
 *
 * c is a constant, and we require c in [0, f)
 *
 * assumes that x is almost reduced mod f, so we know that x might be c or c + f, but not c + 2f, c + 3f, ...
 */
function equals(x: Field3, c: bigint, f: bigint) {
  assert(c >= 0n && c < f, 'equals: c must be in [0, f)');

  // constant case
  if (Field3.isConstant(x)) {
    return createBool(mod(Field3.toBigint(x), f) === c);
  }

  // provable case
  if (f >= 1n << l2) {
    // check whether x = 0 or x = f
    let x01 = toVar(x[0].add(x[1].mul(1n << l)));
    let [c01, c2] = [c & l2Mask, c >> l2];
    let [cPlusF01, cPlusF2] = [(c + f) & l2Mask, (c + f) >> l2];

    // (x01, x2) = (c01, c2)
    let isC = x01.equals(c01).and(x[2].equals(c2));
    // (x01, x2) = (cPlusF01, cPlusF2)
    let isCPlusF = x01.equals(cPlusF01).and(x[2].equals(cPlusF2));

    return isC.or(isCPlusF);
  } else {
    // if f < 2^2l, the approach above doesn't work (we don't know from x[2] = 0 that x < 2f),
    // so in that case we assert that x < f and then check whether it's equal to c
    ForeignField.assertLessThan(x, f);
    let x012 = toVar(x[0].add(x[1].mul(1n << l)).add(x[2].mul(1n << l2)));
    return x012.equals(c);
  }
}

/**
 * Convert x, which may be unreduced, to a canonical representative < f.
 *
 * Note: This method is complete, it works for all unreduced field elements.
 * It can therefore be used to protect against incompleteness of field operations in other places.
 */
function toCanonical(x: Field3, f: bigint) {
  // multiply by 1 to get reduced representative
  // note: this is sound because x < 2^3l << 2^3l p
  let xR = multiply(x, Field3.from(1n), f);

  // assert the result is canonical, and return it
  assertLessThan(xR, f);

  return xR;
}

const provableLimb = modifiedField({});

const Field3 = {
  /**
   * Turn a bigint into a 3-tuple of Fields
   */
  from(x: bigint | Field3): Field3 {
    if (Array.isArray(x)) return x;
    return Tuple.map(split(x), createField);
  },

  /**
   * Turn a 3-tuple of Fields into a bigint
   */
  toBigint(x: Field3): bigint {
    return combine(toBigint3(x));
  },

  /**
   * Turn several 3-tuples of Fields into bigints
   */
  toBigints<T extends Tuple<Field3>>(...xs: T) {
    return Tuple.map(xs, Field3.toBigint);
  },

  /**
   * Check whether a 3-tuple of Fields is constant
   */
  isConstant(x: Field3) {
    return x.every((x) => x.isConstant());
  },

  /**
   * `Provable<T>` interface for `Field3 = [Field, Field, Field]`.
   *
   * Note: Witnessing this creates a plain tuple of field elements without any implicit
   * range checks.
   */
  provable: {
    ...provableTuple([provableLimb, provableLimb, provableLimb]),
    toValue(x): bigint {
      return Field3.toBigint(x);
    },
    fromValue(x): Field3 {
      if (typeof x === 'bigint') return Field3.from(x);
      return x;
    },
  } satisfies ProvablePureExtended<Field3, bigint, [string, string, string]>,
};

type Field2 = [Field, Field];
const Field2 = {
  toBigint(x: Field2): bigint {
    return combine2(Tuple.map(x, (x) => x.toBigInt()));
  },
};

function toBigint3(x: Field3): bigint3 {
  return Tuple.map(x, (x) => x.toBigInt());
}

function combine([x0, x1, x2]: bigint3) {
  return x0 + (x1 << l) + (x2 << l2);
}
function split(x: bigint): bigint3 {
  return [x & lMask, (x >> l) & lMask, (x >> l2) & lMask];
}

function combine2([x0, x1]: bigint3 | [bigint, bigint]) {
  return x0 + (x1 << l);
}
function split2(x: bigint): [bigint, bigint] {
  return [x & lMask, (x >> l) & lMask];
}

/**
 * Optimized multiplication of sums, like (x + y)*z = a + b + c
 *
 * We use several optimizations over naive summing and then multiplying:
 *
 * - we skip the range check on the remainder sum, because ffmul is sound with r being a sum of range-checked values
 * - we replace the range check on the input sums with an extra low limb sum using generic gates
 * - we chain the first input's sum into the ffmul gate
 *
 * As usual, all values are assumed to be range checked, and the left and right multiplication inputs
 * are assumed to be bounded such that `l * r < 2^264 * (native modulus)`.
 * However, all extra checks that are needed on the _sums_ are handled here.
 */
function assertMul(
  x: Field3 | Sum,
  y: Field3 | Sum,
  xy: Field3 | Sum,
  f: bigint,
  message?: string
) {
  x = Sum.fromUnfinished(x);
  y = Sum.fromUnfinished(y);
  xy = Sum.fromUnfinished(xy);

  // conservative estimate to ensure that multiplication bound is satisfied
  // we assume that all summands si are bounded with si[2] <= f[2] checks, which implies si < 2^k where k := ceil(log(f))
  // our assertion below gives us
  // |x|*|y| + q*f + |r| < (x.length * y.length) 2^2k + 2^2k + 2^2k < 3 * 2^(2*258) < 2^264 * (native modulus)
  assert(
    BigInt(Math.ceil(Math.sqrt(x.length * y.length))) * f < 1n << 258n,
    `Foreign modulus is too large for multiplication of sums of lengths ${x.length} and ${y.length}`
  );

  // finish the y and xy sums with a zero gate
  let y0 = y.finishForMulInput(f);
  let xy0 = xy.finish(f);

  // x is chained into the ffmul gate
  let x0 = x.finishForMulInput(f, true);

  // constant case
  if (
    Field3.isConstant(x0) &&
    Field3.isConstant(y0) &&
    Field3.isConstant(xy0)
  ) {
    let x_ = Field3.toBigint(x0);
    let y_ = Field3.toBigint(y0);
    let xy_ = Field3.toBigint(xy0);
    assert(
      mod(x_ * y_, f) === xy_,
      message ?? 'assertMul(): incorrect multiplication result'
    );
    return;
  }

  assertMulInternal(x0, y0, xy0, f, message);
}

/**
 * Lazy sum of {@link Field3} elements, which can be used as input to `Gadgets.ForeignField.assertMul()`.
 */
class Sum {
  #result?: Field3;
  #summands: Field3[];
  #ops: Sign[] = [];

  constructor(x: Field3) {
    this.#summands = [x];
  }

  get result() {
    assert(this.#result !== undefined, 'sum not finished');
    return this.#result;
  }

  get length() {
    return this.#summands.length;
  }

  add(y: Field3) {
    assert(this.#result === undefined, 'sum already finished');
    this.#ops.push(1n);
    this.#summands.push(y);
    return this;
  }

  sub(y: Field3) {
    assert(this.#result === undefined, 'sum already finished');
    this.#ops.push(-1n);
    this.#summands.push(y);
    return this;
  }

  #return(x: Field3) {
    this.#result = x;
    return x;
  }

  isConstant() {
    return this.#summands.every(Field3.isConstant);
  }

  finish(f: bigint, isChained = false) {
    assert(this.#result === undefined, 'sum already finished');
    let signs = this.#ops;
    let n = signs.length;
    if (n === 0) return this.#return(this.#summands[0]);

    // constant case
    if (this.isConstant()) {
      return this.#return(sum(this.#summands, signs, f));
    }

    // provable case
    let x = this.#summands.map(toVars);
    let result = x[0];

    for (let i = 0; i < n; i++) {
      ({ result } = singleAdd(result, x[i + 1], signs[i], f));
    }
    if (!isChained) Gates.zero(...result);

    this.#result = result;
    return result;
  }

  // TODO this is complex and should be removed once we fix the ffadd gate to constrain all limbs individually
  finishForMulInput(f: bigint, isChained = false) {
    assert(this.#result === undefined, 'sum already finished');
    let signs = this.#ops;
    let n = signs.length;
    if (n === 0) return this.#return(this.#summands[0]);

    // constant case
    if (this.isConstant()) {
      return this.#return(sum(this.#summands, signs, f));
    }

    // provable case
    let xs = this.#summands.map(toVars);

    // since the sum becomes a multiplication input, we need to constrain all limbs _individually_.
    // sadly, ffadd only constrains the low and middle limb together.
    // we could fix it with a RC just for the lower two limbs
    // but it's cheaper to add generic gates which handle the lowest limb separately, and avoids the unfilled MRC slot
    let f0 = f & lMask;

    // generic gates for low limbs
    let x0 = xs[0][0];
    let x0s: Field[] = [];
    let overflows: Field[] = [];
    let xRef = Unconstrained.witness(() => Field3.toBigint(xs[0]));

    // this loop mirrors the computation that a chain of ffadd gates does,
    // but everything is done only on the lowest limb and using generic gates.
    // the output is a sequence of low limbs (x0) and overflows, which will be wired to the ffadd results at each step.
    for (let i = 0; i < n; i++) {
      // compute carry and overflow
      let [carry, overflow] = exists(2, () => {
        // this duplicates some of the logic in singleAdd
        let x = xRef.get();
        let x0 = x & lMask;
        let xi = toBigint3(xs[i + 1]);
        let sign = signs[i];

        // figure out if there's overflow
        x += sign * combine(xi);
        let overflow = 0n;
        if (sign === 1n && x >= f) overflow = 1n;
        if (sign === -1n && x < 0n) overflow = -1n;
        if (f === 0n) overflow = 0n;
        xRef.set(x - overflow * f);

        // add with carry, only on the lowest limb
        x0 = x0 + sign * xi[0] - overflow * f0;
        let carry = x0 >> l;
        return [carry, overflow];
      });
      overflows.push(overflow);

      // constrain carry
      assertOneOf(carry, [0n, 1n, -1n]);

      // x0 <- x0 + s*xi0 - o*f0 - c*2^l
      x0 = toVar(
        x0
          .add(xs[i + 1][0].mul(signs[i]))
          .sub(overflow.mul(f0))
          .sub(carry.mul(1n << l))
      );
      x0s.push(x0);
    }

    // ffadd chain
    let x = xs[0];
    for (let i = 0; i < n; i++) {
      let { result, overflow } = singleAdd(x, xs[i + 1], signs[i], f);
      // wire low limb and overflow to previous values
      result[0].assertEquals(x0s[i]);
      overflow.assertEquals(overflows[i]);
      x = result;
    }
    if (!isChained) Gates.zero(...x);

    this.#result = x;
    return x;
  }

  rangeCheck() {
    assert(this.#result !== undefined, 'sum not finished');
    if (this.#ops.length > 0) multiRangeCheck(this.#result);
  }

  static fromUnfinished(x: Field3 | Sum) {
    if (x instanceof Sum) {
      assert(x.#result === undefined, 'sum already finished');
      return x;
    }
    return new Sum(x);
  }
}

// Field3 comparison

function assertLessThan(x: Field3, y: bigint | Field3) {
  let y_ = Field3.from(y);

  // constant case, y = constant, x = constant

  if (Field3.isConstant(x) && Field3.isConstant(y_)) {
    assert(
      Field3.toBigint(x) < Field3.toBigint(y_),
      'assertLessThan: got x >= y'
    );
    return;
  }

  // case of y = constant, x = variable

  if (Field3.isConstant(y_)) {
    y = typeof y === 'bigint' ? y : Field3.toBigint(y);
    // this case is not included below, because ffadd doesn't support negative moduli
    assert(y > 0n, 'assertLessThan: y <= 0, so x < y is impossible');

    // we can just use negation `(y - 1) - x`. because the result is range-checked, it proves that x < y:
    // `y - 1 - x \in [0, 2^3l) => x <= x + (y - 1 - x) = y - 1 < y`
    // (note: ffadd can't add higher multiples of (f - 1). it must always use an overflow of -1, except for x = 0)

    ForeignField.negate(x, y - 1n);
    return;
  }

  // case of two variables or x = constant and y = variable
  // we compute z = y - x - 1 and check that z \in [0, 2^3l), which implies x < y as above

  // we use modulo 0 here, which means we're proving:
  // z = y - x - 1 - 0*(o1 + o2) for some overflows o1, o2
  sum([y_, x, Field3.from(1n)], [-1n, -1n], 0n);
}

function assertLessThanOrEqual(x: Field3, y: bigint | Field3) {
  assert(
    typeof y !== 'bigint' || y >= 0n,
    'assertLessThanOrEqual: upper bound must be positive'
  );
  let y_ = Field3.from(y);

  // constant case
  if (Field3.isConstant(x) && Field3.isConstant(y_)) {
    assert(
      Field3.toBigint(x) <= Field3.toBigint(y_),
      'assertLessThan: got x > y'
    );
    return;
  }

  // provable case
  // we compute z = y - x and check that z \in [0, 2^3l), which implies x <= y
  sum([y_, x], [-1n], 0n);
}

// Field3 from/to bits

function field3FromBits(bits: Bool[]): Field3 {
  const Field = getField();
  let limbSize = Number(l);
  let l0 = Field.fromBits(bits.slice(0 * limbSize, 1 * limbSize));
  let l1 = Field.fromBits(bits.slice(1 * limbSize, 2 * limbSize));
  let l2 = Field.fromBits(bits.slice(2 * limbSize, 3 * limbSize));
  return [l0, l1, l2];
}

// helpers

/**
 * Version of `multiRangeCheck` which does the check on a truncated version of the input,
 * so that it always succeeds, and then checks equality of the truncated and full input.
 *
 * This is a hack to get an error when the constraint fails, around the fact that multiRangeCheck
 * is not checked by snarky.
 */
function indirectMultiRangeChange(
  x: Field3,
  message = 'multi-range check failed'
) {
  let xTrunc = exists(3, () => {
    let [x0, x1, x2] = toBigint3(x);
    return [x0 & lMask, x1 & lMask, x2 & lMask];
  });
  multiRangeCheck(xTrunc);
  x[0].assertEquals(xTrunc[0], message);
  x[1].assertEquals(xTrunc[1], message);
  x[2].assertEquals(xTrunc[2], message);
}
