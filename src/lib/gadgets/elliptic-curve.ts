import {
  FiniteField,
  inverse,
  mod,
} from '../../bindings/crypto/finite_field.js';
import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { assert, exists } from './common.js';
import {
  Field3,
  ForeignField,
  Sum,
  assertRank1,
  split,
  weakBound,
} from './foreign-field.js';
import { multiRangeCheck } from './range-check.js';
import { printGates } from '../testing/constraint-system.js';
import { sha256 } from 'js-sha256';
import { bytesToBigInt } from '../../bindings/crypto/bigint-helpers.js';
import {
  CurveAffine,
  Pallas,
  affineAdd,
  affineDouble,
} from '../../bindings/crypto/elliptic_curve.js';
import { Bool } from '../bool.js';
import { provable } from '../circuit_value.js';

/**
 * Non-zero elliptic curve point in affine coordinates.
 */
type Point = { x: Field3; y: Field3 };
type point = { x: bigint; y: bigint };

/**
 * ECDSA signature consisting of two curve scalars.
 */
type Signature = { r: Field3; s: Field3 };
type signature = { r: bigint; s: bigint };

function add(p1: Point, p2: Point, f: bigint) {
  let { x: x1, y: y1 } = p1;
  let { x: x2, y: y2 } = p2;

  // constant case
  if (Provable.isConstant(Point, p1) && Provable.isConstant(Point, p2)) {
    let p3 = affineAdd(Point.toBigint(p1), Point.toBigint(p2), f);
    return Point.from(p3);
  }

  // witness and range-check slope, x3, y3
  let witnesses = exists(9, () => {
    let [x1_, x2_, y1_, y2_] = Field3.toBigints(x1, x2, y1, y2);
    let denom = inverse(mod(x1_ - x2_, f), f);

    let m = denom !== undefined ? mod((y1_ - y2_) * denom, f) : 0n;
    let m2 = mod(m * m, f);
    let x3 = mod(m2 - x1_ - x2_, f);
    let y3 = mod(m * (x1_ - x3) - y1_, f);

    return [...split(m), ...split(x3), ...split(y3)];
  });
  let [m0, m1, m2, x30, x31, x32, y30, y31, y32] = witnesses;
  let m: Field3 = [m0, m1, m2];
  let x3: Field3 = [x30, x31, x32];
  let y3: Field3 = [y30, y31, y32];

  multiRangeCheck(m);
  multiRangeCheck(x3);
  multiRangeCheck(y3);
  let mBound = weakBound(m[2], f);
  let x3Bound = weakBound(x3[2], f);
  // we dont need to bound y3[2] because it's never one of the inputs to a multiplication

  // (x1 - x2)*m = y1 - y2
  let deltaX = new Sum(x1).sub(x2);
  let deltaY = new Sum(y1).sub(y2);
  let qBound1 = assertRank1(deltaX, m, deltaY, f);

  // m^2 = x1 + x2 + x3
  let xSum = new Sum(x1).add(x2).add(x3);
  let qBound2 = assertRank1(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = new Sum(x1).sub(x3);
  let ySum = new Sum(y1).add(y3);
  let qBound3 = assertRank1(deltaX1X3, m, ySum, f);

  // bounds checks
  multiRangeCheck([mBound, x3Bound, qBound1]);
  multiRangeCheck([qBound2, qBound3, Field.from(0n)]);

  return { x: x3, y: y3 };
}

function double(p1: Point, f: bigint) {
  let { x: x1, y: y1 } = p1;

  // constant case
  if (Provable.isConstant(Point, p1)) {
    let p3 = affineDouble(Point.toBigint(p1), f);
    return Point.from(p3);
  }

  // witness and range-check slope, x3, y3
  let witnesses = exists(9, () => {
    let [x1_, y1_] = Field3.toBigints(x1, y1);
    let denom = inverse(mod(2n * y1_, f), f);

    let m = denom !== undefined ? mod(3n * mod(x1_ ** 2n, f) * denom, f) : 0n;
    let m2 = mod(m * m, f);
    let x3 = mod(m2 - 2n * x1_, f);
    let y3 = mod(m * (x1_ - x3) - y1_, f);

    return [...split(m), ...split(x3), ...split(y3)];
  });
  let [m0, m1, m2, x30, x31, x32, y30, y31, y32] = witnesses;
  let m: Field3 = [m0, m1, m2];
  let x3: Field3 = [x30, x31, x32];
  let y3: Field3 = [y30, y31, y32];

  multiRangeCheck(m);
  multiRangeCheck(x3);
  multiRangeCheck(y3);
  let mBound = weakBound(m[2], f);
  let x3Bound = weakBound(x3[2], f);
  // we dont need to bound y3[2] because it's never one of the inputs to a multiplication

  // x1^2 = x1x1
  let x1x1 = ForeignField.mul(x1, x1, f);

  // 2*y1*m = 3*x1x1
  // TODO this assumes the curve has a == 0
  let y1Times2 = new Sum(y1).add(y1);
  let x1x1Times3 = new Sum(x1x1).add(x1x1).add(x1x1);
  let qBound1 = assertRank1(y1Times2, m, x1x1Times3, f);

  // m^2 = 2*x1 + x3
  let xSum = new Sum(x1).add(x1).add(x3);
  let qBound2 = assertRank1(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = new Sum(x1).sub(x3);
  let ySum = new Sum(y1).add(y3);
  let qBound3 = assertRank1(deltaX1X3, m, ySum, f);

  // bounds checks
  multiRangeCheck([mBound, x3Bound, qBound1]);
  multiRangeCheck([qBound2, qBound3, Field.from(0n)]);

  return { x: x3, y: y3 };
}

function verifyEcdsa(
  Curve: CurveAffine,
  ia: point,
  signature: Signature,
  msgHash: Field3,
  publicKey: Point,
  table?: {
    windowSize: number; // what we called c before
    multiples?: point[]; // 0, G, 2*G, ..., (2^c-1)*G
  }
) {
  // constant case
  if (
    Provable.isConstant(Signature, signature) &&
    Field3.isConstant(msgHash) &&
    Provable.isConstant(Point, publicKey)
  ) {
    let isValid = verifyEcdsaConstant(
      Curve,
      Signature.toBigint(signature),
      Field3.toBigint(msgHash),
      Point.toBigint(publicKey)
    );
    assert(isValid, 'invalid signature');
    return;
  }

  // provable case
  // TODO should we check that the publicKey is a valid point? probably not

  let { r, s } = signature;
  let sInv = ForeignField.inv(s, Curve.order);
  let u1 = ForeignField.mul(msgHash, sInv, Curve.order);
  let u2 = ForeignField.mul(r, sInv, Curve.order);

  let IA = Point.from(ia);
  let R = varPlusFixedScalarMul(Curve, IA, u1, publicKey, u2, table);

  // assert that X != IA, and add -IA
  Provable.equal(Point, R, IA).assertFalse();
  R = add(R, Point.from(Curve.negate(Curve.fromNonzero(ia))), Curve.order);

  // reduce R.x modulo the curve order
  let Rx = ForeignField.mul(R.x, Field3.from(1n), Curve.order);
  Provable.assertEqual(Field3.provable, Rx, r);
}

/**
 * Scalar mul that we need for ECDSA:
 *
 * IA + s*P + t*G,
 *
 * where IA is the initial aggregator, P is any point and G is the generator.
 *
 * We double both points together and leverage a precomputed table
 * of size 2^c to avoid all but every cth addition for t*G.
 */
function varPlusFixedScalarMul(
  Curve: CurveAffine,
  IA: Point,
  s: Field3,
  P: Point,
  t: Field3,
  table?: {
    windowSize: number; // what we called c before
    multiples?: point[]; // 0, G, 2*G, ..., (2^c-1)*G
  }
): Point {
  throw Error('TODO');
}

/**
 * Bigint implementation of ECDSA verify
 */
function verifyEcdsaConstant(
  Curve: CurveAffine,
  { r, s }: { r: bigint; s: bigint },
  msgHash: bigint,
  publicKey: { x: bigint; y: bigint }
) {
  let q = Curve.order;
  let QA = Curve.fromNonzero(publicKey);
  if (!Curve.isOnCurve(QA)) return false;
  if (Curve.hasCofactor && !Curve.isInSubgroup(QA)) return false;
  if (r < 1n || r >= Curve.order) return false;
  if (s < 1n || s >= Curve.order) return false;

  let sInv = inverse(s, q);
  if (sInv === undefined) throw Error('impossible');
  let u1 = mod(msgHash * sInv, q);
  let u2 = mod(r * sInv, q);

  let X = Curve.add(Curve.scale(Curve.one, u1), Curve.scale(QA, u2));
  if (Curve.equal(X, Curve.zero)) return false;

  return mod(X.x, q) === r;
}

/**
 * For EC scalar multiplication we use an initial point which is subtracted
 * at the end, to avoid encountering the point at infinity.
 *
 * This is a simple hash-to-group algorithm which finds that initial point.
 * It's important that this point has no known discrete logarithm so that nobody
 * can create an invalid proof of EC scaling.
 */
function initialAggregator(F: FiniteField, { a, b }: { a: bigint; b: bigint }) {
  let h = sha256.create();
  h.update('o1js:ecdsa');
  let bytes = h.array();

  // bytes represent a 256-bit number
  // use that as x coordinate
  let x = F.mod(bytesToBigInt(bytes));
  let y: bigint | undefined = undefined;

  // increment x until we find a y coordinate
  while (y === undefined) {
    // solve y^2 = x^3 + ax + b
    let x3 = F.mul(F.square(x), x);
    let y2 = F.add(x3, F.mul(a, x) + b);
    y = F.sqrt(y2);
  }
  return { x: F.mod(x), y, infinity: false };
}

const Point = {
  ...provable({ x: Field3.provable, y: Field3.provable }),
  from({ x, y }: point): Point {
    return { x: Field3.from(x), y: Field3.from(y) };
  },
  toBigint({ x, y }: Point) {
    return { x: Field3.toBigint(x), y: Field3.toBigint(y), infinity: false };
  },
};

const Signature = {
  ...provable({ r: Field3.provable, s: Field3.provable }),
  toBigint({ r, s }: Signature): signature {
    return { r: Field3.toBigint(r), s: Field3.toBigint(s) };
  },
};

let csAdd = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let x2 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y2 = Provable.witness(Field3.provable, () => Field3.from(0n));

  let g = { x: x1, y: y1 };
  let h = { x: x2, y: y2 };

  add(g, h, exampleFields.secp256k1.modulus);
});

let csDouble = Provable.constraintSystem(() => {
  let x1 = Provable.witness(Field3.provable, () => Field3.from(0n));
  let y1 = Provable.witness(Field3.provable, () => Field3.from(0n));

  let g = { x: x1, y: y1 };

  double(g, exampleFields.secp256k1.modulus);
});

printGates(csAdd.gates);
console.log({ digest: csAdd.digest, rows: csAdd.rows });

printGates(csDouble.gates);
console.log({ digest: csDouble.digest, rows: csDouble.rows });

let point = initialAggregator(exampleFields.Fp, { a: 0n, b: 5n });
console.log({ point });
assert(Pallas.isOnCurve(Pallas.fromAffine(point)));
