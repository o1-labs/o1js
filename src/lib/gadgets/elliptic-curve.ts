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
import { L, multiRangeCheck } from './range-check.js';
import { printGates } from '../testing/constraint-system.js';
import { sha256 } from 'js-sha256';
import {
  bigIntToBits,
  bytesToBigInt,
} from '../../bindings/crypto/bigint-helpers.js';
import {
  CurveAffine,
  Pallas,
  affineAdd,
  affineDouble,
} from '../../bindings/crypto/elliptic_curve.js';
import { Bool } from '../bool.js';
import { provable } from '../circuit_value.js';
import { assertPositiveInteger } from '../../bindings/crypto/non-negative.js';

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
  tables?: {
    windowSizeG?: number;
    multiplesG?: Point[];
    windowSizeP?: number;
    multiplesP?: Point[];
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

  let G = Point.from(Curve.one);
  let R = doubleScalarMul(Curve, ia, u1, G, u2, publicKey, tables);
  // this ^ already proves that R != 0

  // reduce R.x modulo the curve order
  let Rx = ForeignField.mul(R.x, Field3.from(1n), Curve.order);
  Provable.assertEqual(Field3.provable, Rx, r);
}

/**
 * Scalar mul that we need for ECDSA:
 *
 * s*G + t*P,
 *
 * where G, P are any points. The result is not allowed to be zero.
 *
 * We double both points together and leverage a precomputed table
 * of size 2^c to avoid all but every cth addition for t*G.
 *
 * TODO: could use lookups for picking precomputed multiples, instead of O(2^c) provable switch
 * TODO: custom bit representation for the scalar that avoids 0, to get rid of the degenerate addition case
 * TODO: glv trick which cuts down ec doubles by half by splitting s*P = s0*P + s1*endo(P) with s0, s1 in [0, 2^128)
 */
function doubleScalarMul(
  Curve: CurveAffine,
  ia: point,
  s: Field3,
  G: Point,
  t: Field3,
  P: Point,
  {
    // what we called c before
    windowSizeG = 1,
    // G, ..., (2^c-1)*G
    multiplesG = undefined as Point[] | undefined,
    windowSizeP = 1,
    multiplesP = undefined as Point[] | undefined,
  } = {}
): Point {
  // parse or build point tables
  let Gs = getPointTable(Curve, G, windowSizeG, multiplesG);
  let Ps = getPointTable(Curve, P, windowSizeP, multiplesP);

  // slice scalars
  let b = Curve.order.toString(2).length;
  let ss = slice(s, { maxBits: b, chunkSize: windowSizeG });
  let ts = slice(t, { maxBits: b, chunkSize: windowSizeP });

  let sum = Point.from(ia);

  for (let i = 0; i < b; i++) {
    if (i % windowSizeG === 0) {
      // pick point to add based on the scalar chunk
      let sj = ss[i / windowSizeG];
      let Gj = windowSizeG === 1 ? G : arrayGet(Point, Gs, sj, { offset: 1 });

      // ec addition
      let added = add(sum, Gj, Curve.p);

      // handle degenerate case (if sj = 0, Gj is all zeros and the add result is garbage)
      sum = Provable.if(sj.equals(0), Point, sum, added);
    }

    if (i % windowSizeP === 0) {
      let tj = ts[i / windowSizeP];
      let Pj = windowSizeP === 1 ? P : arrayGet(Point, Ps, tj, { offset: 1 });
      let added = add(sum, Pj, Curve.p);
      sum = Provable.if(tj.equals(0), Point, sum, added);
    }

    // jointly double both points
    sum = double(sum, Curve.p);
  }

  // the sum is now s*G + t*P + 2^b*IA
  // we assert that sum != 2^b*IA, and add -2^b*IA to get our result
  let iaTimes2ToB = Curve.scale(Curve.fromNonzero(ia), 1n << BigInt(b));
  Provable.equal(Point, sum, Point.from(iaTimes2ToB)).assertFalse();
  sum = add(sum, Point.from(Curve.negate(iaTimes2ToB)), Curve.p);

  return sum;
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

function getPointTable(
  Curve: CurveAffine,
  P: Point,
  windowSize: number,
  table?: Point[]
): Point[] {
  assertPositiveInteger(windowSize, 'invalid window size');
  let n = (1 << windowSize) - 1; // n >= 1

  assert(table === undefined || table.length === n, 'invalid table');
  if (table !== undefined) return table;

  table = [P];
  if (n === 1) return table;

  let Pi = double(P, Curve.p);
  table.push(Pi);
  for (let i = 2; i < n; i++) {
    Pi = add(Pi, P, Curve.p);
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
    x = F.add(x, 1n);
    // solve y^2 = x^3 + ax + b
    let x3 = F.mul(F.square(x), x);
    let y2 = F.add(x3, F.mul(a, x) + b);
    y = F.sqrt(y2);
  }
  return { x, y, infinity: false };
}

/**
 * Provable method for slicing a 3x88-bit bigint into smaller bit chunks of length `windowSize`
 *
 * TODO: atm this uses expensive boolean checks for the bits.
 * For larger chunks, we should use more efficient range checks.
 *
 * Note: This serves as a range check for the input limbs
 */
function slice(
  [x0, x1, x2]: Field3,
  { maxBits, chunkSize }: { maxBits: number; chunkSize: number }
) {
  let l = Number(L);

  // first limb
  let chunks0 = sliceField(x0, Math.min(l, maxBits), chunkSize);
  if (maxBits <= l) return chunks0;
  maxBits -= l;

  // second limb
  let chunks1 = sliceField(x1, Math.min(l, maxBits), chunkSize);
  if (maxBits <= l) return chunks0.concat(chunks1);
  maxBits -= l;

  // third limb
  let chunks2 = sliceField(x2, maxBits, chunkSize);
  return chunks0.concat(chunks1).concat(chunks2);
}

/**
 * Provable method for slicing a 3x88-bit bigint into smaller bit chunks of length `windowSize`
 *
 * TODO: atm this uses expensive boolean checks for the bits.
 * For larger chunks, we should use more efficient range checks.
 *
 * Note: This serves as a range check that the input is in [0, 2^k) where `k = ceil(maxBits / windowSize) * windowSize`
 */
function sliceField(x: Field, maxBits: number, chunkSize: number) {
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
  for (let i = 0; i < maxBits; i += chunkSize) {
    // prove that chunk has `windowSize` bits
    // TODO: this inner sum should be replaced with a more efficient range check when possible
    let chunk = Field.from(0n);
    for (let j = 0; j < chunkSize; j++) {
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

  return chunks;
}

/**
 * Get value from array in O(n) constraints.
 *
 * If the index is out of bounds, returns all-zeros version of T
 */
function arrayGet<T>(
  type: Provable<T>,
  array: T[],
  index: Field,
  { offset = 0 } = {}
) {
  let n = array.length;
  let oneHot = Array(n);
  // TODO can we share computation between all those equals()?
  for (let i = 0; i < n; i++) {
    oneHot[i] = index.equals(i + offset);
  }
  return Provable.switch(oneHot, type, array);
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

function gcd(a: number, b: number) {
  if (b > a) [a, b] = [b, a];
  while (true) {
    if (b === 0) return a;
    [a, b] = [b, a % b];
  }
}

console.log(gcd(2, 4));

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
