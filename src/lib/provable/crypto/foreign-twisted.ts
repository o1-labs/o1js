import {
  TwistedCurveParams,
  createAffineTwistedCurve,
  AffineTwistedCurve,
} from '../../../bindings/crypto/elliptic-curve.js';
import type { Group } from '../group.js';
import { ProvablePureExtended } from '../types/struct.js';
import { AlmostForeignField, createForeignField } from '../foreign-field.js';
import { TwistedCurve, Point } from '../gadgets/twisted-curve.js';
import { Field3 } from '../gadgets/foreign-field.js';
import { assert } from '../gadgets/common.js';
import { Provable } from '../provable.js';
import { provableFromClass } from '../types/provable-derivers.js';
import { l2Mask } from '../gadgets/range-check.js';
import { Bytes } from '../bytes.js';

// external API
export { createForeignTwisted, ForeignTwisted };

// internal API
export { toPoint, FlexiblePoint };

type FlexiblePoint = {
  x: AlmostForeignField | Field3 | bigint | number;
  y: AlmostForeignField | Field3 | bigint | number;
};
function toPoint({ x, y }: ForeignTwisted): Point {
  return { x: x.value, y: y.value };
}

class ForeignTwisted {
  x: AlmostForeignField;
  y: AlmostForeignField;

  /**
   * Create a new {@link ForeignTwisted} from an object representing the (twisted) x and y coordinates.
   *
   * Note: Inputs must be range checked if they originate from a different field with a different modulus or if they are not constants. Please refer to the {@link ForeignField} constructor comments for more details.
   *
   * @example
   * ```ts
   * let x = new ForeignTwisted({ x: 1n, y: 1n });
   * ```
   *
   * **Warning**: This fails for a constant input which does not represent an actual point on the curve.
   *
   * **Note**: For now, only the edwards25519 curve is supported.
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
    }
  }

  /**
   * Coerce the input to a {@link ForeignTwisted}.
   */
  static from(g: ForeignTwisted | FlexiblePoint) {
    if (g instanceof this) return g;
    return new this(g);
  }

  /**
   * Parses a hexadecimal string representing an uncompressed elliptic curve point
   * and coerces it into a {@link ForeignTwisted} point using big-endian byte order.
   *
   * The method extracts the x and y coordinates from the provided hex string and
   * verifies that the resulting point lies on the curve.
   *
   * **Note:** This method only supports uncompressed elliptic curve points, which
   * are 65 bytes in total (1-byte prefix + 32 bytes for x + 32 bytes for y).
   *
   * @param hex - The hexadecimal string representing the uncompressed elliptic curve point.
   * @returns - A point on the foreign curve, parsed from the given hexadecimal string.
   *
   * @throws - Throws an error if the input is not a valid public key.
   *
   * @example
   * ```ts
   * class Edwards25519 extends createForeignCurveTwisted(Crypto.TwistedCurveParams.Edwards25519) {}
   *
   * // Example hex string for uncompressed point
   * const publicKeyHex = '04f8b8db25c619d0c66b2dc9e97ecbafafae...';
   * const point = Edwards25519.fromHex(publicKeyHex);
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
    const xBytes = bytes.subarray(0, sizeInBytes); // first `sizeInBytes` bytes for x-coordinate
    const yBytes = bytes.subarray(sizeInBytes, 2 * sizeInBytes); // next `sizeInBytes` bytes for y-coordinate

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
    return this.Constructor.Bigint.from({
      x: this.x.toBigInt(),
      y: this.y.toBigInt(),
    });
  }

  /**
   * Twisted elliptic curve addition (complete)
   *
   * ```ts
   * let r = p.add(q); // r = p + q
   * ```
   */
  add(h: ForeignTwisted | FlexiblePoint) {
    let Curve = this.Constructor.Bigint;
    let h_ = this.Constructor.from(h);
    let p = TwistedCurve.add(toPoint(this), toPoint(h_), Curve);
    return new this.Constructor(p);
  }

  /**
   * Twisted elliptic curve doubling.
   *
   * @example
   * ```ts
   * let r = p.double(); // r = 2 * p
   * ```
   */
  double() {
    let Curve = this.Constructor.Bigint;
    let p = TwistedCurve.double(toPoint(this), Curve);
    return new this.Constructor(p);
  }

  /**
   * Twisted elliptic curve negation.
   *
   * @example
   * ```ts
   * let r = p.negate(); // r = -p
   * ```
   */
  negate(): ForeignTwisted {
    return new this.Constructor({ x: this.x.neg(), y: this.y });
  }

  /**
   * Twisted elliptic curve scalar multiplication, where the scalar is represented as a {@link ForeignField} element.
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
    let p = TwistedCurve.scale(scalar_.value, toPoint(this), Curve);
    return new this.Constructor(p);
  }

  static assertOnCurve(g: ForeignTwisted) {
    TwistedCurve.assertOnCurve(toPoint(g), this.Bigint);
  }

  /**
   * Assert that this point lies on the elliptic curve, which means it satisfies the equation
   * `a * x^2 + y^2 = 1 + d * x^2 * y^2`
   */
  assertOnCurve() {
    this.Constructor.assertOnCurve(this);
  }

  // dynamic subclassing infra
  get Constructor() {
    return this.constructor as typeof ForeignTwisted;
  }
  static _Bigint?: AffineTwistedCurve;
  static _Field?: typeof AlmostForeignField;
  static _Scalar?: typeof AlmostForeignField;
  static _provable?: ProvablePureExtended<
    ForeignTwisted,
    { x: bigint; y: bigint },
    { x: string; y: string }
  >;

  /**
   * Curve arithmetic on JS bigints.
   */
  static get Bigint() {
    assert(this._Bigint !== undefined, 'ForeignTwisted not initialized');
    return this._Bigint;
  }
  /**
   * The base field of this curve as a {@link ForeignField}.
   */
  static get Field() {
    assert(this._Field !== undefined, 'ForeignTwisted not initialized');
    return this._Field;
  }
  /**
   * The scalar field of this curve as a {@link ForeignField}.
   */
  static get Scalar() {
    assert(this._Scalar !== undefined, 'ForeignTwisted not initialized');
    return this._Scalar;
  }
  /**
   * `Provable<ForeignCurve>`
   */
  static get provable() {
    assert(this._provable !== undefined, 'ForeignTwisted not initialized');
    return this._provable;
  }
}

/**
 * Create a class representing a twisted elliptic curve group, which is different from the native {@link Group}.
 *
 * ```ts
 * const Curve = createForeignTwisted(Crypto.TwistedCurveParams.Edwards25519);
 * ```
 *
 * `createForeignTwisted(params)` takes curve parameters {@link TwistedCurveParams} as input.
 * We support `modulus` and `order` to be prime numbers up to 259 bits.
 *
 * The returned {@link ForeignCurveNotNeeded} class represents a _non-zero curve point_ and supports standard
 * elliptic curve operations like point addition and scalar multiplication.
 *
 * {@link ForeignCurveNotNeeded} also includes to associated foreign fields: `ForeignCurve.Field` and `ForeignCurve.Scalar`, see {@link createForeignField}.
 */
function createForeignTwisted(
  params: TwistedCurveParams
): typeof ForeignTwisted {
  assert(
    params.modulus > l2Mask + 1n,
    'Base field moduli smaller than 2^176 are not supported'
  );

  const FieldUnreduced = createForeignField(params.modulus);
  const ScalarUnreduced = createForeignField(params.order);
  class Field extends FieldUnreduced.AlmostReduced {}
  class Scalar extends ScalarUnreduced.AlmostReduced {}

  const BigintCurve = createAffineTwistedCurve(params);

  class Curve extends ForeignTwisted {
    static _Bigint = BigintCurve;
    static _Field = Field;
    static _Scalar = Scalar;
    static _provable = provableFromClass(Curve, { x: Field, y: Field });
  }

  return Curve;
}
