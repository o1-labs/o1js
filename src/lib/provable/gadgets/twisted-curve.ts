import { Provable } from '../provable.js';
import { assert } from './common.js';
import { Field3, ForeignField } from './foreign-field.js';
import { l2Mask } from './range-check.js';
import { provable } from '../types/provable-derivers.js';
import {
  AffineTwistedCurve,
  GroupAffineTwisted,
  affineTwistedAdd,
  affineTwistedDouble,
  affineTwistedZero,
} from '../../../bindings/crypto/elliptic-curve.js';
import { assertPositiveInteger } from '../../../bindings/crypto/non-negative.js';
import { sliceField3 } from './bit-slices.js';
import { arrayGetGeneric } from './elliptic-curve.js';

// external API
export { TwistedCurve };

// internal API
export { Point, simpleMapToCurve, arrayGetGeneric };

const TwistedCurve = {
  add,
  double,
  negate,
  assertOnCurve,
  scale,
  multiScalarMul,
  assertInSubgroup,
};

/**
 * Non-zero twisted elliptic curve point.
 */
type Point = { x: Field3; y: Field3 };
type point = { x: bigint; y: bigint };

const Point = {
  from({ x, y }: point): Point {
    return { x: Field3.from(x), y: Field3.from(y) };
  },
  toBigint({ x, y }: Point) {
    let x_ = Field3.toBigint(x);
    let y_ = Field3.toBigint(y);
    return { x: x_, y: y_ };
  },
  isConstant: (P: Point) => Provable.isConstant(Point, P),

  /**
   * Random point on the curve.
   */
  random(Curve: AffineTwistedCurve) {
    return Point.from(random(Curve));
  },

  provable: provable({ x: Field3, y: Field3 }),
};

function add(p1: Point, p2: Point, Curve: { modulus: bigint; a: bigint; d: bigint }) {
  let { x: x1, y: y1 } = p1;
  let { x: x2, y: y2 } = p2;
  let f = Curve.modulus;
  let a = Curve.a;
  let d = Curve.d;

  // constant case
  if (Point.isConstant(p1) && Point.isConstant(p2)) {
    let p3 = affineTwistedAdd(Point.toBigint(p1), Point.toBigint(p2), f, a, d);
    return Point.from(p3);
  }

  assert(Curve.modulus > l2Mask + 1n, 'Base field moduli smaller than 2^176 are not supported');

  // the formula for point addition is well defined for curves in use,
  // so we don't need to check that the denominators are non-zero

  // x3 = (x1 * y2 + y1 * x2) / (1 + d * x1 * x2 * y1 * y2)
  // y3 = (y1 * y2 - a * x1 * x2) / (1 - d * x1 * x2 * y1 * y2)

  let x1x2 = ForeignField.mul(x1, x2, f);
  let y1y2 = ForeignField.mul(y1, y2, f);
  let x1y2 = ForeignField.mul(x1, y2, f);
  let y1x2 = ForeignField.mul(y1, x2, f);
  let ax1x2 = ForeignField.mul(Field3.from(a), x1x2, f);

  let x3Num = ForeignField.add(x1y2, y1x2, f);
  let y3Num = ForeignField.sub(y1y2, ax1x2, f);

  let x1x2y1y2 = ForeignField.mul(x1x2, y1y2, f);
  let dx1x2y1y2 = ForeignField.mul(Field3.from(d), x1x2y1y2, f);

  let one = Field3.from(1n);
  let x3Denom = ForeignField.add(one, dx1x2y1y2, f);
  let y3Denom = ForeignField.sub(one, dx1x2y1y2, f);

  let x3 = ForeignField.div(x3Num, x3Denom, f);
  let y3 = ForeignField.div(y3Num, y3Denom, f);

  ForeignField.assertAlmostReduced(
    [x1x2, y1y2, x3Num, y3Num, x1x2y1y2, x3Denom, y3Denom, x3, y3],
    f
  );

  return { x: x3, y: y3 };
}

function double(p1: Point, Curve: { modulus: bigint; a: bigint; d: bigint }): Point {
  let { x: x1, y: y1 } = p1;
  let f = Curve.modulus;
  let d = Curve.d;

  // constant case
  if (Point.isConstant(p1)) {
    let p3 = affineTwistedDouble(Point.toBigint(p1), f, Curve.a, Curve.d);
    return Point.from(p3);
  }

  // x3 = 2*x1*y1 / (1 + d * x1^2 * y1^2)
  // y3 = (y1^2 - a * x1^2) / (1 - d * x1^2 * y1^2)
  let one = Field3.from(1n);
  let a = Field3.from(Curve.a);
  let x1x1 = ForeignField.mul(x1, x1, f);
  let y1y1 = ForeignField.mul(y1, y1, f);
  let x1y1 = ForeignField.mul(x1, y1, f);
  let ax1x1 = ForeignField.mul(a, x1x1, f);
  let x3Num = ForeignField.add(x1y1, x1y1, f);
  let y3Num = ForeignField.sub(y1y1, ax1x1, f);
  let x1x1y1y1 = ForeignField.mul(x1x1, y1y1, f);
  let dx1x1y1y1 = ForeignField.mul(Field3.from(d), x1x1y1y1, f);
  let x3Den = ForeignField.add(one, dx1x1y1y1, f);
  let y3Den = ForeignField.sub(one, dx1x1y1y1, f);
  let x3 = ForeignField.div(x3Num, x3Den, f);
  let y3 = ForeignField.div(y3Num, y3Den, f);

  ForeignField.assertAlmostReduced([x3Num, y3Num, x3Den, y3Den, x3, y3], f);

  return { x: x3, y: y3 };
}

function negate({ x, y }: Point, Curve: { modulus: bigint }) {
  return { x: ForeignField.negate(x, Curve.modulus), y };
}

function assertOnCurve(p: Point, { modulus: f, a, d }: { modulus: bigint; a: bigint; d: bigint }) {
  let { x, y } = p;
  let one = Field3.from(1n);

  // a * x^2 + y^2 = 1 + d * x^2 * y^2

  let x2 = ForeignField.mul(x, x, f);
  let y2 = ForeignField.mul(y, y, f);

  let aTimesX2PlusY2 = ForeignField.add(ForeignField.mul(Field3.from(a), x2, f), y2, f);

  let aTimesX2PlusY2Minus1 = ForeignField.sub(aTimesX2PlusY2, one, f);
  let dTimesX2 = ForeignField.mul(Field3.from(d), x2, f);

  ForeignField.assertAlmostReduced([x2, x, y], f);
  ForeignField.assertAlmostReduced([y2, aTimesX2PlusY2Minus1, dTimesX2], f);

  let message: string | undefined;
  if (Point.isConstant(p)) {
    message = `assertOnCurve(): (${x}, ${y}) is not on the curve.`;
  }
  ForeignField.assertMul(dTimesX2, y2, aTimesX2PlusY2Minus1, f, message);
}

/**
 * Twisted curve scalar multiplication, `scalar*point`
 */
function scale(
  scalar: Field3,
  point: Point,
  Curve: AffineTwistedCurve,
  config?: {
    mode?: 'assert-zero' | 'assert-nonzero';
    windowSize?: number;
    multiples?: Point[];
  }
) {
  config = config ?? {};
  config.windowSize ??= Point.isConstant(point) ? 4 : 3;
  return multiScalarMul([scalar], [point], Curve, [config], config.mode);
}

// check whether a point equals a constant point
function equals(p1: Point, p2: point, Curve: { modulus: bigint }) {
  let xEquals = ForeignField.equals(p1.x, p2.x, Curve.modulus);
  let yEquals = ForeignField.equals(p1.y, p2.y, Curve.modulus);
  return xEquals.and(yEquals);
}

// checks whether the twisted elliptic curve point g is in the subgroup defined by [order]g = 0
function assertInSubgroup(g: Point, Curve: AffineTwistedCurve) {
  if (!Curve.hasCofactor) return;
  scale(Field3.from(Curve.order), g, Curve, { mode: 'assert-zero' });
}

function multiScalarMulConstant(
  scalars: Field3[],
  points: Point[],
  Curve: AffineTwistedCurve
): Point {
  let n = points.length;
  assert(scalars.length === n, 'Points and scalars lengths must match');
  assertPositiveInteger(n, 'Expected at least 1 point and scalar');

  // TODO dedicated MSM
  let s = scalars.map(Field3.toBigint);
  let P = points.map(Point.toBigint);
  let sum: GroupAffineTwisted = Curve.zero;
  for (let i = 0; i < n; i++) {
    sum = Curve.add(sum, Curve.scale(P[i], s[i]));
  }
  return Point.from(sum);
}

/**
 * Multi-scalar multiplication:
 *
 * s_0 * P_0 + ... + s_(n-1) * P_(n-1)
 *
 * where P_i are any points.
 *
 * Implementation: We double all points together and leverage a precomputed table of size 2^c to avoid all but every cth addition.
 *
 * Note: this algorithm targets a small number of points
 *
 * TODO: could use lookups for picking precomputed multiples, instead of O(2^c) provable switch
 */
function multiScalarMul(
  scalars: Field3[],
  points: Point[],
  Curve: AffineTwistedCurve,
  tableConfigs: ({ windowSize?: number; multiples?: Point[] } | undefined)[] = [],
  mode?: 'assert-zero' | 'assert-nonzero'
): Point {
  let n = points.length;
  assert(scalars.length === n, 'Points and scalars lengths must match');
  assertPositiveInteger(n, 'Expected at least 1 point and scalar');

  // constant case
  if (scalars.every(Field3.isConstant) && points.every(Point.isConstant)) {
    return multiScalarMulConstant(scalars, points, Curve);
  }

  // parse or build point tables
  let windowSizes = points.map((_, i) => tableConfigs[i]?.windowSize ?? 1);
  let tables = points.map((P, i) =>
    getPointTable(Curve, P, windowSizes[i], tableConfigs[i]?.multiples)
  );

  let maxBits = Curve.Scalar.sizeInBits;

  // slice scalars
  let scalarChunks = scalars.map((s, i) => sliceField3(s, { maxBits, chunkSize: windowSizes[i] }));

  // soundness follows because add() and double() are sound, on all inputs that
  // are valid non-zero curve points
  let sum = Point.from(Curve.zero);

  for (let i = maxBits - 1; i >= 0; i--) {
    // add in multiple of each point
    for (let j = 0; j < n; j++) {
      let windowSize = windowSizes[j];
      if (i % windowSize === 0) {
        // pick point to add based on the scalar chunk
        let sj = scalarChunks[j][i / windowSize];
        let sjP = windowSize === 1 ? points[j] : arrayGetGeneric(Point.provable, tables[j], sj);

        // ec addition
        sum = add(sum, sjP, Curve);
      }
    }

    if (i === 0) break;

    // jointly double all points
    // (note: the highest couple of bits will not create any constraints because
    // sum is constant; no need to handle that explicitly)
    sum = double(sum, Curve);
  }

  let isZero = equals(sum, affineTwistedZero, Curve);
  if (mode == 'assert-nonzero') {
    isZero.assertFalse();
  } else if (mode == 'assert-zero') {
    isZero.assertTrue();
  }

  return sum;
}

/**
 * Given a point P, create the list of multiples [0, P, 2P, 3P, ..., (2^windowSize-1) * P].
 * This method is provable, but won't create any constraints given a constant point.
 */
function getPointTable(
  Curve: AffineTwistedCurve,
  P: Point,
  windowSize: number,
  table?: Point[]
): Point[] {
  assertPositiveInteger(windowSize, 'invalid window size');
  let n = 1 << windowSize; // n >= 2

  assert(table === undefined || table.length === n, 'invalid table');
  if (table !== undefined) return table;

  table = [Point.from(Curve.zero), P];
  if (n === 2) return table;

  let Pi = double(P, Curve);
  table.push(Pi);
  for (let i = 3; i < n; i++) {
    Pi = add(Pi, P, Curve);
    table.push(Pi);
  }
  return table;
}

function random(Curve: AffineTwistedCurve) {
  let x = Curve.Field.random();
  return simpleMapToCurve(x, Curve);
}

/**
 * Given an x coordinate (base field element), increment it until we find one with
 * a y coordinate that satisfies the curve equation, and return the point.
 *
 * If the curve has a cofactor, multiply by it to get a point in the correct subgroup.
 */
function simpleMapToCurve(x: bigint, Curve: AffineTwistedCurve) {
  const F = Curve.Field;
  let y: bigint | undefined = undefined;

  // increment x until we find a y coordinate
  while (y === undefined) {
    x = F.add(x, 1n);
    // solve y^2 = (1 - a * x^2)/(1 - d * x^2)
    let x2 = F.square(x);
    let num = F.sub(1n, F.mul(x2, Curve.a));
    let den = F.sub(1n, F.mul(x2, Curve.d));
    if (den == 0n) continue;
    let y2 = F.div(num, den)!; // guaranteed that den has an inverse
    y = F.sqrt(y2);
  }

  let p = { x, y };

  // clear cofactor
  if (Curve.hasCofactor) {
    p = Curve.scale(p, Curve.cofactor!);
  }
  return p;
}
