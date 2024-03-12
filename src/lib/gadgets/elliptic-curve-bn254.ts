import { inverse, mod } from '../../bindings/crypto/finite-field.js';
import { FieldBn254 } from '../field-bn254.js';
import { ProvableBn254 } from '../provable-bn254.js';
import { assert, exists } from './common-bn254.js';
import { Field3, ForeignFieldBn254, split, weakBound } from './foreign-field-bn254.js';
import { l2, multiRangeCheck } from './range-check-bn254.js';
import { sha256 } from 'js-sha256';
import {
  bigIntToBytes,
  bytesToBigInt,
} from '../../bindings/crypto/bigint-helpers.js';
import {
  CurveAffine,
  affineAdd,
  affineDouble,
} from '../../bindings/crypto/elliptic-curve.js';
import { BoolBn254 } from '../bool-bn254.js';
import { provable } from '../circuit-value-bn254.js';
import { assertPositiveInteger } from '../../bindings/crypto/non-negative.js';
import { arrayGet, assertBoolean } from './basic.js';
import { sliceField3 } from './bit-slices.js';
import { Hashed } from '../provable-types/packed.js';

// external API
export { EllipticCurveBn254, PointBn254, Ecdsa };

// internal API
export { verifyEcdsaConstant, initialAggregator, simpleMapToCurve };

const EllipticCurveBn254 = {
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
type PointBn254 = { x: Field3; y: Field3 };
type point = { x: bigint; y: bigint };

namespace Ecdsa {
  /**
   * ECDSA signature consisting of two curve scalars.
   */
  export type Signature = { r: Field3; s: Field3 };
  export type signature = { r: bigint; s: bigint };
}

function add(p1: PointBn254, p2: PointBn254, Curve: { modulus: bigint }) {
  let { x: x1, y: y1 } = p1;
  let { x: x2, y: y2 } = p2;
  let f = Curve.modulus;

  // constant case
  if (PointBn254.isConstant(p1) && PointBn254.isConstant(p2)) {
    let p3 = affineAdd(PointBn254.toBigint(p1), PointBn254.toBigint(p2), f);
    return PointBn254.from(p3);
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
  ForeignFieldBn254.assertAlmostReduced([m, x3, y3], f);

  // (x1 - x2)*m = y1 - y2
  let deltaX = ForeignFieldBn254.Sum(x1).sub(x2);
  let deltaY = ForeignFieldBn254.Sum(y1).sub(y2);
  ForeignFieldBn254.assertMul(deltaX, m, deltaY, f);

  // m^2 = x1 + x2 + x3
  let xSum = ForeignFieldBn254.Sum(x1).add(x2).add(x3);
  ForeignFieldBn254.assertMul(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = ForeignFieldBn254.Sum(x1).sub(x3);
  let ySum = ForeignFieldBn254.Sum(y1).add(y3);
  ForeignFieldBn254.assertMul(deltaX1X3, m, ySum, f);

  return { x: x3, y: y3 };
}

function double(p1: PointBn254, Curve: { modulus: bigint; a: bigint }) {
  let { x: x1, y: y1 } = p1;
  let f = Curve.modulus;

  // constant case
  if (PointBn254.isConstant(p1)) {
    let p3 = affineDouble(PointBn254.toBigint(p1), f);
    return PointBn254.from(p3);
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
  ForeignFieldBn254.assertAlmostReduced([m, x3, y3], f);

  // x1^2 = x1x1
  let x1x1 = ForeignFieldBn254.mul(x1, x1, f);

  // 2*y1*m = 3*x1x1 + a
  let y1Times2 = ForeignFieldBn254.Sum(y1).add(y1);
  let x1x1Times3PlusA = ForeignFieldBn254.Sum(x1x1).add(x1x1).add(x1x1);
  if (Curve.a !== 0n)
    x1x1Times3PlusA = x1x1Times3PlusA.add(Field3.from(Curve.a));
  ForeignFieldBn254.assertMul(y1Times2, m, x1x1Times3PlusA, f);

  // m^2 = 2*x1 + x3
  let xSum = ForeignFieldBn254.Sum(x1).add(x1).add(x3);
  ForeignFieldBn254.assertMul(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = ForeignFieldBn254.Sum(x1).sub(x3);
  let ySum = ForeignFieldBn254.Sum(y1).add(y3);
  ForeignFieldBn254.assertMul(deltaX1X3, m, ySum, f);

  return { x: x3, y: y3 };
}

function negate({ x, y }: PointBn254, Curve: { modulus: bigint }) {
  return { x, y: ForeignFieldBn254.negate(y, Curve.modulus) };
}

function assertOnCurve(
  p: PointBn254,
  { modulus: f, a, b }: { modulus: bigint; b: bigint; a: bigint }
) {
  let { x, y } = p;
  let x2 = ForeignFieldBn254.mul(x, x, f);
  let y2 = ForeignFieldBn254.mul(y, y, f);
  let y2MinusB = ForeignFieldBn254.Sum(y2).sub(Field3.from(b));

  // (x^2 + a) * x = y^2 - b
  let x2PlusA = ForeignFieldBn254.Sum(x2);
  if (a !== 0n) x2PlusA = x2PlusA.add(Field3.from(a));
  let message: string | undefined;
  if (PointBn254.isConstant(p)) {
    message = `assertOnCurve(): (${x}, ${y}) is not on the curve.`;
  }
  ForeignFieldBn254.assertMul(x2PlusA, x, y2MinusB, f, message);
}

/**
 * EC scalar multiplication, `scalar*point`
 *
 * The result is constrained to be not zero.
 */
function scale(
  scalar: Field3,
  point: PointBn254,
  Curve: CurveAffine,
  config: {
    mode?: 'assert-nonzero' | 'assert-zero';
    windowSize?: number;
    multiples?: PointBn254[];
  } = { mode: 'assert-nonzero' }
) {
  config.windowSize ??= PointBn254.isConstant(point) ? 4 : 3;
  return multiScalarMul([scalar], [point], Curve, [config], config.mode);
}

// checks whether the elliptic curve point g is in the subgroup defined by [order]g = 0
function assertInSubgroup(p: PointBn254, Curve: CurveAffine) {
  if (!Curve.hasCofactor) return;
  scale(Field3.from(Curve.order), p, Curve, { mode: 'assert-zero' });
}

// check whether a point equals a constant point
// TODO implement the full case of two vars
function equals(p1: PointBn254, p2: point, Curve: { modulus: bigint }) {
  let xEquals = ForeignFieldBn254.equals(p1.x, p2.x, Curve.modulus);
  let yEquals = ForeignFieldBn254.equals(p1.y, p2.y, Curve.modulus);
  return xEquals.and(yEquals);
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
 */
function verifyEcdsa(
  Curve: CurveAffine,
  signature: Ecdsa.Signature,
  msgHash: Field3,
  publicKey: PointBn254,
  config: {
    G?: { windowSize: number; multiples?: PointBn254[] };
    P?: { windowSize: number; multiples?: PointBn254[] };
    ia?: point;
  } = { G: { windowSize: 4 }, P: { windowSize: 4 } }
) {
  // constant case
  if (
    EcdsaSignature.isConstant(signature) &&
    Field3.isConstant(msgHash) &&
    PointBn254.isConstant(publicKey)
  ) {
    let isValid = verifyEcdsaConstant(
      Curve,
      EcdsaSignature.toBigint(signature),
      Field3.toBigint(msgHash),
      PointBn254.toBigint(publicKey)
    );
    return new BoolBn254(isValid);
  }

  // provable case
  // note: usually we don't check validity of inputs, like that the public key is a valid curve point
  // we make an exception for the two non-standard conditions r != 0 and s != 0,
  // which are unusual to capture in types and could be considered part of the verification algorithm
  let { r, s } = signature;
  ForeignFieldBn254.inv(r, Curve.order); // proves r != 0 (important, because r = 0 => u2 = 0 kills the private key contribution)
  let sInv = ForeignFieldBn254.inv(s, Curve.order); // proves s != 0
  let u1 = ForeignFieldBn254.mul(msgHash, sInv, Curve.order);
  let u2 = ForeignFieldBn254.mul(r, sInv, Curve.order);

  let G = PointBn254.from(Curve.one);
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
  let Rx = ForeignFieldBn254.mul(R.x, Field3.from(1n), Curve.order);

  // we have to prove that Rx is canonical, because we check signature validity based on whether Rx _exactly_ equals the input r.
  // if we allowed non-canonical Rx, the prover could make verify() return false on a valid signature, by adding a multiple of `Curve.order` to Rx.
  ForeignFieldBn254.assertLessThan(Rx, Curve.order);

  return ProvableBn254.equal(Field3.provable, Rx, r);
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
  points: PointBn254[],
  Curve: CurveAffine,
  tableConfigs: (
    | { windowSize?: number; multiples?: PointBn254[] }
    | undefined
  )[] = [],
  mode: 'assert-nonzero' | 'assert-zero' = 'assert-nonzero',
  ia?: point
): PointBn254 {
  let n = points.length;
  assert(scalars.length === n, 'Points and scalars lengths must match');
  assertPositiveInteger(n, 'Expected at least 1 point and scalar');
  let useGlv = Curve.hasEndomorphism;

  // constant case
  if (scalars.every(Field3.isConstant) && points.every(PointBn254.isConstant)) {
    // TODO dedicated MSM
    let s = scalars.map(Field3.toBigint);
    let P = points.map(PointBn254.toBigint);
    let sum = Curve.zero;
    for (let i = 0; i < n; i++) {
      if (useGlv) {
        sum = Curve.add(sum, Curve.Endo.scale(P[i], s[i]));
      } else {
        sum = Curve.add(sum, Curve.scale(P[i], s[i]));
      }
    }
    if (mode === 'assert-zero') {
      assert(sum.infinity, 'scalar multiplication: expected zero result');
      return PointBn254.from(Curve.zero);
    }
    assert(!sum.infinity, 'scalar multiplication: expected non-zero result');
    return PointBn254.from(sum);
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
    let points2: PointBn254[] = Array(n2);
    let windowSizes2: number[] = Array(n2);
    let tables2: PointBn254[][] = Array(n2);
    let mrcStack: FieldBn254[] = [];

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

  // hash points to make array access more efficient
  // a PointBn254 is 6 field elements, the hash is just 1 field element
  const HashedPoint = Hashed.create(PointBn254.provable);

  let hashedTables = tables.map((table) =>
    table.map((point) => HashedPoint.hash(point))
  );

  ia ??= initialAggregator(Curve);
  let sum = PointBn254.from(ia);

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
            : arrayGetGeneric(
              HashedPoint.provable,
              hashedTables[j],
              sj
            ).unhash();

        // ec addition
        let added = add(sum, sjP, Curve);

        // handle degenerate case (if sj = 0, Gj is all zeros and the add result is garbage)
        sum = ProvableBn254.if(sj.equals(0), PointBn254.provable, sum, added);
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
    sum = add(sum, PointBn254.from(Curve.negate(iaFinal)), Curve);
  } else {
    isZero.assertTrue();
    // for type consistency with the 'assert-nonzero' case
    sum = PointBn254.from(Curve.zero);
  }

  return sum;
}

function negateIf(condition: FieldBn254, P: PointBn254, f: bigint) {
  let y = ProvableBn254.if(
    BoolBn254.Unsafe.ofField(condition),
    Field3.provable,
    ForeignFieldBn254.negate(P.y, f),
    P.y
  );
  return { x: P.x, y };
}

function endomorphism(Curve: CurveAffine, P: PointBn254) {
  let beta = Field3.from(Curve.Endo.base);
  let betaX = ForeignFieldBn254.mul(beta, P.x, Curve.modulus);
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
  let s0: Field3 = [s00, s01, FieldBn254.from(0n)];
  let s1: Field3 = [s10, s11, FieldBn254.from(0n)];
  assertBoolean(s0Negative);
  assertBoolean(s1Negative);

  // prove that s1*lambda = s - s0
  let lambda = ProvableBn254.if(
    BoolBn254.Unsafe.ofField(s1Negative),
    Field3.provable,
    Field3.from(Curve.Scalar.negate(Curve.Endo.scalar)),
    Field3.from(Curve.Endo.scalar)
  );
  let rhs = ProvableBn254.if(
    BoolBn254.Unsafe.ofField(s0Negative),
    Field3.provable,
    ForeignFieldBn254.Sum(s).add(s0).finish(Curve.order),
    ForeignFieldBn254.Sum(s).sub(s0).finish(Curve.order)
  );
  ForeignFieldBn254.assertMul(s1, lambda, rhs, Curve.order);

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
  P: PointBn254,
  windowSize: number,
  table?: PointBn254[]
): PointBn254[] {
  assertPositiveInteger(windowSize, 'invalid window size');
  let n = 1 << windowSize; // n >= 2

  assert(table === undefined || table.length === n, 'invalid table');
  if (table !== undefined) return table;

  table = [PointBn254.from(Curve.zero), P];
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
function arrayGetGeneric<T>(type: ProvableBn254<T>, array: T[], index: FieldBn254) {
  // witness result
  let a = ProvableBn254.witness(type, () => array[Number(index)]);
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

const PointBn254 = {
  from({ x, y }: point): PointBn254 {
    return { x: Field3.from(x), y: Field3.from(y) };
  },
  toBigint({ x, y }: PointBn254) {
    return { x: Field3.toBigint(x), y: Field3.toBigint(y), infinity: false };
  },
  isConstant: (P: PointBn254) => ProvableBn254.isConstant(PointBn254.provable, P),

  /**
   * Random point on the curve.
   */
  random(Curve: CurveAffine) {
    return PointBn254.from(random(Curve));
  },

  provable: provable({ x: Field3.provable, y: Field3.provable }),
};

const EcdsaSignature = {
  from({ r, s }: Ecdsa.signature): Ecdsa.Signature {
    return { r: Field3.from(r), s: Field3.from(s) };
  },
  toBigint({ r, s }: Ecdsa.Signature): Ecdsa.signature {
    return { r: Field3.toBigint(r), s: Field3.toBigint(s) };
  },
  isConstant: (S: Ecdsa.Signature) =>
    ProvableBn254.isConstant(EcdsaSignature.provable, S),

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

  provable: provable({ r: Field3.provable, s: Field3.provable }),
};

const Ecdsa = {
  sign: signEcdsa,
  verify: verifyEcdsa,
  Signature: EcdsaSignature,
};

// MRC stack

function reduceMrcStack(xs: FieldBn254[]) {
  let n = xs.length;
  let nRemaining = n % 3;
  let nFull = (n - nRemaining) / 3;
  for (let i = 0; i < nFull; i++) {
    multiRangeCheck([xs[3 * i], xs[3 * i + 1], xs[3 * i + 2]]);
  }
  let remaining: Field3 = [FieldBn254.from(0n), FieldBn254.from(0n), FieldBn254.from(0n)];
  for (let i = 0; i < nRemaining; i++) {
    remaining[i] = xs[3 * nFull + i];
  }
  multiRangeCheck(remaining);
}
