import { TwistedCurveParams } from '../../../bindings/crypto/elliptic-curve-examples.js';
import { SHA2 } from '../gadgets/sha2.js';
import { mod } from '../../../bindings/crypto/finite-field.js';
import { Provable } from '../provable.js';
import { assert } from './common.js';
import { Field3, ForeignField, split } from './foreign-field.js';
import { l2Mask } from './range-check.js';
import { Bool } from '../bool.js';
import { provable } from '../types/provable-derivers.js';
import {
  AffineTwistedCurve,
  GroupAffineTwisted,
  affineTwistedAdd,
  createAffineTwistedCurve,
  affineTwistedDouble,
} from '../../../bindings/crypto/elliptic-curve.js';
import { assertPositiveInteger } from '../../../bindings/crypto/non-negative.js';
import { sliceField3 } from './bit-slices.js';
import { arrayGetGeneric } from './elliptic-curve.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { Field } from '../field.js';
import { UInt8 } from '../int.js';
import { Bytes } from '../bytes.js';
import { Octets } from '../../util/octets.js';
import { exists } from '../core/exists.js';

// external API
export { TwistedCurve, Eddsa };

// internal API
export { Point, simpleMapToCurve, arrayGetGeneric, encode };

const TwistedCurve = {
  add,
  double,
  negate,
  assertOnCurve,
  scale,
  multiScalarMul,
  assertInSubgroup,
};

// Auxiliary function to compute x coordinate from decoded coordinate y and
// parity bit x_0 using the trick to compute the square root of Edwards25519
// x = sqrt ( (y^2 - 1) / (d * y^2 + 1) ) as described in
// https://www.rfc-editor.org/rfc/pdfrfc/rfc8032.txt.pdf Section 5.1.3
function recoverX(y: bigint, x_0: bigint): bigint {
  const p = Curve.modulus;
  const u = y * y - 1n;
  const v = Curve.d * y * y - Curve.a;
  const candidate_x = (u * v) ^ (3n * ((u * v) ^ 7n)) ^ ((p - 5n) / 8n);

  let aux = mod((v * candidate_x) ^ 2n, p);

  let x =
    aux === u
      ? candidate_x
      : aux === -u
      ? (candidate_x * 2n) ^ ((p - 1n) / 4n)
      : (() => {
          throw new Error(
            `Decoding failed: no square root x exists for y value: ${y}.`
          );
        })();

  // Use the parity bit to select the correct sign for x
  if (x === 0n && x_0 === 1n) {
    throw new Error(`Invalid x value: x is zero but parity bit is 1.`);
  } else if (x % 2n !== x_0) {
    x = p - x;
  }

  return x;
}

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

  /**
   * On input a compressed representation of a Edwards25519 point as 32 bytes of
   * hexadecimal string, return the point with bigint coordinates.
   *
   * @param hex 32 bytes of hexadecimal string
   * @returns point with bigint coordinates {x, y}
   */
  fromHex(hex: string): point {
    const y = BigInt(`0x${hex}`) & ((BigInt(1) << 255n) - 1n); // y (mask top bit)
    const x_0 = (BigInt(`0x${hex}`) >> 255n) & 1n; // parity bit for x

    if (y >= Curve.modulus) {
      throw new Error(`Invalid y value: ${y} is larger tan the field size.`);
    }

    let x = recoverX(y, x_0);

    return { x, y };
  },

  provable: provable({ x: Field3, y: Field3 }),
};

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
    let p3 = affineTwistedAdd(Point.toBigint(p1), Point.toBigint(p2), f, a, d);
    return Point.from(p3);
  }

  assert(
    Curve.modulus > l2Mask + 1n,
    'Base field moduli smaller than 2^176 are not supported'
  );

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

function double(
  p1: Point,
  Curve: { modulus: bigint; a: bigint; d: bigint }
): Point {
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

// a * x^2 + y^2 = 1 + d * x^2 * y^2
function assertOnCurve(
  p: Point,
  { modulus: f, a, d }: { modulus: bigint; a: bigint; d: bigint }
) {
  let { x, y } = p;
  let one = Field3.from(1n);

  let x2 = ForeignField.mul(x, x, f);
  let y2 = ForeignField.mul(y, y, f);

  let aTimesX2PlusY2 = ForeignField.add(
    ForeignField.mul(Field3.from(a), x2, f),
    y2,
    f
  );

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
    windowSize?: number;
    multiples?: Point[];
  }
) {
  config = config ?? {};
  config.windowSize ??= Point.isConstant(point) ? 4 : 3;
  return multiScalarMul([scalar], [point], Curve, [config]);
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
  equals(
    scale(Field3.from(Curve.order), g, Curve),
    { x: 0n, y: 1n },
    Curve
  ).assertTrue();
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
  tableConfigs: (
    | { windowSize?: number; multiples?: Point[] }
    | undefined
  )[] = []
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
  let scalarChunks = scalars.map((s, i) =>
    sliceField3(s, { maxBits, chunkSize: windowSizes[i] })
  );

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
        let sjP =
          windowSize === 1
            ? points[j]
            : arrayGetGeneric(Point.provable, tables[j], sj);

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

/** EdDSA over Edwards25519 */
const Curve = createAffineTwistedCurve(TwistedCurveParams.Edwards25519);
const basePoint = Point.from(Curve.one);

/**
 * Encode a point of the Edwards25519 curve into its compressed representation.
 *
 * @param input Point with {@link Field3} coordinates {x, y}
 * @returns 32-byte compressed representation of the point as {@link Field3}
 */
function encode(input: Point): Field3 {
  let p = Curve.Field.modulus;
  // https://www.rfc-editor.org/rfc/pdfrfc/rfc8032.txt.pdf Section 5.1.2
  let witnesses = exists(8, () => {
    let x = Field3.toBigint(input.x);
    let y = Field3.toBigint(input.y);
    let x_lsb = x & 1n; // parity bit for x
    let x_masked = (x >> 1n) * 2n; // x with parity bit removed
    let y_msb = (y >> 255n) & 1n; // most significant bit of y
    let y_masked = y & ((1n << 255n) - 1n); // mask most significant bit

    return [x_lsb, ...split(x_masked), y_msb, ...split(y_masked)];
  });

  let [
    x_lsb,
    x_masked0,
    x_masked1,
    x_masked2,
    y_msb,
    y_masked0,
    y_masked1,
    y_masked2,
  ] = witnesses;

  x_lsb.assertBool('Parity bit of x coordinate is not a bit');
  y_msb.assertBool('MSB of y coordinate is not a bit');

  let x_masked: Field3 = [x_masked0, x_masked1, x_masked2];
  let y_masked: Field3 = [y_masked0, y_masked1, y_masked2];

  let x_lsb3: Field3 = [x_lsb, new Field(0n), new Field(0n)];
  let y_msb3: Field3 = [y_msb, new Field(0n), new Field(0n)];

  ForeignField.assertEquals(input.x, ForeignField.add(x_lsb3, x_masked, p));
  ForeignField.assertEquals(
    input.y,
    ForeignField.add(
      ForeignField.mul(y_msb3, Field3.from(1n << 255n), p),
      y_masked,
      p
    )
  );

  let enc = ForeignField.add(
    ForeignField.mul(x_lsb3, Field3.from(1n << 255n), p),
    y_masked,
    p
  );
  return enc;
}

/**
 * Decode a little-endian 32-byte compressed representation of Edwards25519 as
 * the point.
 *
 * @param compressed: 32-byte compressed representation of the point as {@link Field3}
 * @returns Point with {@link Field3} coordinates {x, y}
 */
function decode(input: UInt8[]): Point {
  if (input.length !== 32) {
    throw new Error(
      `Invalid compressed point: expected 32 bytes, got ${input.length}.`
    );
  }

  let p = Curve.modulus;

  // https://www.rfc-editor.org/rfc/pdfrfc/rfc8032.txt.pdf Section 5.1.3
  let witnesses = exists(11, () => {
    let bytes = input.map((byte) => byte.toBigInt());
    // most significant byte of input is the parity bit for x
    const x_par = bytes[31] >> 7n;
    bytes[31] &= 0b01111111n;
    const y_msb = bytes[31];

    const y = bytes.reduce((acc, byte, i) => acc + (byte << BigInt(i * 8)), 0n);
    assert(y < p, 'Decoding failed: y coordinate larger than the field size');
    const x = recoverX(y, x_par);

    // to check parity bit of x
    const aux = (x - x_par) / 2n;

    return [...split(aux), x_par, ...split(x), y_msb, ...split(y)];
  });

  let [aux0, aux1, aux2, x_par, x0, x1, x2, y_msb, y0, y1, y2] = witnesses;
  let x_0limbs: Field3 = [x_par, Field.from(0n), Field.from(0n)];
  let aux: Field3 = [aux0, aux1, aux2];
  let x: Field3 = [x0, x1, x2];
  let y: Field3 = [y0, y1, y2];

  ForeignField.assertLessThan(y, p);
  // check x_0 is a bit
  x_par.assertBool('Parity bit of x coordinate is not a bit');

  // check y_msb shape
  input[31].value.assertEquals(y_msb.add(x_par.mul(128n)));

  // check y decomposition
  let input_ = input.slice();
  input_[31] = UInt8.from(y_msb);
  ForeignField.assertEquals(y, Octets.toField3(input_, p));

  // check (x, y) is on the curve
  assertOnCurve({ x, y }, Curve);

  // check parity/sign of x
  ForeignField.assertEquals(
    ForeignField.add(aux, aux, p),
    ForeignField.sub(x, x_0limbs, p)
  );

  // if x is zero, x_0 must be 0
  Provable.if(
    ForeignField.equals(x, 0n, p),
    Bool,
    x_par.equals(1n).not(),
    new Bool(true)
  );
  // check sign of x
  // if x_0 is 1, x must be odd (negative)
  Provable.if(x_par.equals(1n), Bool, x[0].equals(1n), new Bool(true));

  return { x, y };
}

namespace Eddsa {
  /**
   * EdDSA signature consisting of a compressed curve point R and the scalar s.
   */
  export type Signature = { R: Field3; s: Field3 };
  export type signature = { R: bigint; s: bigint };
}

const EddsaSignature = {
  from({ R, s }: Eddsa.signature): Eddsa.Signature {
    return { R: Field3.from(R), s: Field3.from(s) };
  },
  toBigint({ R, s }: Eddsa.Signature): Eddsa.signature {
    return { R: Field3.toBigint(R), s: Field3.toBigint(s) };
  },
  isConstant: (S: Eddsa.Signature) => Provable.isConstant(EddsaSignature, S),

  /**
   * Parse an EdDSA signature from a raw 130-character hex string (64 bytes + "0x").
   */
  fromHex(rawSignature: string): Eddsa.Signature {
    // Validate input format
    let prefix = rawSignature.slice(0, 2);
    let signature = rawSignature.slice(2);
    if (prefix !== '0x' || signature.length !== 128) {
      throw new Error(
        `Signature.fromHex(): Invalid signature, expected hex string 0x... of length 130.`
      );
    }

    // Split the signature into R and s components
    const Rhex = signature.slice(0, 64); // First 32 bytes (64 hex chars for R)
    const Shex = signature.slice(64); // Last 32 bytes (64 hex chars for s)
    const R = BigInt(`0x${Rhex}`); // R value as a bigint
    const s = BigInt(`0x${Shex}`); // s value as a bigint

    if (s < 0 || s >= Curve.order) {
      throw new Error(`Invalid s value: must be a scalar modulo curve order.`);
    }

    Point.fromHex(Rhex); // Check that R represents a valid point

    return Eddsa.Signature.from({ R, s });
  },

  provable: provable({ R: Field3, s: Field3 }),
};

/**
 * Generate a new EdDSA public key from a private key that is a random 32-byte
 * random seed.
 *
 * https://www.rfc-editor.org/rfc/pdfrfc/rfc8032.txt.pdf Section 5.1.5
 *
 * @param privateKey: 32-byte random seed
 * @returns the public key as a 32-byte encoded curve point,
 *          and the full SHA2-512 digest of the private key
 */
function keygenEddsa(privateKey: bigint): [Field3, Bytes] {
  // TODO: use arrays instead of bigints?
  if (privateKey > 2n ** 256n) {
    throw new Error(`Invalid length of EdDSA private key: ${privateKey}.`);
  }
  // hash private key with SHA2-512
  const h = SHA2.hash(512, [privateKey]);
  // only need lowest 32 bytes to generate the public key
  let buffer = h.bytes.slice(0, 32);
  // prune buffer
  buffer[0] = UInt8.from(
    Gadgets.and(buffer[0].value, Field.from(0b11111000), 8)
  ); // clear lowest 3 bits
  buffer[31] = UInt8.from(
    Gadgets.and(buffer[31].value, Field.from(0b01111111), 8)
  ); // clear highest bit
  buffer[31] = UInt8.from(
    Gadgets.or(buffer[31].value, Field.from(0b01000000), 8)
  ); // set second highest bit

  // NOTE: despite clearing the top bit,
  //       the scalar could be larger than a native field element

  // read scalar from buffer (initially laid out as little endian)
  const f = Curve.Field.modulus;
  const s = Octets.toField3(buffer, f);

  return [encode(scale(s, basePoint, Curve)), h];
}

/**
 * Sign a message using Ed25519 (EdDSA over Edwards25519 curve).
 *
 * https://www.rfc-editor.org/rfc/pdfrfc/rfc8032.txt.pdf Section 5.1.6
 *
 * @param privateKey: 32-byte random seed
 * @param message: arbitrary length message to be signed
 * @returns the 64-bit signature composed by 32-bytes corresponding to a
 *          compressed curve point and a 32-byte scalar
 */
function signEddsa(privateKey: bigint, message: bigint): Eddsa.Signature {
  const L = Curve.order;
  const [publicKey, h] = keygenEddsa(privateKey);
  // secret scalar obtained from first half of the digest
  const scalar = h.bytes.slice(0, 32);
  // prefix obtained from second half of the digest
  const prefix = h.bytes.slice(32, 64);

  // Hash the prefix concatenated with the message to obtain 64 bytes, that
  // need to be interpreted as little endian and reduced modulo the curve order
  const r = Octets.toField3(SHA2.hash(512, [...prefix, message]).bytes, L);

  // R is the encoding of the point resulting from [r]B
  let R = encode(scale(r, basePoint, Curve));

  // Hash the encoding concatenated with the public key and the message to
  // obtain a 64-byte digest that needs to be interpreted as little endian
  // and reduced modulo the curve order
  const k = Octets.toField3(
    SHA2.hash(512, [
      ...Octets.fromField3(R).flat(),
      ...Octets.fromField3(publicKey).flat(),
      message,
    ]).bytes,
    L
  );

  let s = ForeignField.add(
    r,
    ForeignField.mul(k, Octets.toField3(scalar, L), L),
    L
  );

  return { R, s };
}

function verifyEddsa(
  signature: Eddsa.Signature,
  message: UInt8[],
  publicKey: Field3
): Bool {
  let { R, s } = signature;

  let { x, y } = decode(Octets.fromField3(R));
  let A = decode(Octets.fromField3(publicKey));

  ForeignField.assertLessThanOrEqual(s, Curve.order);

  let k = SHA2.hash(512, [
    ...Octets.fromField3(R).flat(),
    ...Octets.fromField3(publicKey).flat(),
    ...message.flat(),
  ]).bytes;

  // Check [s]B = R + [k]A
  return Provable.equal(
    Point,
    scale(s, basePoint, Curve),
    add(
      { x, y },
      scale(Octets.toField3(k, Curve.Field.modulus), A, Curve),
      Curve
    )
  );
}

const Eddsa = {
  sign: signEddsa,
  verify: verifyEddsa,
  Signature: EddsaSignature,
};
