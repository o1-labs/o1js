import type { Field } from '../field.js';
import type { Bool } from '../bool.js';
import { Fp, Fq } from '../../../bindings/crypto/finite-field.js';
import { PallasAffine } from '../../../bindings/crypto/elliptic-curve.js';
import { fieldToField3 } from './comparison.js';
import { Field3, ForeignField } from './foreign-field.js';
import { exists } from '../core/exists.js';
import { bit, isConstant } from './common.js';
import { l } from './range-check.js';
import {
  createBool,
  createField,
  getField,
} from '../core/field-constructor.js';
import { Snarky } from '../../../snarky.js';
import { Provable } from '../provable.js';
import { MlPair } from '../../ml/base.js';
import { provable } from '../types/provable-derivers.js';

export {
  scale,
  fieldToShiftedScalar,
  field3ToShiftedScalar,
  scaleShifted,
  add,
  ShiftedScalar,
};

type Point = { x: Field; y: Field };
type ShiftedScalar = { lowBit: Bool; high254: Field };

/**
 * Gadget to scale a point by a scalar, where the scalar is represented as a _native_ Field.
 */
function scale(P: Point, s: Field): Point {
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
  return scaleShifted(P, t);
}

/**
 * Converts a field element s to a shifted representation t = s = 2^254 mod q,
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
 * Converts a 3-limb bigint to a shifted representation t = s - 2^255 mod q,
 * where t is represented as a low bit and a 254-bit high part.
 */
function field3ToShiftedScalar(s: Field3): ShiftedScalar {
  // constant case
  if (Field3.isConstant(s)) {
    let t = Fq.mod(Field3.toBigint(s) - (1n << 255n));
    let lowBit = createBool((t & 1n) === 1n);
    let high254 = createField(t >> 1n);
    return { lowBit, high254 };
  }

  // compute t = s - 2^255 mod q using foreign field subtraction
  let twoTo255 = Field3.from(Fq.mod(1n << 255n));
  let t = ForeignField.sub(s, twoTo255, Fq.modulus);

  // it's necessary to prove that t is canonical -- otherwise its bit representation is ambiguous
  ForeignField.assertLessThan(t, Fq.modulus);

  let [t0, t1, t2] = t;

  // split t into 254 high bits and a low bit
  // => split t0 into [1, 87]
  let [tLo, tHi0] = exists(2, () => {
    let t0_ = t0.toBigInt();
    return [bit(t0_, 0), t0_ >> 1n];
  });
  let tLoBool = tLo.assertBool();

  // prove split
  // since we know that t0 < 2^88, this proves that t0High < 2^87
  tLo.add(tHi0.mul(2n)).assertEquals(t0);

  // pack tHi
  let tHi = tHi0
    .add(t1.mul(1n << (l - 1n)))
    .add(t2.mul(1n << (2n * l - 1n)))
    .seal();

  return { lowBit: tLoBool, high254: tHi };
}

/**
 * Internal helper to compute `(t + 2^255)*P`.
 * `t` is expected to be split into 254 high bits (t >> 1) and a low bit (t & 1).
 *
 * The gadget proves that `tHi` is in [0, 2^254) but assumes that `tLo` consists of bits.
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
  const zero = createField(0n);

  // R = (2*(t >> 1) + 1 + 2^255)P
  // also returns a 255-bit representation of tHi
  let [, RMl, [, ...tHiBitsMl]] = Snarky.group.scaleFastUnpack(
    [0, x.value, y.value],
    [0, tHi.value],
    255
  );
  let P = { x, y };
  let R = { x: createField(RMl[1]), y: createField(RMl[2]) };

  // prove that tHi has only `numHighBits` bits set
  for (let i = numHighBits; i < 255; i++) {
    createField(tHiBitsMl[i]).assertEquals(zero);
  }

  // R = tLo ? R : R - P = (t + 2^255)P
  let { result, isInfinity } = add(R, negate(P));
  isInfinity.assertFalse();
  R = Provable.if(tLo, Point, R, result);

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
 * Negates a point.
 */
function negate(g: Point): Point {
  return { x: g.x, y: g.y.neg() };
}
