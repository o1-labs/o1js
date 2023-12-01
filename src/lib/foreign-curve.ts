import {
  CurveParams,
  CurveAffine,
  createCurveAffine,
} from '../bindings/crypto/elliptic_curve.js';
import type { Group } from './group.js';
import { ProvableExtended } from './circuit_value.js';
import { AlmostForeignField, createForeignField } from './foreign-field.js';
import { EllipticCurve, Point } from './gadgets/elliptic-curve.js';
import { Field3 } from './gadgets/foreign-field.js';
import { assert } from './gadgets/common.js';
import { Provable } from './provable.js';
import { provableFromClass } from '../bindings/lib/provable-snarky.js';

// external API
export { createForeignCurve, ForeignCurve };

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
   * @example
   * ```ts
   * let x = new ForeignCurve({ x: 1n, y: 1n });
   * ```
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
    if (this.isConstant()) this.assertOnCurve();
  }

  /**
   * Coerce the input to a {@link ForeignCurve}.
   */
  static from(g: ForeignCurve | FlexiblePoint) {
    if (g instanceof this) return g;
    return new this(g);
  }

  static get generator() {
    return new this(this.Bigint.one);
  }
  static get modulus() {
    return this.Bigint.modulus;
  }
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
   */
  add(h: ForeignCurve | FlexiblePoint) {
    let h_ = this.Constructor.from(h);
    let p = EllipticCurve.add(toPoint(this), toPoint(h_), this.modulus);
    return new this.Constructor(p);
  }

  /**
   * Elliptic curve doubling.
   */
  double() {
    let p = EllipticCurve.double(toPoint(this), this.modulus);
    return new this.Constructor(p);
  }

  /**
   * Elliptic curve negation.
   */
  negate(): ForeignCurve {
    return new this.Constructor({ x: this.x, y: this.y.neg() });
  }

  static assertOnCurve(g: ForeignCurve) {
    EllipticCurve.assertOnCurve(toPoint(g), this.Bigint.modulus, this.Bigint.b);
  }

  /**
   * Assert that this point lies on the elliptic curve, which means it satisfies the equation
   * y^2 = x^3 + ax + b
   */
  assertOnCurve() {
    this.Constructor.assertOnCurve(this);
  }

  /**
   * Elliptic curve scalar multiplication, where the scalar is represented as a {@link ForeignField} element.
   */
  scale(scalar: AlmostForeignField | bigint | number) {
    let scalar_ = this.Constructor.Scalar.from(scalar);
    if (this.isConstant() && scalar_.isConstant()) {
      let z = this.Constructor.Bigint.scale(
        this.toBigint(),
        scalar_.toBigInt()
      );
      return new this.Constructor(z);
    }
    let p = EllipticCurve.multiScalarMul(
      this.Constructor.Bigint,
      [scalar_.value],
      [toPoint(this)],
      [{ windowSize: 3 }]
    );
    return new this.Constructor(p);
  }

  static assertInSubgroup(g: ForeignCurve) {
    if (g.isConstant()) {
      let isInGroup = this.Bigint.isInSubgroup(g.toBigint());
      if (!isInGroup)
        throw Error(
          `${this.name}.assertInSubgroup(): ${JSON.stringify(
            this.provable.toJSON(g)
          )} is not in the target subgroup.`
        );
      return;
    }
    throw Error('unimplemented');
  }

  /**
   * Assert than this point lies in the subgroup defined by order*P = 0,
   * by performing the scalar multiplication.
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
    this.Field.check(g.x);
    this.Field.check(g.y);
    this.assertOnCurve(g);
    if (this.Bigint.hasCofactor) this.assertInSubgroup(g);
  }

  // dynamic subclassing infra
  get Constructor() {
    return this.constructor as typeof ForeignCurve;
  }
  static _Bigint?: CurveAffine;
  static _Field?: typeof AlmostForeignField;
  static _Scalar?: typeof AlmostForeignField;
  static _provable?: ProvableExtended<ForeignCurve, { x: string; y: string }>;

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
 * const Curve = createForeignCurve(secp256k1Params); // the elliptic curve 'secp256k1'
 * ```
 *
 * `createForeignCurve(params)` takes the curve parameters {@link CurveParams} as input.
 * We support `modulus` and `order` to be prime numbers to 259 bits.
 *
 * The returned {@link ForeignCurve} class supports standard elliptic curve operations like point addition and scalar multiplication.
 * It also includes to associated foreign fields: `ForeignCurve.BaseField` and `ForeignCurve.Scalar`, see {@link createForeignField}.
 *
 * _Advanced usage:_
 *
 * To skip automatic validity checks when introducing curve points and scalars into provable code,
 * use the optional `{ unsafe: true }` configuration. See {@link createForeignField} for details.
 * This option is applied to both the scalar field and the base field.
 *
 * @param params parameters for the elliptic curve you are instantiating
 * @param options
 * - `unsafe: boolean` determines whether `ForeignField` elements are constrained to be valid on creation.
 */
function createForeignCurve(params: CurveParams): typeof ForeignCurve {
  const FieldUnreduced = createForeignField(params.modulus);
  const ScalarUnreduced = createForeignField(params.order);
  class Field extends FieldUnreduced.AlmostReduced {}
  class Scalar extends ScalarUnreduced.AlmostReduced {}

  const BigintCurve = createCurveAffine(params);
  assert(BigintCurve.a === 0n, 'a !=0 is not supported');
  assert(!BigintCurve.hasCofactor, 'cofactor != 1 is not supported');

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
