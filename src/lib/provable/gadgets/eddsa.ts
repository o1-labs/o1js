import { inverse, mod } from '../../../bindings/crypto/finite-field.js';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { assert } from './common.js';
import { Field3, ForeignField, split, weakBound } from './foreign-field.js';
import { l, l2, l2Mask, multiRangeCheck } from './range-check.js';
import { sha256 } from 'js-sha256';
import {
  bigIntToBytes,
  bytesToBigInt,
} from '../../../bindings/crypto/bigint-helpers.js';
import {
  CurveTwisted,
  GroupTwisted,
  twistedAdd,
  twistedDouble,
} from '../../../bindings/crypto/elliptic-curve.js';
import { Bool } from '../bool.js';
import { provable } from '../types/provable-derivers.js';
import { assertPositiveInteger } from '../../../bindings/crypto/non-negative.js';
import { arrayGet, assertNotVectorEquals } from './basic.js';
import { sliceField3 } from './bit-slices.js';
import { exists } from '../core/exists.js';
import { ProvableType } from '../types/provable-intf.js';
import { Point } from './elliptic-curve.js';

// external API
export { EllipticCurveTwisted, Point, Eddsa };

const EllipticCurveTwisted = {
  add,
  double,
  negate,
  assertOnCurve,
};

namespace Eddsa {
  /**
   * EdDSA signature consisting of two curve scalars.
   */
  export type Signature = { r: Field3; s: Field3 };
  export type signature = { r: bigint; s: bigint };
}

function add(
  p1: Point,
  p2: Point,
  Curve: { modulus: bigint; a: bigint; d: bigint }
) {
  let { x: x1, y: y1 } = p1;
  let { x: x2, y: y2 } = p2;
  let f = Curve.modulus;
  let a = Curve.a;
  let d = Curve.d;

  // constant case
  if (Point.isConstant(p1) && Point.isConstant(p2)) {
    let p3 = twistedAdd(Point.toBigint(p1), Point.toBigint(p2), f, a, d);
    return Point.from(p3);
  }

  assert(
    Curve.modulus > l2Mask + 1n,
    'Base field moduli smaller than 2^176 are not supported'
  );

  // witness and range-check denominators, x3, y3
  let witnesses = exists(12, () => {
    let [x1_, x2_, y1_, y2_] = Field3.toBigints(x1, x2, y1, y2);

    // TODO: reuse code in twistedAdd to avoid recomputing these

    let x1x2 = mod(x1_ * x2_, f);
    let y1y2 = mod(y1_ * y2_, f);
    let x1y2 = mod(x1_ * y2_, f);
    let y1x2 = mod(y1_ * x2_, f);
    let ax1x2 = mod(a * x1x2, f);

    let x3Num = mod(x1y2 + y1x2, f);
    let y3Num = mod(y1y2 - ax1x2, f);

    let dx1x2y1y2 = mod(d * x1x2 * y1y2, f);

    let x3Denom = inverse(mod(1n + dx1x2y1y2, f), f) ?? 0n;
    let y3Denom = inverse(mod(1n - dx1x2y1y2, f), f) ?? 0n;

    let x3 = mod(x3Num * x3Denom, f);
    let y3 = mod(y3Num * y3Denom, f);

    return [...split(x3Denom), ...split(y3Denom), ...split(x3), ...split(y3)];
  });
  let [dx0, dx1, dx2, dy0, dy1, dy2, x30, x31, x32, y30, y31, y32] = witnesses;
  let x3Den: Field3 = [dx0, dx1, dx2];
  let y3Den: Field3 = [dy0, dy1, dy2];
  let x3: Field3 = [x30, x31, x32];
  let y3: Field3 = [y30, y31, y32];
  ForeignField.assertAlmostReduced([x3Den, x3, y3], f);
  ForeignField.assertAlmostReduced([y3Den], f);

  // the formula for point addition is well defined for curves in use,
  // so we don't need to check that the denominators are non-zero

  // x3 = (x1 * y2 + y1 * x2) / (1 + d * x1 * x2 * y1 * y2)
  // y3 = (y1 * y2 - a * x1 * x2) / (1 - d * x1 * x2 * y1 * y2)

  let one = Field3.from(1n);
  let x1y2 = ForeignField.mul(x1, y2, f);
  let y1x2 = ForeignField.mul(y1, x2, f);
  let x3Num = ForeignField.add(x1y2, y1x2, f);
  let y1y2 = ForeignField.mul(y1, y2, f);
  let x1x2 = ForeignField.mul(x1, x2, f);
  let ax1x2 = ForeignField.mul(Field3.from(a), x1x2, f);
  let y3Num = ForeignField.sub(y1y2, ax1x2, f);

  let x1x2y1y2 = ForeignField.mul(x1x2, y1y2, f);
  let dx1x2y1y2 = ForeignField.mul(Field3.from(d), x1x2y1y2, f);
  Provable.equal(
    Field3,
    x3Den,
    ForeignField.add(one, dx1x2y1y2, f)
  ).assertTrue();
  Provable.equal(
    Field3,
    y3Den,
    ForeignField.sub(one, dx1x2y1y2, f)
  ).assertTrue();

  ForeignField.assertMul(x3Num, x3Den, x3, f);
  ForeignField.assertMul(y3Num, y3Den, y3, f);

  return { x: x3, y: y3 };
}

function double(p1: Point, Curve: { modulus: bigint; d: bigint }) {
  let { x: x1, y: y1 } = p1;
  let f = Curve.modulus;
  let d = Curve.d;

  // constant case
  if (Point.isConstant(p1)) {
    let p3 = twistedDouble(Point.toBigint(p1), f, Curve.d);
    return Point.from(p3);
  }

  // witness and range-check denominators, x3, y3
  let witnesses = exists(12, () => {
    let [x1_, y1_] = Field3.toBigints(x1, y1);

    let x1x1 = mod(x1_ * x1_, f);
    let y1y1 = mod(y1_ * y1_, f);
    let x1y1 = mod(x1_ * y1_, f);

    let x3Den = inverse(mod(1n + d * x1x1 * y1y1, f), f) ?? 0n;
    let y3Den = inverse(mod(1n - d * x1x1 * y1y1, f), f) ?? 0n;

    let x3 = mod(2n * x1y1 * x3Den, f);
    let y3 = mod((y1y1 - x1x1) * y3Den, f);

    return [...split(x3Den), ...split(y3Den), ...split(x3), ...split(y3)];
  });
  let [dx0, dx1, dx2, dy0, dy1, dy2, x30, x31, x32, y30, y31, y32] = witnesses;
  let x3Den: Field3 = [dx0, dx1, dx2];
  let y3Den: Field3 = [dy0, dy1, dy2];
  let x3: Field3 = [x30, x31, x32];
  let y3: Field3 = [y30, y31, y32];
  ForeignField.assertAlmostReduced([x3Den, x3, y3], f);
  ForeignField.assertAlmostReduced([y3Den], f);

  // x3 = 2*x1*y1 / (1 + d * x1^2 * y1^2)
  // y3 = (y1^2 - x1^2) / (1 - d * x1^2 * y1^2)

  let one = Field3.from(1n);
  let x1x1 = ForeignField.mul(x1, x1, f);
  let y1y1 = ForeignField.mul(y1, y1, f);
  let x1y1 = ForeignField.mul(x1, y1, f);
  let x3Num = ForeignField.add(x1y1, x1y1, f);
  let y3Num = ForeignField.sub(y1y1, x1x1, f);

  let x1x1y1y1 = ForeignField.mul(x1x1, y1y1, f);
  let dx1x1y1y1 = ForeignField.mul(Field3.from(d), x1x1y1y1, f);
  Provable.equal(
    Field3,
    x3Den,
    ForeignField.add(one, dx1x1y1y1, f)
  ).assertTrue();
  Provable.equal(
    Field3,
    y3Den,
    ForeignField.sub(one, dx1x1y1y1, f)
  ).assertTrue();

  ForeignField.assertMul(x3Num, x3Den, x3, f);
  ForeignField.assertMul(y3Num, y3Den, y3, f);

  return { x: x3, y: y3 };
}

function negate({ x, y }: Point, Curve: { modulus: bigint }) {
  return { x: ForeignField.negate(x, Curve.modulus), y };
}

function assertOnCurve(
  p: Point,
  { modulus: f, a, d }: { modulus: bigint; a: bigint; d: bigint }
) {
  let { x, y } = p;
  let one = Field3.from(1n);

  // a * x^2 + y^2 = 1 + d * x^2 * y^2

  let x2 = ForeignField.mul(x, x, f);
  let y2 = ForeignField.mul(y, y, f);
  ForeignField.assertAlmostReduced([x2, x, y], f);
  ForeignField.assertAlmostReduced([y2], f);

  let aTimesX2Minus1 = ForeignField.sub(
    ForeignField.mul(Field3.from(a), x2, f),
    one,
    f
  );
  let dTimesX2 = ForeignField.mul(Field3.from(d), x2, f);

  let message: string | undefined;
  if (Point.isConstant(p)) {
    message = `assertOnCurve(): (${x}, ${y}) is not on the curve.`;
  }
  ForeignField.assertMul(dTimesX2, y2, aTimesX2Minus1, f, message);
}
