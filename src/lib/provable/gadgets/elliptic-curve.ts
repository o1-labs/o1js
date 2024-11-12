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
  CurveAffine,
  GroupAffine,
  affineAdd,
  affineDouble,
} from '../../../bindings/crypto/elliptic-curve.js';
import { Bool } from '../bool.js';
import { provable } from '../types/provable-derivers.js';
import { assertPositiveInteger } from '../../../bindings/crypto/non-negative.js';
import { arrayGet, assertNotVectorEquals } from './basic.js';
import { sliceField3 } from './bit-slices.js';
import { exists } from '../core/exists.js';
import { ProvableType } from '../types/provable-intf.js';

// external API
export { EllipticCurve, Point, Ecdsa };

// internal API
export { verifyEcdsaConstant, initialAggregator, simpleMapToCurve };

const EllipticCurve = {
  add,
  double,
  negate,
  assertOnCurve,
  scale,
  assertInSubgroup,
  multiScalarMul,
};

/**
 * Non-zero elliptic curve point in affine coordinates.
 */
type Point = { x: Field3; y: Field3 };
type point = { x: bigint; y: bigint };

namespace Ecdsa {
  /**
   * ECDSA signature consisting of two curve scalars.
   */
  export type Signature = { r: Field3; s: Field3 };
  export type signature = { r: bigint; s: bigint };
}

function add(p1: Point, p2: Point, Curve: { modulus: bigint; a: bigint }) {
  let { x: x1, y: y1 } = p1;
  let { x: x2, y: y2 } = p2;
  let f = Curve.modulus;
  let [f0, f1, f2] = split(f);
  let [, , fx22] = split(f * 2n);

  // constant case
  if (Point.isConstant(p1) && Point.isConstant(p2)) {
    let p3 = affineAdd(Point.toBigint(p1), Point.toBigint(p2), f, Curve.a);
    return Point.from(p3);
  }

  assert(
    Curve.modulus > l2Mask + 1n,
    'Base field moduli smaller than 2^176 are not supported'
  );

  // witness and range-check slope, x3, y3
  let witnesses = exists(9, () => {
    let [x1_, x2_, y1_, y2_] = Field3.toBigints(x1, x2, y1, y2);
    let denom = inverse(mod(x1_ - x2_, f), f) ?? 0n;

    let m = mod((y1_ - y2_) * denom, f);
    let x3 = mod(m * m - x1_ - x2_, f);
    let y3 = mod(m * (x1_ - x3) - y1_, f);

    return [...split(m), ...split(x3), ...split(y3)];
  });
  let [m0, m1, m2, x30, x31, x32, y30, y31, y32] = witnesses;
  let m: Field3 = [m0, m1, m2];
  let x3: Field3 = [x30, x31, x32];
  let y3: Field3 = [y30, y31, y32];
  ForeignField.assertAlmostReduced([m, x3, y3], f);

  // check that x1 != x2
  // we assume x1, x2 are almost reduced, so deltaX <= x1 - x2 + f < 3f
  // which means we need to check that deltaX != 0, f, 2f
  let deltaX = ForeignField.sub(x1, x2, f);
  let deltaX01 = deltaX[0].add(deltaX[1].mul(1n << l)).seal();
  assertNotVectorEquals([deltaX01, deltaX[2]], [0n, 0n]); // != 0
  assertNotVectorEquals([deltaX01, deltaX[2]], [f0 + (f1 << l), f2]); // != f
  deltaX[2].assertNotEquals(fx22); // != 2f (stronger check bc assuming deltaX < f doesn't harm completeness)

  // (x1 - x2)*m = y1 - y2
  let deltaY = ForeignField.Sum(y1).sub(y2);
  ForeignField.assertMul(deltaX, m, deltaY, f);

  // m^2 = x1 + x2 + x3
  let xSum = ForeignField.Sum(x1).add(x2).add(x3);
  ForeignField.assertMul(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = ForeignField.Sum(x1).sub(x3);
  let ySum = ForeignField.Sum(y1).add(y3);
  ForeignField.assertMul(deltaX1X3, m, ySum, f);

  return { x: x3, y: y3 };
}

function double(p1: Point, Curve: { modulus: bigint; a: bigint }) {
  let { x: x1, y: y1 } = p1;
  let f = Curve.modulus;

  // constant case
  if (Point.isConstant(p1)) {
    let p3 = affineDouble(Point.toBigint(p1), f, Curve.a);
    return Point.from(p3);
  }

  // witness and range-check slope, x3, y3
  let witnesses = exists(9, () => {
    let [x1_, y1_] = Field3.toBigints(x1, y1);
    let denom = inverse(mod(2n * y1_, f), f) ?? 0n;

    let m = mod((3n * mod(x1_ ** 2n, f) + Curve.a) * denom, f);
    let x3 = mod(m * m - 2n * x1_, f);
    let y3 = mod(m * (x1_ - x3) - y1_, f);

    return [...split(m), ...split(x3), ...split(y3)];
  });
  let [m0, m1, m2, x30, x31, x32, y30, y31, y32] = witnesses;
  let m: Field3 = [m0, m1, m2];
  let x3: Field3 = [x30, x31, x32];
  let y3: Field3 = [y30, y31, y32];
  ForeignField.assertAlmostReduced([m, x3, y3], f);

  // x1^2 = x1x1
  let x1x1 = ForeignField.mul(x1, x1, f);

  // 2*y1*m = 3*x1x1 + a
  let y1Times2 = ForeignField.Sum(y1).add(y1);
  let x1x1Times3PlusA = ForeignField.Sum(x1x1).add(x1x1).add(x1x1);
  if (Curve.a !== 0n)
    x1x1Times3PlusA = x1x1Times3PlusA.add(Field3.from(Curve.a));
  ForeignField.assertMul(y1Times2, m, x1x1Times3PlusA, f);

  // m^2 = 2*x1 + x3
  let xSum = ForeignField.Sum(x1).add(x1).add(x3);
  ForeignField.assertMul(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = ForeignField.Sum(x1).sub(x3);
  let ySum = ForeignField.Sum(y1).add(y3);
  ForeignField.assertMul(deltaX1X3, m, ySum, f);

  return { x: x3, y: y3 };
}

function negate({ x, y }: Point, Curve: { modulus: bigint }) {
  return { x, y: ForeignField.negate(y, Curve.modulus) };
}

function assertOnCurve(
  p: Point,
  { modulus: f, a, b }: { modulus: bigint; b: bigint; a: bigint }
) {
  let { x, y } = p;
  let x2 = ForeignField.mul(x, x, f);

  // Ensure x2, x, and y are almost reduced to prevent potential exploitation
  // by a malicious prover adding large multiples of f, which could violate
  // the precondition of ForeignField.assertMul
  ForeignField.assertAlmostReduced([x2, x, y], f);

  let y2 = ForeignField.mul(y, y, f);
  let y2MinusB = ForeignField.Sum(y2).sub(Field3.from(b));

  // (x^2 + a) * x = y^2 - b
  let x2PlusA = ForeignField.Sum(x2);
  if (a !== 0n) x2PlusA = x2PlusA.add(Field3.from(a));
  let message: string | undefined;
  if (Point.isConstant(p)) {
    message = `assertOnCurve(): (${x}, ${y}) is not on the curve.`;
  }
  ForeignField.assertMul(x2PlusA, x, y2MinusB, f, message);
}

/**
 * EC scalar multiplication, `scalar*point`
 *
 * The result is constrained to be not zero.
 */
function scale(
  scalar: Field3,
  point: Point,
  Curve: CurveAffine,
  config: {
    mode?: 'assert-nonzero' | 'assert-zero';
    windowSize?: number;
    multiples?: Point[];
  } = { mode: 'assert-nonzero' }
) {
  config.windowSize ??= Point.isConstant(point) ? 4 : 3;
  return multiScalarMul([scalar], [point], Curve, [config], config.mode);
}

// checks whether the elliptic curve point g is in the subgroup defined by [order]g = 0
function assertInSubgroup(p: Point, Curve: CurveAffine) {
  if (!Curve.hasCofactor) return;
  scale(Field3.from(Curve.order), p, Curve, { mode: 'assert-zero' });
}

// check whether a point equals a constant point
// TODO implement the full case of two vars
function equals(p1: Point, p2: point, Curve: { modulus: bigint }) {
  let xEquals = ForeignField.equals(p1.x, p2.x, Curve.modulus);
  let yEquals = ForeignField.equals(p1.y, p2.y, Curve.modulus);
  return xEquals.and(yEquals);
}

function verifyEcdsaGeneric(
  Curve: CurveAffine,
  signature: Ecdsa.Signature,
  msgHash: Field3,
  publicKey: Point,
  multiScalarMul: (
    scalars: Field3[],
    points: Point[],
    Curve: CurveAffine,
    tableConfigs?: (
      | {
          windowSize?: number;
          multiples?: Point[];
        }
      | undefined
    )[],
    mode?: 'assert-nonzero' | 'assert-zero',
    ia?: point,
    hashed?: boolean
  ) => Point,
  config: {
    G?: { windowSize: number; multiples?: Point[] };
    P?: { windowSize: number; multiples?: Point[] };
    ia?: point;
  } = { G: { windowSize: 4 }, P: { windowSize: 4 } }
): Bool {
  // constant case
  if (
    EcdsaSignature.isConstant(signature) &&
    Field3.isConstant(msgHash) &&
    Point.isConstant(publicKey)
  ) {
    let isValid = verifyEcdsaConstant(
      Curve,
      EcdsaSignature.toBigint(signature),
      Field3.toBigint(msgHash),
      Point.toBigint(publicKey)
    );
    return new Bool(isValid);
  }

  // provable case
  // note: usually we don't check validity of inputs, like that the public key is a valid curve point
  // we make an exception for the two non-standard conditions r != 0 and s != 0,
  // which are unusual to capture in types and could be considered part of the verification algorithm
  let { r, s } = signature;
  ForeignField.inv(r, Curve.order); // proves r != 0 (important, because r = 0 => u2 = 0 kills the private key contribution)
  let sInv = ForeignField.inv(s, Curve.order); // proves s != 0
  let u1 = ForeignField.mul(msgHash, sInv, Curve.order);
  let u2 = ForeignField.mul(r, sInv, Curve.order);

  let G = Point.from(Curve.one);
  let R = multiScalarMul(
    [u1, u2],
    [G, publicKey],
    Curve,
    config && [config.G, config.P],
    'assert-nonzero',
    config?.ia
  );
  // this ^ already proves that R != 0 (part of ECDSA verification)

  // reduce R.x modulo the curve order
  let Rx = ForeignField.mul(R.x, Field3.from(1n), Curve.order);

  // we have to prove that Rx is canonical, because we check signature validity based on whether Rx _exactly_ equals the input r.
  // if we allowed non-canonical Rx, the prover could make verify() return false on a valid signature, by adding a multiple of `Curve.order` to Rx.
  ForeignField.assertLessThan(Rx, Curve.order);

  // assert s to be canonical
  ForeignField.assertLessThan(s, Curve.order);

  return Provable.equal(Field3, Rx, r);
}

/**
 * Verify an ECDSA signature.
 *
 * Details about the `config` parameter:
 * - For both the generator point `G` and public key `P`, `config` allows you to specify:
 *   - the `windowSize` which is used in scalar multiplication for this point.
 *     this flexibility is good because the optimal window size is different for constant and non-constant points.
 *     empirically, `windowSize=4` for constants and 3 for variables leads to the fewest constraints.
 *     our defaults reflect that the generator is always constant and the public key is variable in typical applications.
 *   - a table of multiples of those points, of length `2^windowSize`, which is used in the scalar multiplication gadget to speed up the computation.
 *     if these are not provided, they are computed on the fly.
 *     for the constant G, computing multiples costs no constraints, so passing them in makes no real difference.
 *     for variable public key, there is a possible use case: if the public key is a public input, then its multiples could also be.
 *     in that case, passing them in would avoid computing them in-circuit and save a few constraints.
 * - The initial aggregator `ia`, see {@link initialAggregator}. By default, `ia` is computed deterministically on the fly.
 *
 *
 * _Note_: If `signature.s` is a non-canonical element, an error will be thrown.
 * If `signature.r` is non-canonical, however, `false` will be returned.
 */
function verifyEcdsa(
  Curve: CurveAffine,
  signature: Ecdsa.Signature,
  msgHash: Field3,
  publicKey: Point,
  config: {
    G?: { windowSize: number; multiples?: Point[] };
    P?: { windowSize: number; multiples?: Point[] };
    ia?: point;
  } = { G: { windowSize: 4 }, P: { windowSize: 3 } }
) {
  return verifyEcdsaGeneric(
    Curve,
    signature,
    msgHash,
    publicKey,
    (scalars, points, Curve, configs, mode, ia) =>
      multiScalarMul(scalars, points, Curve, configs, mode, ia),
    config
  );
}

/**
 * Bigint implementation of ECDSA verify
 */
function verifyEcdsaConstant(
  Curve: CurveAffine,
  { r, s }: Ecdsa.signature,
  msgHash: bigint,
  publicKey: point
) {
  let pk = Curve.from(publicKey);
  if (Curve.equal(pk, Curve.zero)) return false;
  if (Curve.hasCofactor && !Curve.isInSubgroup(pk)) return false;
  if (r < 1n || r >= Curve.order) return false;
  if (s < 1n || s >= Curve.order) return false;

  let sInv = Curve.Scalar.inverse(s);
  assert(sInv !== undefined);
  let u1 = Curve.Scalar.mul(msgHash, sInv);
  let u2 = Curve.Scalar.mul(r, sInv);

  let R = Curve.add(Curve.scale(Curve.one, u1), Curve.scale(pk, u2));
  if (Curve.equal(R, Curve.zero)) return false;

  return Curve.Scalar.equal(R.x, r);
}

function multiScalarMulConstant(
  scalars: Field3[],
  points: Point[],
  Curve: CurveAffine,
  mode: 'assert-nonzero' | 'assert-zero' = 'assert-nonzero'
): Point {
  let n = points.length;
  assert(scalars.length === n, 'Points and scalars lengths must match');
  assertPositiveInteger(n, 'Expected at least 1 point and scalar');
  let useGlv = Curve.hasEndomorphism;

  // TODO dedicated MSM
  let s = scalars.map(Field3.toBigint);
  let P = points.map(Point.toBigint);
  let sum: GroupAffine = Curve.zero;
  for (let i = 0; i < n; i++) {
    if (useGlv) {
      sum = Curve.add(sum, Curve.Endo.scale(P[i], s[i]));
    } else {
      sum = Curve.add(sum, Curve.scale(P[i], s[i]));
    }
  }
  if (mode === 'assert-zero') {
    assert(sum.infinity, 'scalar multiplication: expected zero result');
    return Point.from(Curve.zero);
  }
  assert(!sum.infinity, 'scalar multiplication: expected non-zero result');
  return Point.from(sum);
}

/**
 * Multi-scalar multiplication:
 *
 * s_0 * P_0 + ... + s_(n-1) * P_(n-1)
 *
 * where P_i are any points.
 *
 * By default, we prove that the result is not zero.
 *
 * If you set the `mode` parameter to `'assert-zero'`, on the other hand,
 * we assert that the result is zero and just return the constant zero point.
 *
 * Implementation: We double all points together and leverage a precomputed table of size 2^c to avoid all but every cth addition.
 *
 * Note: this algorithm targets a small number of points, like 2 needed for ECDSA verification.
 *
 * TODO: could use lookups for picking precomputed multiples, instead of O(2^c) provable switch
 * TODO: custom bit representation for the scalar that avoids 0, to get rid of the degenerate addition case
 */
function multiScalarMul(
  scalars: Field3[],
  points: Point[],
  Curve: CurveAffine,
  tableConfigs: (
    | { windowSize?: number; multiples?: Point[] }
    | undefined
  )[] = [],
  mode: 'assert-nonzero' | 'assert-zero' = 'assert-nonzero',
  ia?: point
): Point {
  let n = points.length;
  assert(scalars.length === n, 'Points and scalars lengths must match');
  assertPositiveInteger(n, 'Expected at least 1 point and scalar');
  let useGlv = Curve.hasEndomorphism;

  // constant case
  if (scalars.every(Field3.isConstant) && points.every(Point.isConstant)) {
    return multiScalarMulConstant(scalars, points, Curve, mode);
  }

  // parse or build point tables
  let windowSizes = points.map((_, i) => tableConfigs[i]?.windowSize ?? 1);
  let tables = points.map((P, i) =>
    getPointTable(Curve, P, windowSizes[i], tableConfigs[i]?.multiples)
  );

  let maxBits = Curve.Scalar.sizeInBits;

  if (useGlv) {
    maxBits = Curve.Endo.decomposeMaxBits;

    // decompose scalars and handle signs
    let n2 = 2 * n;
    let scalars2: Field3[] = Array(n2);
    let points2: Point[] = Array(n2);
    let windowSizes2: number[] = Array(n2);
    let tables2: Point[][] = Array(n2);
    let mrcStack: Field[] = [];

    for (let i = 0; i < n; i++) {
      let [s0, s1] = decomposeNoRangeCheck(Curve, scalars[i]);
      scalars2[2 * i] = s0.abs;
      scalars2[2 * i + 1] = s1.abs;

      let table = tables[i];
      let endoTable = table.map((P, i) => {
        if (i === 0) return P;
        let [phiP, betaXBound] = endomorphism(Curve, P);
        mrcStack.push(betaXBound);
        return phiP;
      });
      tables2[2 * i] = table.map((P) =>
        negateIf(s0.isNegative, P, Curve.modulus)
      );
      tables2[2 * i + 1] = endoTable.map((P) =>
        negateIf(s1.isNegative, P, Curve.modulus)
      );
      points2[2 * i] = tables2[2 * i][1];
      points2[2 * i + 1] = tables2[2 * i + 1][1];

      windowSizes2[2 * i] = windowSizes2[2 * i + 1] = windowSizes[i];
    }
    reduceMrcStack(mrcStack);
    // from now on, everything is the same as if these were the original points and scalars
    points = points2;
    tables = tables2;
    scalars = scalars2;
    windowSizes = windowSizes2;
    n = n2;
  }

  // slice scalars
  let scalarChunks = scalars.map((s, i) =>
    sliceField3(s, { maxBits, chunkSize: windowSizes[i] })
  );

  // initialize sum to the initial aggregator, which is expected to be unrelated to any point that this gadget is used with
  // note: this is a trick to ensure _completeness_ of the gadget
  // soundness follows because add() and double() are sound, on all inputs that are valid non-zero curve points
  ia ??= initialAggregator(Curve);
  let sum = Point.from(ia);

  for (let i = maxBits - 1; i >= 0; i--) {
    // add in multiple of each point
    for (let j = 0; j < n; j++) {
      let windowSize = windowSizes[j];
      if (i % windowSize === 0) {
        // pick point to add based on the scalar chunk
        let sj = scalarChunks[j][i / windowSize];
        let sjP =
          windowSize === 1
            ? points[j]
            : arrayGetGeneric(Point.provable, tables[j], sj);

        // ec addition
        let added = add(sum, sjP, Curve);

        // handle degenerate case (if sj = 0, Gj is all zeros and the add result is garbage)
        sum = Provable.if(sj.equals(0), Point, sum, added);
      }
    }

    if (i === 0) break;

    // jointly double all points
    // (note: the highest couple of bits will not create any constraints because sum is constant; no need to handle that explicitly)
    sum = double(sum, Curve);
  }

  // the sum is now 2^(b-1)*IA + sum_i s_i*P_i
  // we assert that sum != 2^(b-1)*IA, and add -2^(b-1)*IA to get our result
  let iaFinal = Curve.scale(Curve.fromNonzero(ia), 1n << BigInt(maxBits - 1));
  let isZero = equals(sum, iaFinal, Curve);

  if (mode === 'assert-nonzero') {
    isZero.assertFalse();
    sum = add(sum, Point.from(Curve.negate(iaFinal)), Curve);
  } else {
    isZero.assertTrue();
    // for type consistency with the 'assert-nonzero' case
    sum = Point.from(Curve.zero);
  }

  return sum;
}

function negateIf(condition: Field, P: Point, f: bigint) {
  let y = Provable.if(
    Bool.Unsafe.fromField(condition),
    Field3,
    ForeignField.negate(P.y, f),
    P.y
  );
  return { x: P.x, y };
}

function endomorphism(Curve: CurveAffine, P: Point) {
  let beta = Field3.from(Curve.Endo.base);
  let betaX = ForeignField.mul(beta, P.x, Curve.modulus);
  return [{ x: betaX, y: P.y }, weakBound(betaX[2], Curve.modulus)] as const;
}

/**
 * Decompose s = s0 + s1*lambda where s0, s1 are guaranteed to be small
 *
 * Note: This assumes that s0 and s1 are range-checked externally; in scalar multiplication this happens because they are split into chunks.
 */
function decomposeNoRangeCheck(Curve: CurveAffine, s: Field3) {
  assert(
    Curve.Endo.decomposeMaxBits < l2,
    'decomposed scalars assumed to be < 2*88 bits'
  );
  // witness s0, s1
  let witnesses = exists(6, () => {
    let [s0, s1] = Curve.Endo.decompose(Field3.toBigint(s));
    let [s00, s01] = split(s0.abs);
    let [s10, s11] = split(s1.abs);
    // prettier-ignore
    return [
      s0.isNegative ? 1n : 0n, s00, s01,
      s1.isNegative ? 1n : 0n, s10, s11,
    ];
  });
  let [s0Negative, s00, s01, s1Negative, s10, s11] = witnesses;
  // we can hard-code highest limb to zero
  // (in theory this would allow us to hard-code the high quotient limb to zero in the ffmul below, and save 2 RCs.. but not worth it)
  let s0: Field3 = [s00, s01, Field.from(0n)];
  let s1: Field3 = [s10, s11, Field.from(0n)];
  s0Negative.assertBool();
  s1Negative.assertBool();

  // prove that s1*lambda = s - s0
  let lambda = Provable.if(
    Bool.Unsafe.fromField(s1Negative),
    Field3,
    Field3.from(Curve.Scalar.negate(Curve.Endo.scalar)),
    Field3.from(Curve.Endo.scalar)
  );
  let rhs = Provable.if(
    Bool.Unsafe.fromField(s0Negative),
    Field3,
    ForeignField.Sum(s).add(s0).finish(Curve.order),
    ForeignField.Sum(s).sub(s0).finish(Curve.order)
  );
  ForeignField.assertMul(s1, lambda, rhs, Curve.order);

  return [
    { isNegative: s0Negative, abs: s0 },
    { isNegative: s1Negative, abs: s1 },
  ] as const;
}

/**
 * Sign a message hash using ECDSA.
 */
function signEcdsa(Curve: CurveAffine, msgHash: bigint, privateKey: bigint) {
  let { Scalar } = Curve;
  let k = Scalar.random();
  let R = Curve.scale(Curve.one, k);
  let r = Scalar.mod(R.x);
  let kInv = Scalar.inverse(k);
  assert(kInv !== undefined);
  let s = Scalar.mul(kInv, Scalar.add(msgHash, Scalar.mul(r, privateKey)));
  return { r, s };
}

/**
 * Given a point P, create the list of multiples [0, P, 2P, 3P, ..., (2^windowSize-1) * P].
 * This method is provable, but won't create any constraints given a constant point.
 */
function getPointTable(
  Curve: CurveAffine,
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

/**
 * For EC scalar multiplication we use an initial point which is subtracted
 * at the end, to avoid encountering the point at infinity.
 *
 * This is a simple hash-to-group algorithm which finds that initial point.
 * It's important that this point has no known discrete logarithm so that nobody
 * can create an invalid proof of EC scaling.
 */
function initialAggregator(Curve: CurveAffine) {
  // hash that identifies the curve
  let h = sha256.create();
  h.update('initial-aggregator');
  h.update(bigIntToBytes(Curve.modulus));
  h.update(bigIntToBytes(Curve.order));
  h.update(bigIntToBytes(Curve.a));
  h.update(bigIntToBytes(Curve.b));
  let bytes = h.array();

  // bytes represent a 256-bit number
  // use that as x coordinate
  const F = Curve.Field;
  let x = F.mod(bytesToBigInt(bytes));
  return simpleMapToCurve(x, Curve);
}

function random(Curve: CurveAffine) {
  let x = Curve.Field.random();
  return simpleMapToCurve(x, Curve);
}

/**
 * Given an x coordinate (base field element), increment it until we find one with
 * a y coordinate that satisfies the curve equation, and return the point.
 *
 * If the curve has a cofactor, multiply by it to get a point in the correct subgroup.
 */
function simpleMapToCurve(x: bigint, Curve: CurveAffine) {
  const F = Curve.Field;
  let y: bigint | undefined = undefined;

  // increment x until we find a y coordinate
  while (y === undefined) {
    x = F.add(x, 1n);
    // solve y^2 = x^3 + ax + b
    let x3 = F.mul(F.square(x), x);
    let y2 = F.add(x3, F.mul(Curve.a, x) + Curve.b);
    y = F.sqrt(y2);
  }
  let p = { x, y, infinity: false };

  // clear cofactor
  if (Curve.hasCofactor) {
    p = Curve.scale(p, Curve.cofactor!);
  }
  return p;
}

/**
 * Get value from array in O(n) constraints.
 *
 * Assumes that index is in [0, n), returns an unconstrained result otherwise.
 */
function arrayGetGeneric<T>(type: ProvableType<T>, array: T[], index: Field) {
  type = ProvableType.get(type);
  // witness result
  let a = Provable.witness(type, () => array[Number(index)]);
  let aFields = type.toFields(a);

  // constrain each field of the result
  let size = type.sizeInFields();
  let arrays = array.map(type.toFields);

  for (let j = 0; j < size; j++) {
    let arrayFieldsJ = arrays.map((x) => x[j]);
    arrayGet(arrayFieldsJ, index).assertEquals(aFields[j]);
  }
  return a;
}

// type/conversion helpers

const Point = {
  from({ x, y }: point): Point {
    return { x: Field3.from(x), y: Field3.from(y) };
  },
  toBigint({ x, y }: Point) {
    return { x: Field3.toBigint(x), y: Field3.toBigint(y), infinity: false };
  },
  isConstant: (P: Point) => Provable.isConstant(Point, P),

  /**
   * Random point on the curve.
   */
  random(Curve: CurveAffine) {
    return Point.from(random(Curve));
  },

  provable: provable({ x: Field3, y: Field3 }),
};

const EcdsaSignature = {
  from({ r, s }: Ecdsa.signature): Ecdsa.Signature {
    return { r: Field3.from(r), s: Field3.from(s) };
  },
  toBigint({ r, s }: Ecdsa.Signature): Ecdsa.signature {
    return { r: Field3.toBigint(r), s: Field3.toBigint(s) };
  },
  isConstant: (S: Ecdsa.Signature) => Provable.isConstant(EcdsaSignature, S),

  /**
   * Create an {@link EcdsaSignature} from a raw 130-char hex string as used in
   * [Ethereum transactions](https://ethereum.org/en/developers/docs/transactions/#typed-transaction-envelope).
   */
  fromHex(rawSignature: string): Ecdsa.Signature {
    let prefix = rawSignature.slice(0, 2);
    let signature = rawSignature.slice(2, 130);
    if (prefix !== '0x' || signature.length < 128) {
      throw Error(
        `Signature.fromHex(): Invalid signature, expected hex string 0x... of length at least 130.`
      );
    }
    let r = BigInt(`0x${signature.slice(0, 64)}`);
    let s = BigInt(`0x${signature.slice(64)}`);
    return EcdsaSignature.from({ r, s });
  },

  provable: provable({ r: Field3, s: Field3 }),
};

const Ecdsa = {
  sign: signEcdsa,
  verify: verifyEcdsa,
  Signature: EcdsaSignature,
};

// MRC stack

function reduceMrcStack(xs: Field[]) {
  let n = xs.length;
  let nRemaining = n % 3;
  let nFull = (n - nRemaining) / 3;
  for (let i = 0; i < nFull; i++) {
    multiRangeCheck([xs[3 * i], xs[3 * i + 1], xs[3 * i + 2]]);
  }
  let remaining: Field3 = [Field.from(0n), Field.from(0n), Field.from(0n)];
  for (let i = 0; i < nRemaining; i++) {
    remaining[i] = xs[3 * nFull + i];
  }
  multiRangeCheck(remaining);
}
