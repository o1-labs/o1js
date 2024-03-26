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
    return Provable.isConstant(this.Constructor.provable, this);
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
  static check(g: ForeignCurve) {
    // more efficient than the automatic check, which would do this for each field separately
    this.Field.assertAlmostReduced(g.x, g.y);
    this.assertOnCurve(g);
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
 * The returned {@link ForeignCurve} class represents a _non-zero curve point_ and supports standard
 * elliptic curve operations like point addition and scalar multiplication.
 *
 * {@link ForeignCurve} also includes to associated foreign fields: `ForeignCurve.Field` and `ForeignCurve.Scalar`, see {@link createForeignField}.
 */
function createForeignCurve(params: CurveParams): typeof ForeignCurve {
  const FieldUnreduced = createForeignField(params.modulus);
  const ScalarUnreduced = createForeignField(params.order);
  class Field extends FieldUnreduced.AlmostReduced {}
  class Scalar extends ScalarUnreduced.AlmostReduced {}

  const BigintCurve = createCurveAffine(params);

  class Curve extends ForeignCurve {
    static _Bigint = BigintCurve;
    static _Field = Field;
    static _Scalar = Scalar;
    static _provable = provableFromClass(Curve, {
      x: Field.provable,
      y: Field.provable,
    });
  }

  return Curve;
}
