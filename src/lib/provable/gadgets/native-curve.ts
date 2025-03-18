import type { Field } from '../field.js';
import type { Bool } from '../bool.js';
import { Fp, Fq } from '../../../bindings/crypto/finite-field.js';
import { PallasAffine } from '../../../bindings/crypto/elliptic-curve.js';
import { isOddAndHigh } from './comparison.js';
import { Field3, ForeignField } from './foreign-field.js';
import { exists } from '../core/exists.js';
import { assert, bit, bitSlice, isConstant } from './common.js';
import { l, multiRangeCheck, rangeCheck64, rangeCheckLessThan64 } from './range-check.js';
import { createBool, createBoolUnsafe, createField, getField } from '../core/field-constructor.js';
import { Snarky } from '../../../snarky.js';
import { Provable } from '../provable.js';
import { MlPair } from '../../ml/base.js';
import { provable } from '../types/provable-derivers.js';

export {
  scaleField,
  scaleShifted,
  fieldToShiftedScalar,
  field3ToShiftedScalar,
  shiftedScalarToField3,
  add,
  ShiftedScalar,
};

type Point = { x: Field; y: Field };
type ShiftedScalar = { lowBit: Bool; high254: Field };

/**
 * Dedicated gadget to scale a point by a scalar, where the scalar is represented as a _native_ Field.
 */
function scaleField(P: Point, s: Field): Point {
  // constant case
  let { x, y } = P;
  if (x.isConstant() && y.isConstant() && s.isConstant()) {
    let sP = PallasAffine.scale(
      PallasAffine.fromNonzero({ x: x.toBigInt(), y: y.toBigInt() }),
      s.toBigInt()
    );
    return { x: createField(sP.x), y: createField(sP.y) };
  }
  const Field = getField();
  const Point = provable({ x: Field, y: Field });

  /**
   * Strategy:
   * - use a (1, 254) split and compute s - 2^255 with manual add-and-carry
   * - use all 255 rounds of `scaleFastUnpack` for the high part
   * - pass in s or a dummy replacement if s = 0, 1 (which are the disallowed values)
   * - return sP or 0P = 0 or 1P = P
   */

  // compute t = s + (-2^255 mod q) in (1, 254) arithmetic
  let { isOdd: sLo, high: sHi } = isOddAndHigh(s);

  let shift = Fq.mod(-(1n << 255n));
  assert((shift & 1n) === 0n); // shift happens to be even, so we don't need to worry about a carry
  let shiftHi = shift >> 1n;

  let tLo = sLo;
  let tHi = sHi.add(shiftHi).seal();

  // tHi does not overflow:
  // tHi = sHi + shiftHi < p/2 + p/2 = p
  // sHi < p/2 is guaranteed by isOddAndHigh
  assert(shiftHi < Fp.modulus / 2n);

  // the 4 values for s not supported by `scaleFastUnpack` are q-2, q-1, 0, 1
  // since s came from a `Field`, we can exclude q-2, q-1
  // s = 0 or 1 iff sHi = 0
  let isEdgeCase = sHi.equals(0n);
  let tHiSafe = Provable.if(isEdgeCase, createField(0n), tHi);

  // R = (2*(t >> 1) + 1 + 2^255)P
  // also returns a 255-bit representation of tHi
  let [, RMl, [, ...tHiBitsMl]] = Snarky.group.scaleFastUnpack(
    [0, x.value, y.value],
    [0, tHiSafe.value],
    255
  );
  let R = { x: createField(RMl[1]), y: createField(RMl[2]) };

  // prove that tHi has only 254 bits set
  createField(tHiBitsMl[254]).assertEquals(0n);

  // R = tLo ? R : R - P = (t + 2^255)P = sP
  let RminusP = addNonZero(R, negate(P)); // can only be zero if s = 0, which we handle later
  R = Provable.if(tLo, Point, R, RminusP);

  // now handle the two edge cases s=0 and s=1
  let zero = createField(0n);
  let zeroPoint = { x: zero, y: zero };
  let edgeCaseResult = Provable.if(sLo, Point, P, zeroPoint);
  return Provable.if(isEdgeCase, Point, edgeCaseResult, R);
}

/**
 * Internal helper to compute `(t + 2^255)*P`.
 * `t` is expected to be split into 254 high bits (t >> 1) and a low bit (t & 1).
 *
 * The gadget proves that `tHi` is in [0, 2^254) but assumes that `tLo` is a single bit.
 *
 * Optionally, you can specify a different number of high bits by passing in `numHighBits`.
 */
function scaleShifted(
  { x, y }: Point,
  { lowBit: tLo, high254: tHi }: ShiftedScalar,
  numHighBits = 254
): Point {
  // constant case
  if (isConstant(x, y, tHi, tLo)) {
    let sP = PallasAffine.scale(
      PallasAffine.fromNonzero({ x: x.toBigInt(), y: y.toBigInt() }),
      Fq.mod(tLo.toField().toBigInt() + 2n * tHi.toBigInt() + (1n << 255n))
    );
    return { x: createField(sP.x), y: createField(sP.y) };
  }
  const Field = getField();
  const Point = provable({ x: Field, y: Field });
  let zero = createField(0n);

  /**
   * Strategy:
   * - use all 255 rounds of `scaleFastUnpack` for the high part
   * - handle two disallowed tHi values separately: -2^254, -2^254 - 1
   * - don't handle disallowed tHi = -2^254 - 1/2 because it wouldn't normally be used, as it's > q/2
   */
  let equalsMinusShift = tHi.equals(Fq.modulus - (1n << 254n));
  let equalsMinusShiftMinus1 = tHi.equals(Fq.modulus - (1n << 254n) - 1n);
  let isEdgeCase = equalsMinusShift.or(equalsMinusShiftMinus1);
  let tHiSafe = Provable.if(isEdgeCase, zero, tHi);

  // R = (2*(t >> 1) + 1 + 2^255)P
  // also returns a 255-bit representation of tHi
  let [, RMl, [, ...tHiBitsMl]] = Snarky.group.scaleFastUnpack(
    [0, x.value, y.value],
    [0, tHiSafe.value],
    255
  );
  let P = { x, y };
  let R = { x: createField(RMl[1]), y: createField(RMl[2]) };

  // prove that tHi has only `numHighBits` bits set
  for (let i = numHighBits; i < 255; i++) {
    createField(tHiBitsMl[i]).assertEquals(zero);
  }

  // handle edge cases
  // 2*(-2^254) + 1 + 2^255 = 1
  // 2*(-2^254 - 1) + 1 + 2^255 = -1
  // so the result is (x,+-y)
  let edgeCaseY = y.mul(equalsMinusShift.toField().mul(2n).sub(1n)); // y*(2b - 1) = y or -y
  let edgeCaseResult = { x, y: edgeCaseY };
  R = Provable.if(isEdgeCase, Point, edgeCaseResult, R);

  // R = tLo ? R : R - P = (t + 2^255)P
  // we also handle a zero R-P result to make the 0 scalar work
  let { result: RminusP, isInfinity } = add(R, negate(P));
  RminusP = Provable.if(isInfinity, Point, { x: zero, y: zero }, RminusP);
  R = Provable.if(tLo, Point, R, RminusP);

  return R;
}

/**
 * Converts a field element s to a shifted representation t = s - 2^254 mod q,
 * where t is represented as a low bit and a 254-bit high part.
 *
 * This is the representation we use for scalars, since it can be used as input to `scaleShifted()`.
 */
function fieldToShiftedScalar(s: Field): ShiftedScalar {
  // constant case
  if (s.isConstant()) {
    let t = Fq.mod(s.toBigInt() - (1n << 255n));
    let lowBit = createBool((t & 1n) === 1n);
    let high254 = createField(t >> 1n);
    return { lowBit, high254 };
  }

  // compute t = s + (-2^255 mod q) in (1, 254) arithmetic
  let { isOdd: sLo, high: sHi } = isOddAndHigh(s);

  let shift = Fq.mod(-(1n << 255n));
  assert((shift & 1n) === 0n); // shift happens to be even, so we don't need to worry about a carry
  let shiftHi = shift >> 1n;

  let tLo = sLo;
  let tHi = sHi.add(shiftHi).seal();

  // tHi does not overflow:
  // tHi = sHi + shiftHi < p/2 + p/2 = p
  // sHi < p/2 is guaranteed by isOddAndHigh
  assert(shiftHi < Fp.modulus / 2n);

  return { lowBit: tLo, high254: tHi };
}

/**
 * Converts a 3-limb bigint to a shifted representation t = s - 2^255 mod q,
 * where t is represented as a low bit and a 254-bit high part.
 *
 * Note: The output is proven to be a canonical scalar, t < q.
 */
function field3ToShiftedScalar(s: Field3): ShiftedScalar {
  // constant case
  if (Field3.isConstant(s)) {
    let t = Fq.mod(Field3.toBigint(s) - (1n << 255n));
    let lowBit = createBool((t & 1n) === 1n);
    let high254 = createField(t >> 1n);
    return { lowBit, high254 };
  }

  // compute t = s - (2^255 mod q) using foreign field subtraction
  let twoTo255 = Field3.from(Fq.mod(1n << 255n));
  let t = ForeignField.sub(s, twoTo255, Fq.modulus);
  let [t0, t1, t2] = t;

  // to fully constrain the output scalar, we need to prove that t is canonical
  // otherwise, the subtraction above can add +q to the result, which yields an alternative bit representation
  // this also provides a bound on the high part, to that the computation of tHi can't overflow
  ForeignField.assertLessThan(t, Fq.modulus);

  // split t into 254 high bits and a low bit
  // => split t0 into [1, 87] => split t0 into [1, 64, 23] so we can efficiently range-check
  let [tLo, tHi00, tHi01] = exists(3, () => {
    let t = t0.toBigInt();
    return [bit(t, 0), bitSlice(t, 1, 64), bitSlice(t, 65, 23)];
  });
  let tLoBool = tLo.assertBool();
  rangeCheck64(tHi00);
  rangeCheck64(tHi01);

  // prove (tLo, tHi0) split
  // since we know that t0 < 2^88 and tHi0 < 2^128, this even proves that tHi0 < 2^87
  // (the bound on tHi0 is necessary so that 2*tHi0 can't overflow)
  let tHi0 = tHi00.add(tHi01.mul(1n << 64n));
  tLo.add(tHi0.mul(2n)).assertEquals(t0);

  // pack tHi
  // this can't overflow the native field because:
  // -) we showed t < q
  // -) the three combined limbs here represent the bigint (t >> 1) < q/2 < p
  let tHi = tHi0
    .add(t1.mul(1n << (l - 1n)))
    .add(t2.mul(1n << (2n * l - 1n)))
    .seal();

  return { lowBit: tLoBool, high254: tHi };
}

/**
 * Converts a shifted representation t = s - 2^255 mod q to s as a Field3 bigint.
 *
 * Note: This method is complete for all t such that tLo < 2 and tHi < 2^254.
 * The output is can always be made a canonical scalar element by an honest prover.
 */
function shiftedScalarToField3(t: ShiftedScalar): Field3 {
  // constant case
  if (t.high254.isConstant() && t.lowBit.isConstant()) {
    let s = t.lowBit.toField().toBigInt() + 2n * t.high254.toBigInt();
    return Field3.from(Fq.mod(s + (1n << 255n)));
  }

  // split sHi into 64, 23, 88, 79 bit limbs (254 in total)
  let [t0Hi0, t0Hi1, t1, t2] = exists(4, () => {
    let tHi = t.high254.toBigInt();
    return [
      bitSlice(tHi, 0, 64),
      bitSlice(tHi, 64, 23),
      bitSlice(tHi, 87, 88),
      bitSlice(tHi, 175, 79),
    ];
  });
  // check t0 < 2^88 in pieces and reassemble
  rangeCheck64(t0Hi0);
  rangeCheckLessThan64(23, t0Hi1);
  let t0Hi = t0Hi0.add(t0Hi1.mul(1n << 64n)).seal(); // < 2^87
  let t0 = t.lowBit.toField().add(t0Hi.mul(2n)).seal(); // < 2^88

  // check t1 < 2^88 and t2 < 2^79 with MRC
  multiRangeCheck([t1, t2, t2.mul(1n << 9n)]); // 2^9 t2 < 2^88 => t2 < 2^79

  // prove tHi split (unique because <= 254 bits)
  let tHi = t0Hi
    .add(t1.mul(1n << 87n))
    .add(t2.mul(1n << 175n))
    .seal();
  tHi.assertEquals(t.high254);

  // we converted t to a bigint, now add 2^255 mod q
  let tBig: Field3 = [t0, t1, t2];
  let shift = Fq.mod(1n << 255n);
  // we add an extra 0 so that the prover has the opportunity to subtract q twice.
  // for the maximum input t = 2^255 this is enough to get a reduced result:
  // 2^255 + (2^255 - q) - 2q = 2^254 - 3*(q - 2^254) < q
  return ForeignField.sum([tBig, Field3.from(shift), Field3.from(0n)], [1n, 1n], Fq.modulus);
}

/**
 * Wraps the `EC_add` gate to perform complete addition of two non-zero curve points.
 */
function add(g: Point, h: Point): { result: Point; isInfinity: Bool } {
  // compute witnesses
  let witnesses = exists(7, () => {
    let x1 = g.x.toBigInt();
    let y1 = g.y.toBigInt();
    let x2 = h.x.toBigInt();
    let y2 = h.y.toBigInt();

    let sameX = BigInt(x1 === x2);
    let inf = BigInt(sameX && y1 !== y2);
    let infZ = sameX ? Fp.inverse(y2 - y1) ?? 0n : 0n;
    let x21Inv = Fp.inverse(x2 - x1) ?? 0n;

    let slopeDouble = Fp.div(3n * x1 ** 2n, 2n * y1) ?? 0n;
    let slopeAdd = Fp.mul(y2 - y1, x21Inv);
    let s = sameX ? slopeDouble : slopeAdd;

    let x3 = Fp.mod(s ** 2n - x1 - x2);
    let y3 = Fp.mod(s * (x1 - x3) - y1);

    return [sameX, inf, infZ, x21Inv, s, x3, y3];
  });

  let [same_x, inf, inf_z, x21_inv, s, x3, y3] = witnesses;

  Snarky.gates.ecAdd(
    MlPair(g.x.seal().value, g.y.seal().value),
    MlPair(h.x.seal().value, h.y.seal().value),
    MlPair(x3.value, y3.value),
    inf.value,
    same_x.value,
    s.value,
    inf_z.value,
    x21_inv.value
  );

  // the ecAdd gate constrains `inf` to be boolean
  let isInfinity = createBoolUnsafe(inf);

  return { result: { x: x3, y: y3 }, isInfinity };
}

/**
 * Addition that asserts the result is non-zero.
 */
function addNonZero(g: Point, h: Point) {
  let { result, isInfinity } = add(g, h);
  isInfinity.assertFalse();
  return result;
}

/**
 * Negates a point.
 */
function negate(g: Point): Point {
  return { x: g.x, y: g.y.neg() };
}
