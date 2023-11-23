import { inverse, mod } from '../../bindings/crypto/finite_field.js';
import { Field } from '../field.js';
import { Provable } from '../provable.js';
import { assert, exists } from './common.js';
import { Field3, ForeignField, split, weakBound } from './foreign-field.js';
import { l, multiRangeCheck } from './range-check.js';
import { sha256 } from 'js-sha256';
import {
  bigIntToBits,
  bigIntToBytes,
  bytesToBigInt,
} from '../../bindings/crypto/bigint-helpers.js';
import {
  CurveAffine,
  affineAdd,
  affineDouble,
} from '../../bindings/crypto/elliptic_curve.js';
import { Bool } from '../bool.js';
import { provable } from '../circuit_value.js';
import { assertPositiveInteger } from '../../bindings/crypto/non-negative.js';
import { arrayGet } from './basic.js';

// external API
export { EllipticCurve, Point, Ecdsa };

// internal API
export { verifyEcdsaConstant };

const EllipticCurve = {
  add,
  double,
  multiScalarMul,
  initialAggregator,
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

function add(p1: Point, p2: Point, f: bigint) {
  let { x: x1, y: y1 } = p1;
  let { x: x2, y: y2 } = p2;

  // constant case
  if (Point.isConstant(p1) && Point.isConstant(p2)) {
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
  let y3Bound = weakBound(y3[2], f);
  multiRangeCheck([mBound, x3Bound, y3Bound]);

  // (x1 - x2)*m = y1 - y2
  let deltaX = ForeignField.Sum(x1).sub(x2);
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

function double(p1: Point, f: bigint) {
  let { x: x1, y: y1 } = p1;

  // constant case
  if (Point.isConstant(p1)) {
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
  let y3Bound = weakBound(y3[2], f);
  multiRangeCheck([mBound, x3Bound, y3Bound]);

  // x1^2 = x1x1
  let x1x1 = ForeignField.mul(x1, x1, f);

  // 2*y1*m = 3*x1x1
  // TODO this assumes the curve has a == 0
  let y1Times2 = ForeignField.Sum(y1).add(y1);
  let x1x1Times3 = ForeignField.Sum(x1x1).add(x1x1).add(x1x1);
  ForeignField.assertMul(y1Times2, m, x1x1Times3, f);

  // m^2 = 2*x1 + x3
  let xSum = ForeignField.Sum(x1).add(x1).add(x3);
  ForeignField.assertMul(m, m, xSum, f);

  // (x1 - x3)*m = y1 + y3
  let deltaX1X3 = ForeignField.Sum(x1).sub(x3);
  let ySum = ForeignField.Sum(y1).add(y3);
  ForeignField.assertMul(deltaX1X3, m, ySum, f);

  return { x: x3, y: y3 };
}

function verifyEcdsa(
  Curve: CurveAffine,
  signature: Ecdsa.Signature,
  msgHash: Field3,
  publicKey: Point,
  config?: {
    G?: { windowSize: number; multiples?: Point[] };
    P?: { windowSize: number; multiples?: Point[] };
    ia?: point;
  }
) {
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
    assert(isValid, 'invalid signature');
    return;
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
    Curve,
    [u1, u2],
    [G, publicKey],
    config && [config.G, config.P],
    config?.ia
  );
  // this ^ already proves that R != 0 (part of ECDSA verification)

  // reduce R.x modulo the curve order
  // note: we don't check that the result Rx is canonical, because Rx === r and r is an input:
  // it's the callers responsibility to check that the signature is valid/unique in whatever way it makes sense for the application
  let Rx = ForeignField.mul(R.x, Field3.from(1n), Curve.order);
  Provable.assertEqual(Field3.provable, Rx, r);
}

/**
 * Multi-scalar multiplication:
 *
 * s_0 * P_0 + ... + s_(n-1) * P_(n-1)
 *
 * where P_i are any points. The result is not allowed to be zero.
 *
 * We double all points together and leverage a precomputed table of size 2^c to avoid all but every cth addition.
 *
 * Note: this algorithm targets a small number of points, like 2 needed for ECDSA verification.
 *
 * TODO: could use lookups for picking precomputed multiples, instead of O(2^c) provable switch
 * TODO: custom bit representation for the scalar that avoids 0, to get rid of the degenerate addition case
 * TODO: glv trick which cuts down ec doubles by half by splitting s*P = s0*P + s1*endo(P) with s0, s1 in [0, 2^128)
 */
function multiScalarMul(
  Curve: CurveAffine,
  scalars: Field3[],
  points: Point[],
  tableConfigs: (
    | { windowSize?: number; multiples?: Point[] }
    | undefined
  )[] = [],
  ia?: point
): Point {
  let n = points.length;
  assert(scalars.length === n, 'Points and scalars lengths must match');
  assertPositiveInteger(n, 'Expected at least 1 point and scalar');

  // constant case
  if (scalars.every(Field3.isConstant) && points.every(Point.isConstant)) {
    // TODO dedicated MSM
    let s = scalars.map(Field3.toBigint);
    let P = points.map(Point.toBigint);
    let sum = Curve.zero;
    for (let i = 0; i < n; i++) {
      sum = Curve.add(sum, Curve.scale(P[i], s[i]));
    }
    return Point.from(sum);
  }

  // parse or build point tables
  let windowSizes = points.map((_, i) => tableConfigs[i]?.windowSize ?? 1);
  let tables = points.map((P, i) =>
    getPointTable(Curve, P, windowSizes[i], tableConfigs[i]?.multiples)
  );

  // slice scalars
  let b = Curve.order.toString(2).length;
  let scalarChunks = scalars.map((s, i) =>
    slice(s, { maxBits: b, chunkSize: windowSizes[i] })
  );

  ia ??= initialAggregator(Curve);
  let sum = Point.from(ia);

  for (let i = b - 1; i >= 0; i--) {
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
        let added = add(sum, sjP, Curve.modulus);

        // handle degenerate case (if sj = 0, Gj is all zeros and the add result is garbage)
        sum = Provable.if(sj.equals(0), Point.provable, sum, added);
      }
    }

    if (i === 0) break;

    // jointly double all points
    // (note: the highest couple of bits will not create any constraints because sum is constant; no need to handle that explicitly)
    sum = double(sum, Curve.modulus);
  }

  // the sum is now 2^(b-1)*IA + sum_i s_i*P_i
  // we assert that sum != 2^(b-1)*IA, and add -2^(b-1)*IA to get our result
  let iaFinal = Curve.scale(Curve.fromNonzero(ia), 1n << BigInt(b - 1));
  Provable.equal(Point.provable, sum, Point.from(iaFinal)).assertFalse();
  sum = add(sum, Point.from(Curve.negate(iaFinal)), Curve.modulus);

  return sum;
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
  let pk = Curve.fromNonzero(publicKey);
  if (!Curve.isOnCurve(pk)) return false;
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

  let Pi = double(P, Curve.modulus);
  table.push(Pi);
  for (let i = 3; i < n; i++) {
    Pi = add(Pi, P, Curve.modulus);
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
  let y: bigint | undefined = undefined;

  // increment x until we find a y coordinate
  while (y === undefined) {
    x = F.add(x, 1n);
    // solve y^2 = x^3 + ax + b
    let x3 = F.mul(F.square(x), x);
    let y2 = F.add(x3, F.mul(Curve.a, x) + Curve.b);
    y = F.sqrt(y2);
  }
  return { x, y, infinity: false };
}

/**
 * Provable method for slicing a 3x88-bit bigint into smaller bit chunks of length `chunkSize`
 *
 * This serves as a range check that the input is in [0, 2^maxBits)
 */
function slice(
  [x0, x1, x2]: Field3,
  { maxBits, chunkSize }: { maxBits: number; chunkSize: number }
) {
  let l_ = Number(l);
  assert(maxBits <= 3 * l_, `expected max bits <= 3*${l_}, got ${maxBits}`);

  // first limb
  let result0 = sliceField(x0, Math.min(l_, maxBits), chunkSize);
  if (maxBits <= l_) return result0.chunks;
  maxBits -= l_;

  // second limb
  let result1 = sliceField(x1, Math.min(l_, maxBits), chunkSize, result0);
  if (maxBits <= l_) return result0.chunks.concat(result1.chunks);
  maxBits -= l_;

  // third limb
  let result2 = sliceField(x2, maxBits, chunkSize, result1);
  return result0.chunks.concat(result1.chunks, result2.chunks);
}

/**
 * Provable method for slicing a field element into smaller bit chunks of length `chunkSize`.
 *
 * This serves as a range check that the input is in [0, 2^maxBits)
 *
 * If `chunkSize` does not divide `maxBits`, the last chunk will be smaller.
 * We return the number of free bits in the last chunk, and optionally accept such a result from a previous call,
 * so that this function can be used to slice up a bigint of multiple limbs into homogeneous chunks.
 *
 * TODO: atm this uses expensive boolean checks for each bit.
 * For larger chunks, we should use more efficient range checks.
 */
function sliceField(
  x: Field,
  maxBits: number,
  chunkSize: number,
  leftover?: { chunks: Field[]; leftoverSize: number }
) {
  let bits = exists(maxBits, () => {
    let bits = bigIntToBits(x.toBigInt());
    // normalize length
    if (bits.length > maxBits) bits = bits.slice(0, maxBits);
    if (bits.length < maxBits)
      bits = bits.concat(Array(maxBits - bits.length).fill(false));
    return bits.map(BigInt);
  });

  let chunks = [];
  let sum = Field.from(0n);

  // if there's a leftover chunk from a previous slizeField() call, we complete it
  if (leftover !== undefined) {
    let { chunks: previous, leftoverSize: size } = leftover;
    let remainingChunk = Field.from(0n);
    for (let i = 0; i < size; i++) {
      let bit = bits[i];
      Bool.check(Bool.Unsafe.ofField(bit));
      remainingChunk = remainingChunk.add(bit.mul(1n << BigInt(i)));
    }
    sum = remainingChunk = remainingChunk.seal();
    let chunk = previous[previous.length - 1];
    previous[previous.length - 1] = chunk.add(
      remainingChunk.mul(1n << BigInt(chunkSize - size))
    );
  }

  let i = leftover?.leftoverSize ?? 0;
  for (; i < maxBits; i += chunkSize) {
    // prove that chunk has `chunkSize` bits
    // TODO: this inner sum should be replaced with a more efficient range check when possible
    let chunk = Field.from(0n);
    let size = Math.min(maxBits - i, chunkSize); // last chunk might be smaller
    for (let j = 0; j < size; j++) {
      let bit = bits[i + j];
      Bool.check(Bool.Unsafe.ofField(bit));
      chunk = chunk.add(bit.mul(1n << BigInt(j)));
    }
    chunk = chunk.seal();
    // prove that chunks add up to x
    sum = sum.add(chunk.mul(1n << BigInt(i)));
    chunks.push(chunk);
  }
  sum.assertEquals(x);

  let leftoverSize = i - maxBits;
  return { chunks, leftoverSize } as const;
}

/**
 * Get value from array in O(n) constraints.
 *
 * Assumes that index is in [0, n), returns an unconstrained result otherwise.
 */
function arrayGetGeneric<T>(type: Provable<T>, array: T[], index: Field) {
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
  isConstant: (P: Point) => Provable.isConstant(Point.provable, P),

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
    Provable.isConstant(EcdsaSignature.provable, S),

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
