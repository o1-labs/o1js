import { mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../field.js';
import { Gates, foreignFieldAdd } from '../gates.js';
import { Tuple } from '../util/types.js';
import { assert, bitSlice, exists } from './common.js';
import {
  L,
  lMask,
  multiRangeCheck,
  L2,
  l2Mask,
  L3,
  compactMultiRangeCheck,
} from './range-check.js';

export { ForeignField, Field3, Sign };

type Field3 = [Field, Field, Field];
type bigint3 = [bigint, bigint, bigint];
type Sign = -1n | 1n;

const ForeignField = {
  // arithmetic
  add(x: Field3, y: Field3, f: bigint) {
    return sumChain([x, y], [1n], f);
  },
  sub(x: Field3, y: Field3, f: bigint) {
    return sumChain([x, y], [-1n], f);
  },
  sumChain,

  mul(x: Field3, y: Field3, f: bigint) {
    return multiply(x, y, f);
  },

  // helper methods
  from(x: bigint): Field3 {
    return Field3(split(x));
  },
  toBigint(x: Field3): bigint {
    return collapse(bigint3(x));
  },
};

/**
 * computes x[0] + sign[0] * x[1] + ... + sign[n-1] * x[n] modulo f
 *
 * assumes that inputs are range checked, does range check on the result.
 */
function sumChain(x: Field3[], sign: Sign[], f: bigint) {
  assert(x.length === sign.length + 1, 'inputs and operators match');

  // constant case
  if (x.every((x) => x.every((x) => x.isConstant()))) {
    let xBig = x.map(ForeignField.toBigint);
    let sum = sign.reduce((sum, s, i) => sum + s * xBig[i + 1], xBig[0]);
    return ForeignField.from(mod(sum, f));
  }

  // provable case - create chain of ffadd rows
  let result = x[0];
  for (let i = 0; i < sign.length; i++) {
    ({ result } = singleAdd(result, x[i + 1], sign[i], f));
  }
  // final zero row to hold result
  Gates.zero(...result);

  // range check result
  multiRangeCheck(...result);

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
    let x_ = bigint3(x);
    let y_ = bigint3(y);

    // figure out if there's overflow
    let r = collapse(x_) + sign * collapse(y_);
    let overflow = 0n;
    if (sign === 1n && r >= f) overflow = 1n;
    if (sign === -1n && r < 0n) overflow = -1n;
    if (f === 0n) overflow = 0n; // special case where overflow doesn't change anything

    // do the add with carry
    // note: this "just works" with negative r01
    let r01 = collapse2(x_) + sign * collapse2(y_) - overflow * collapse2(f_);
    let carry = r01 >> L2;
    r01 &= l2Mask;
    let [r0, r1] = split2(r01);
    let r2 = x_[2] + sign * y_[2] - overflow * f_[2] + carry;

    return [r0, r1, r2, overflow, carry];
  });

  foreignFieldAdd({ left: x, right: y, overflow, carry, modulus: f_, sign });

  return { result: [r0, r1, r2] satisfies Field3, overflow };
}

function multiply(a: Field3, b: Field3, f: bigint): [Field3, Field3] {
  // notation follows https://github.com/o1-labs/rfcs/blob/main/0006-ffmul-revised.md
  assert(f < 1n << 259n, 'Foreign modulus fits in 259 bits');
  let f_ = (1n << L3) - f;
  let [f_0, f_1, f_2] = split(f_);
  let f2 = f >> L2;
  let f2Bound = (1n << L) - f2 - 1n;

  // constant case
  if (a.every((x) => x.isConstant()) && b.every((x) => x.isConstant())) {
    let ab = ForeignField.toBigint(a) * ForeignField.toBigint(b);
    let q = ab / f;
    let r = ab - q * f;
    return [ForeignField.from(r), ForeignField.from(q)];
  }

  let witnesses = exists(21, () => {
    // split inputs into 3 limbs
    let [a0, a1, a2] = bigint3(a);
    let [b0, b1, b2] = bigint3(b);

    // compute q and r such that a*b = q*f + r
    let ab = collapse([a0, a1, a2]) * collapse([b0, b1, b2]);
    let q = ab / f;
    let r = ab - q * f;

    let [q0, q1, q2] = split(q);
    let [r0, r1, r2] = split(r);
    let r01 = collapse2([r0, r1]);

    // compute product terms
    let p0 = a0 * b0 + q0 * f_0;
    let p1 = a0 * b1 + a1 * b0 + q0 * f_1 + q1 * f_0;
    let p2 = a0 * b2 + a1 * b1 + a2 * b0 + q0 * f_2 + q1 * f_1 + q2 * f_0;

    let [p10, p110, p111] = split(p1);
    let p11 = collapse2([p110, p111]);

    // carry bottom limbs
    let c0 = (p0 + (p10 << L) - r01) >> L2;

    // carry top limb
    let c1 = (p2 - r2 + p11 + c0) >> L;

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

  // limb range checks on quotient and remainder
  multiRangeCheck(...q);
  let r = compactMultiRangeCheck(r01, r2);

  // range check on q and r bounds
  // TODO: this uses one RC too many.. need global RC stack
  let [r2Bound, zero] = exists(2, () => [r2.toBigInt() + f2Bound, 0n]);
  multiRangeCheck(q2Bound, r2Bound, zero);

  // constrain r2 bound, zero
  r2.add(f2Bound).assertEquals(r2Bound);
  zero.assertEquals(0);

  return [r, q];
}

function Field3(x: bigint3): Field3 {
  return Tuple.map(x, (x) => new Field(x));
}
function bigint3(x: Field3): bigint3 {
  return Tuple.map(x, (x) => x.toBigInt());
}

function collapse([x0, x1, x2]: bigint3) {
  return x0 + (x1 << L) + (x2 << L2);
}
function split(x: bigint): bigint3 {
  return [x & lMask, (x >> L) & lMask, (x >> L2) & lMask];
}

function collapse2([x0, x1]: bigint3 | [bigint, bigint]) {
  return x0 + (x1 << L);
}
function split2(x: bigint): [bigint, bigint] {
  return [x & lMask, (x >> L) & lMask];
}
