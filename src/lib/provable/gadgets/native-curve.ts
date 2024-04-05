import type { Field } from '../field.js';
import type { Bool } from '../bool.js';
import { Fp, Fq } from '../../../bindings/crypto/finite-field.js';
import { PallasAffine } from '../../../bindings/crypto/elliptic-curve.js';
import { fieldToField3, isOddAndHigh } from './comparison.js';
import { Field3, ForeignField } from './foreign-field.js';
import { exists } from '../core/exists.js';
import { assert, bit, bitSlice, isConstant, packBits } from './common.js';
import { TupleN } from '../../util/types.js';
import { l, rangeCheck64 } from './range-check.js';
import { createField, getField } from '../core/field-constructor.js';
import { Snarky } from '../../../snarky.js';
import { Provable } from '../provable.js';
import { MlPair } from '../../ml/base.js';
import { provable } from '../types/provable-derivers.js';

export {
  scaleFieldDirect,
  scaleField,
  fieldToShiftedScalar,
  field3ToShiftedScalar,
  scaleShiftedSplit5,
  add,
};

type Point = { x: Field; y: Field };
type ShiftedScalar = { low5: TupleN<Bool, 5>; high250: Field };

/**
 * Dedicated gadget to scale a point by a scalar, where the scalar is represented as a _native_ Field.
 */
function scaleFieldDirect(P: Point, s: Field): Point {
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
  let { isOdd: sLoBool, high: sHi } = isOddAndHigh(s);
  let sLo = sLoBool.toField();

  let shift = Fq.mod(-(1n << 255n));
  let shiftLo = shift & 1n;
  let shiftHi = shift >> 1n;

  let carry = sLo.mul(shiftLo).seal(); // = either 0 or lowBit
  let tLo = sLo.add(shiftLo).sub(carry).assertBool();
  let tHi = sHi.add(shiftHi).add(carry).seal();

  // tHi does not overflow:
  // tHi = sHi + shiftHi + carry < p/2 + (p/2 - 1) + 1 = p
  // sHi < p/2 is guaranteed by isOddAndHigh
  assert(shiftHi < Fp.modulus / 2n - 1n);

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
  let { result: RminusP, isInfinity } = add(R, negate(P));
  isInfinity.assertFalse(); // can only be zero if s = 0, which we handle later
  R = Provable.if(tLo, Point, R, RminusP);

  // now handle the two edge cases s=0 and s=1
  let zero = createField(0n);
  let zeroPoint = { x: zero, y: zero };
  let edgeCaseResult = Provable.if(sLoBool, Point, P, zeroPoint);
  return Provable.if(isEdgeCase, Point, edgeCaseResult, R);
}

/**
 * Gadget to scale a point by a scalar, where the scalar is represented as a _native_ Field.
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
  // compute t = s - 2^254 mod q using foreign field subtraction, and split into 5 low bits and 250 high bits
  let t = fieldToShiftedScalar(s);

  // return (t + 2^254)*P = (s - 2^254 + 2^254)*P = s*P
  return scaleShiftedSplit5(P, t);
}

/**
 * Converts a field element s to a shifted representation t = s - 2^254 mod q,
 * where t is represented as a 5-bit low part and a 250-bit high part.
 *
 * This is the representation we use for scalars, since it can be used as input to `scaleShiftedSplit5()`.
 */
function fieldToShiftedScalar(s: Field): ShiftedScalar {
  let sBig = fieldToField3(s);

  // assert that sBig is canonical mod p, so that we can't add (kp mod q) factors by doing things modulo q
  ForeignField.assertLessThan(sBig, Fp.modulus);

  return field3ToShiftedScalar(sBig);
}

/**
 * Converts a 3-limb bigint to a shifted representation t = s - 2^254 mod q,
 * where t is represented as a 5-bit low part and a 250-bit high part.
 *
 * This assumes that `s` is range-checked to some extent, for example a safe bound is s < 2^258 or anything less.
 * If s is > 2^259, the high part computation can overflow the base field and the result is incorrect.
 */
function field3ToShiftedScalar(
  s: Field3,
  { proveUnique = false } = {}
): ShiftedScalar {
  // constant case
  if (Field3.isConstant(s)) {
    let t = Fq.mod(Field3.toBigint(s) - (1n << 254n));
    let low5 = createField(t & 0x1fn).toBits(5);
    let high250 = createField(t >> 5n);
    return { low5: TupleN.fromArray(5, low5), high250 };
  }

  // compute t = s - 2^254 mod q using foreign field subtraction
  let twoTo254 = Field3.from(1n << 254n);
  let t = ForeignField.sub(s, twoTo254, Fq.modulus);
  let [t0, t1, t2] = t;

  if (proveUnique) {
    // to fully constrain the output scalar, we need to prove that t is canonical
    // otherwise, the subtraction above can add +q to the result, which yields an alternative bit representation
    // if the scalar is just used for scaling points, this isn't necessary, because (s + kq)P = sP
    ForeignField.assertLessThan(t, Fq.modulus);
  }

  // split t into 250 high bits and 5 low bits
  // => split t0 into [5, 83] => split t0 into [5, 64, 19] so we can efficiently range-check
  let [tHi00, tHi01, ...tLo] = exists(7, () => {
    let t = t0.toBigInt();
    return [
      bitSlice(t, 5, 64),
      bitSlice(t, 69, 19),
      bit(t, 0),
      bit(t, 1),
      bit(t, 2),
      bit(t, 3),
      bit(t, 4),
    ];
  });
  let tLoBools = TupleN.map(tLo, (x) => x.assertBool());
  rangeCheck64(tHi00);
  rangeCheck64(tHi01);

  // prove (tLo, tHi0) split
  // since we know that t0 < 2^88 and tHi0 < 2^128, this even proves that t0Hi < 2^83
  // (the bound on tHi0 is necessary so that 32*tHi0 can't overflow)
  let tHi0 = tHi00.add(tHi01.mul(1n << 64n));
  packBits(tLo)
    .add(tHi0.mul(1n << 5n))
    .assertEquals(t0);

  // pack tHi
  // this can't overflow the native field if e.g. s < 2^258:
  // -) t <= s - 2^254 + q < 2^259
  // -) we proved tHi = (t >> 5) < 2^254, and all the parts are precisely range-checked
  let tHi = tHi0
    .add(t1.mul(1n << (l - 5n)))
    .add(t2.mul(1n << (2n * l - 5n)))
    .seal();

  return { low5: tLoBools, high250: tHi };
}

/**
 * Internal helper to compute `(t + 2^254)*P`.
 * `t` is expected to be split into 250 high bits (t >> 5) and 5 low bits (t & 0x1f).
 *
 * The gadget proves that `tHi` is in [0, 2^250) but assumes that `tLo` consists of bits.
 */
function scaleShiftedSplit5(
  { x, y }: Point,
  { low5: tLo, high250: tHi }: ShiftedScalar
): Point {
  // constant case
  if (isConstant(x, y, tHi, ...tLo)) {
    let sP = PallasAffine.scale(
      PallasAffine.fromNonzero({ x: x.toBigInt(), y: y.toBigInt() }),
      Fq.add(packBits(tLo).toBigInt() + (tHi.toBigInt() << 5n), 1n << 254n)
    );
    return { x: createField(sP.x), y: createField(sP.y) };
  }
  const Field = getField();
  const Point = provable({ x: Field, y: Field });
  const zero = createField(0n);

  // R = (2*(t >> 5) + 1 + 2^250)P
  // also proves that tHi is in [0, 2^250)
  let [, RMl] = Snarky.group.scaleFastUnpack(
    [0, x.value, y.value],
    [0, tHi.value],
    250
  );
  let P = { x, y };
  let R = { x: createField(RMl[1]), y: createField(RMl[2]) };
  let [t0, t1, t2, t3, t4] = tLo;

  // R = t4 ? R : R - P = ((t >> 4) + 2^250)P
  R = Provable.if(t4, Point, R, addNonZero(R, negate(P)));

  // R = ((t >> 3) + 2^251)P
  // R = ((t >> 2) + 2^252)P
  // R = ((t >> 1) + 2^253)P
  // note: t is in [0, q) so none of these can overflow and create a completeness issue: q/2 + 2^253 < q
  for (let t of [t3, t2, t1]) {
    R = addNonZero(R, R);
    R = Provable.if(t, Point, addNonZero(R, P), R);
  }

  // R = (t + 2^254)P
  // in the final step, we allow a zero output to make it work for the 0 scalar
  R = addNonZero(R, R);
  let { result, isInfinity } = add(R, P);
  result = Provable.if(isInfinity, Point, { x: zero, y: zero }, result);
  R = Provable.if(t0, Point, result, R);

  return R;
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
  let isInfinity = inf.assertBool();

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
