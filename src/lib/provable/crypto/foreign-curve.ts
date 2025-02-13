import {
  CurveParams,
  CurveAffine,
  createCurveAffine,
} from '../../../bindings/crypto/elliptic-curve.js';
import type { Group } from '../group.js';
import { ProvablePureExtended } from '../types/struct.js';
import { AlmostForeignField, createForeignField } from '../foreign-field.js';
import { EllipticCurve, Point } from '../gadgets/elliptic-curve.js';
import { Field3 } from '../gadgets/foreign-field.js';
import { assert } from '../gadgets/common.js';
import { Provable } from '../provable.js';
import { provableFromClass } from '../types/provable-derivers.js';
import { l2Mask, multiRangeCheck } from '../gadgets/range-check.js';
import { Bytes } from '../bytes.js';

// external API
export { createForeignCurve, ForeignCurve };

// internal API
export { toPoint, FlexiblePoint };

type FlexiblePoint = {
  x: AlmostForeignField | Field3 | bigint | number;
  y: AlmostForeignField | Field3 | bigint | number;
};
function toPoint({ x, y }: ForeignCurve): Point {
  return { x: x.value, y: y.value };
}

class ForeignCurve {
  x: AlmostForeignField;
  y: AlmostForeignField;

  /**
   * Create a new {@link ForeignCurve} from an object representing the (affine) x and y coordinates.
   *
   * Note: Inputs must be range checked if they originate from a different field with a different modulus or if they are not constants. Please refer to the {@link ForeignField} constructor comments for more details.
   *
   * @example
   * ```ts
   * let x = new ForeignCurve({ x: 1n, y: 1n });
   * ```
   *
   * **Important**: By design, there is no way for a `ForeignCurve` to represent the zero point.
   *
   * **Warning**: This fails for a constant input which does not represent an actual point on the curve.
   */
  constructor(g: {
    x: AlmostForeignField | Field3 | bigint | number;
    y: AlmostForeignField | Field3 | bigint | number;
  }) {
    this.x = new this.Constructor.Field(g.x);
    this.y = new this.Constructor.Field(g.y);
    // don't allow constants that aren't on the curve
    if (this.isConstant()) {
      this.assertOnCurve();
      this.assertInSubgroup();
    }
  }

  /**
   * Coerce the input to a {@link ForeignCurve}.
   */
  static from(g: ForeignCurve | FlexiblePoint) {
    if (g instanceof this) return g;
    return new this(g);
  }

  /**
   * Parses a hexadecimal string representing an uncompressed elliptic curve point and coerces it into a {@link ForeignCurve} point.
   *
   * The method extracts the x and y coordinates from the provided hex string and verifies that the resulting point lies on the curve.
   *
   * **Note:** This method only supports uncompressed elliptic curve points, which are 65 bytes in total (1-byte prefix + 32 bytes for x + 32 bytes for y).
   *
   * @param hex - The hexadecimal string representing the uncompressed elliptic curve point.
   * @returns - A point on the foreign curve, parsed from the given hexadecimal string.
   *
   * @throws - Throws an error if the input is not a valid public key.
   *
   * @example
   * ```ts
   * class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
   *
   * const publicKeyHex = '04f8b8db25c619d0c66b2dc9e97ecbafafae...'; // Example hex string for uncompressed point
   * const point = Secp256k1.fromHex(publicKeyHex);
   * ```
   *
   * **Important:** This method is only designed to handle uncompressed elliptic curve points in hex format.
   */
  static fromHex(hex: string) {
    // trim the '0x' prefix if present
    if (hex.startsWith('0x')) {
      hex = hex.slice(2);
    }

    const bytes = Bytes.fromHex(hex).toBytes();
    const sizeInBytes = Math.ceil(this.Bigint.Field.sizeInBits / 8);

    // extract x and y coordinates from the byte array
    const tail = bytes.subarray(1); // skip the first byte (prefix)
    const xBytes = tail.subarray(0, sizeInBytes); // first `sizeInBytes` bytes for x-coordinate
    const yBytes = tail.subarray(sizeInBytes, 2 * sizeInBytes); // next `sizeInBytes` bytes for y-coordinate

    // convert byte arrays to bigint
    const x = BigInt('0x' + Bytes.from(xBytes).toHex());
    const y = BigInt('0x' + Bytes.from(yBytes).toHex());

    // construct the point on the curve using the x and y coordinates
    let P = this.from({ x, y });

    // ensure that the point is on the curve
    P.assertOnCurve();

    return P;
  }

  /**
   * Create a new {@link ForeignCurve} instance from an Ethereum public key in hex format, which may be either compressed or uncompressed.
   * This method is designed to handle the parsing of public keys as used by the ethers.js library.
   *
   * The input should represent the affine x and y coordinates of the point, in hexadecimal format.
   * Compressed keys are 33 bytes long and begin with 0x02 or 0x03, while uncompressed keys are 65 bytes long and begin with 0x04.
   *
   * **Warning:** This method is specifically designed for use with the Secp256k1 curve. Using it with other curves may result in incorrect behavior or errors.
   * Ensure that the curve setup matches Secp256k1, as shown in the example, to avoid unintended issues.
   *
   * @example
   * ```ts
   * import { Wallet, Signature, getBytes } from 'ethers';
   *
   * class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
   *
   * const wallet = Wallet.createRandom();
   *
   * const publicKey = Secp256k1.fromEthers(wallet.publicKey.slice(2));
   * ```
   *
   * @param hex - The public key as a hexadecimal string (without the "0x" prefix).
   * @returns A new instance of the curve representing the given public key.
   */
  static fromEthers(hex: string) {
    // trim the '0x' prefix if present
    if (hex.startsWith('0x')) {
      hex = hex.slice(2);
    }

    const bytes = Bytes.fromHex(hex).toBytes(); // convert hex string to Uint8Array
    const len = bytes.length;
    const head = bytes[0]; // first byte is the prefix (compression identifier)
    const tail = bytes.slice(1); // remaining bytes contain the coordinates

    const xBytes = tail.slice(0, 32); // extract the x-coordinate (first 32 bytes)
    const x = BigInt('0x' + Bytes.from(xBytes).toHex()); // convert Uint8Array to bigint

    let p: { x: bigint; y: bigint } | undefined = undefined;

    // handle compressed points (33 bytes, prefix 0x02 or 0x03)
    if (len === 33 && [0x02, 0x03].includes(head)) {
      // ensure x is within the valid field range
      assert(0n < x && x < this.Bigint.Field.modulus);

      // compute the right-hand side of the curve equation: x³ + ax + b
      const crvX = this.Bigint.Field.mod(
        this.Bigint.Field.mod(x * x) * x + this.Bigint.b
      );
      // compute the square root (y-coordinate)
      let y = this.Bigint.Field.sqrt(crvX)!;
      const isYOdd = (y & 1n) === 1n; // determine whether y is odd
      const headOdd = (head & 1) === 1; // determine whether the prefix indicates an odd y
      if (headOdd !== isYOdd) y = this.Bigint.Field.mod(-y); // adjust y if necessary
      p = { x, y };
    }

    // handle uncompressed points (65 bytes, prefix 0x04)
    if (len === 65 && head === 0x04) {
      const yBytes = tail.slice(32, 64); // extract the y-coordinate (next 32 bytes)
      p = { x, y: BigInt('0x' + Bytes.from(yBytes).toHex()) };
    }

    const P = this.from(p!); // create the curve point from the parsed coordinates
    P.assertOnCurve(); // verify the point lies on the curve

    return P;
  }

  /**
   * The constant generator point.
   */
  static get generator() {
    return new this(this.Bigint.one);
  }
  /**
   * The size of the curve's base field.
   */
  static get modulus() {
    return this.Bigint.modulus;
  }
  /**
   * The size of the curve's base field.
   */
  get modulus() {
    return this.Constructor.Bigint.modulus;
  }

  /**
   * Checks whether this curve point is constant.
   *
   * See {@link FieldVar} to understand constants vs variables.
   */
  isConstant() {
    return Provable.isConstant(this.Constructor, this);
  }

  /**
   * Convert this curve point to a point with bigint coordinates.
   */
  toBigint() {
    return this.Constructor.Bigint.fromNonzero({
      x: this.x.toBigInt(),
      y: this.y.toBigInt(),
    });
  }

  /**
   * Elliptic curve addition.
   *
   * ```ts
   * let r = p.add(q); // r = p + q
   * ```
   *
   * **Important**: this is _incomplete addition_ and does not handle the degenerate cases:
   * - Inputs are equal, `g = h` (where you would use {@link double}).
   *   In this case, the result of this method is garbage and can be manipulated arbitrarily by a malicious prover.
   * - Inputs are inverses of each other, `g = -h`, so that the result would be the zero point.
   *   In this case, the proof fails.
   *
   * If you want guaranteed soundness regardless of the input, use {@link addSafe} instead.
   *
   * @throws if the inputs are inverses of each other.
   */
  add(h: ForeignCurve | FlexiblePoint) {
    let Curve = this.Constructor.Bigint;
    let h_ = this.Constructor.from(h);
    let p = EllipticCurve.add(toPoint(this), toPoint(h_), Curve);
    return new this.Constructor(p);
  }

  /**
   * Safe elliptic curve addition.
   *
   * This is the same as {@link add}, but additionally proves that the inputs are not equal.
   * Therefore, the method is guaranteed to either fail or return a valid addition result.
   *
   * **Beware**: this is more expensive than {@link add}, and is still incomplete in that
   * it does not succeed on equal or inverse inputs.
   *
   * @throws if the inputs are equal or inverses of each other.
   */
  addSafe(h: ForeignCurve | FlexiblePoint) {
    let h_ = this.Constructor.from(h);

    // prove that we have x1 != x2 => g != +-h
    let x1 = this.x.assertCanonical();
    let x2 = h_.x.assertCanonical();
    x1.equals(x2).assertFalse();

    return this.add(h_);
  }

  /**
   * Elliptic curve doubling.
   *
   * @example
   * ```ts
   * let r = p.double(); // r = 2 * p
   * ```
   */
  double() {
    let Curve = this.Constructor.Bigint;
    let p = EllipticCurve.double(toPoint(this), Curve);
    return new this.Constructor(p);
  }

  /**
   * Elliptic curve negation.
   *
   * @example
   * ```ts
   * let r = p.negate(); // r = -p
   * ```
   */
  negate(): ForeignCurve {
    return new this.Constructor({ x: this.x, y: this.y.neg() });
  }

  /**
   * Elliptic curve scalar multiplication, where the scalar is represented as a {@link ForeignField} element.
   *
   * **Important**: this proves that the result of the scalar multiplication is not the zero point.
   *
   * @throws if the scalar multiplication results in the zero point; for example, if the scalar is zero.
   *
   * @example
   * ```ts
   * let r = p.scale(s); // r = s * p
   * ```
   */
  scale(scalar: AlmostForeignField | bigint | number) {
    let Curve = this.Constructor.Bigint;
    let scalar_ = this.Constructor.Scalar.from(scalar);
    let p = EllipticCurve.scale(scalar_.value, toPoint(this), Curve);
    return new this.Constructor(p);
  }

  static assertOnCurve(g: ForeignCurve) {
    EllipticCurve.assertOnCurve(toPoint(g), this.Bigint);
  }

  /**
   * Assert that this point lies on the elliptic curve, which means it satisfies the equation
   * `y^2 = x^3 + ax + b`
   */
  assertOnCurve() {
    this.Constructor.assertOnCurve(this);
  }

  static assertInSubgroup(g: ForeignCurve) {
    if (this.Bigint.hasCofactor) {
      EllipticCurve.assertInSubgroup(toPoint(g), this.Bigint);
    }
  }

  /**
   * Assert that this point lies in the subgroup defined by `order*P = 0`.
   *
   * Note: this is a no-op if the curve has cofactor equal to 1. Otherwise
   * it performs the full scalar multiplication `order*P` and is expensive.
   */
  assertInSubgroup() {
    this.Constructor.assertInSubgroup(this);
  }

  /**
   * Check that this is a valid element of the target subgroup of the curve:
   * - Check that the coordinates are valid field elements
   * - Use {@link assertOnCurve()} to check that the point lies on the curve
   * - If the curve has cofactor unequal to 1, use {@link assertInSubgroup()}.
   */
  static check(g: ForeignCurveNotNeeded) {
    multiRangeCheck(g.x.value);
    multiRangeCheck(g.y.value);
    this.assertOnCurve(g); // this does almost reduced checks on x and y
    this.assertInSubgroup(g);
  }

  // dynamic subclassing infra
  get Constructor() {
    return this.constructor as typeof ForeignCurve;
  }
  static _Bigint?: CurveAffine;
  static _Field?: typeof AlmostForeignField;
  static _Scalar?: typeof AlmostForeignField;
  static _provable?: ProvablePureExtended<
    ForeignCurve,
    { x: bigint; y: bigint },
    { x: string; y: string }
  >;

  /**
   * Curve arithmetic on JS bigints.
   */
  static get Bigint() {
    assert(this._Bigint !== undefined, 'ForeignCurve not initialized');
    return this._Bigint;
  }
  /**
   * The base field of this curve as a {@link ForeignField}.
   */
  static get Field() {
    assert(this._Field !== undefined, 'ForeignCurve not initialized');
    return this._Field;
  }
  /**
   * The scalar field of this curve as a {@link ForeignField}.
   */
  static get Scalar() {
    assert(this._Scalar !== undefined, 'ForeignCurve not initialized');
    return this._Scalar;
  }
  /**
   * `Provable<ForeignCurve>`
   */
  static get provable() {
    assert(this._provable !== undefined, 'ForeignCurve not initialized');
    return this._provable;
  }
}

class ForeignCurveNotNeeded extends ForeignCurve {
  constructor(g: {
    x: AlmostForeignField | Field3 | bigint | number;
    y: AlmostForeignField | Field3 | bigint | number;
  }) {
    super(g);
  }

  static check(g: ForeignCurveNotNeeded) {
    multiRangeCheck(g.x.value);
    multiRangeCheck(g.y.value);
    this.assertOnCurve(g);
    this.assertInSubgroup(g);
  }
}

/**
 * Create a class representing an elliptic curve group, which is different from the native {@link Group}.
 *
 * ```ts
 * const Curve = createForeignCurve(Crypto.CurveParams.Secp256k1);
 * ```
 *
 * `createForeignCurve(params)` takes curve parameters {@link CurveParams} as input.
 * We support `modulus` and `order` to be prime numbers up to 259 bits.
 *
 * The returned {@link ForeignCurveNotNeeded} class represents a _non-zero curve point_ and supports standard
 * elliptic curve operations like point addition and scalar multiplication.
 *
 * {@link ForeignCurveNotNeeded} also includes to associated foreign fields: `ForeignCurve.Field` and `ForeignCurve.Scalar`, see {@link createForeignField}.
 */
function createForeignCurve(params: CurveParams): typeof ForeignCurve {
  assert(
    params.modulus > l2Mask + 1n,
    'Base field moduli smaller than 2^176 are not supported'
  );

  const FieldUnreduced = createForeignField(params.modulus);
  const ScalarUnreduced = createForeignField(params.order);
  class Field extends FieldUnreduced.AlmostReduced {}
  class Scalar extends ScalarUnreduced.AlmostReduced {}

  const BigintCurve = createCurveAffine(params);

  class Curve extends ForeignCurve {
    static _Bigint = BigintCurve;
    static _Field = Field;
    static _Scalar = Scalar;
    static _provable = provableFromClass(Curve, { x: Field, y: Field });
  }

  return Curve;
}
