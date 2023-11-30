import {
  CurveParams,
  createCurveAffine,
} from '../bindings/crypto/elliptic_curve.js';
import { Snarky } from '../snarky.js';
import { Bool } from './bool.js';
import type { Group } from './group.js';
import { Struct, isConstant } from './circuit_value.js';
import { AlmostForeignField, createForeignField } from './foreign-field.js';
import { MlBoolArray } from './ml/fields.js';
import { EllipticCurve, Point } from './gadgets/elliptic-curve.js';
import { Field3 } from './gadgets/foreign-field.js';

// external API
export { createForeignCurve };

// internal API
export { ForeignCurveClass };

type Affine = { x: AlmostForeignField; y: AlmostForeignField };

type ForeignCurveClass = ReturnType<typeof createForeignCurve>;

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
function createForeignCurve(params: CurveParams) {
  const Curve = createCurveAffine(params);

  const BaseFieldUnreduced = createForeignField(params.modulus);
  const ScalarFieldUnreduced = createForeignField(params.order);
  class BaseField extends BaseFieldUnreduced.AlmostReduced {}
  class ScalarField extends ScalarFieldUnreduced.AlmostReduced {}

  // this is necessary to simplify the type of ForeignCurve, to avoid
  // TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize.
  const Affine: Struct<Affine> = Struct({
    x: BaseField.AlmostReduced.provable,
    y: BaseField.AlmostReduced.provable,
  });

  const ConstantCurve = createCurveAffine(params);

  function toBigint(g: Affine) {
    return { x: g.x.toBigInt(), y: g.y.toBigInt() };
  }
  function toConstant(g: Affine) {
    return { ...toBigint(g), infinity: false };
  }

  class ForeignCurve extends Affine {
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
      x: BaseField | Field3 | bigint | number;
      y: BaseField | Field3 | bigint | number;
    }) {
      let x = new BaseField(g.x);
      let y = new BaseField(g.y);
      super({ x, y });
      // don't allow constants that aren't on the curve
      if (this.isConstant()) this.assertOnCurve();
    }

    /**
     * Coerce the input to a {@link ForeignCurve}.
     */
    static from(
      g:
        | ForeignCurve
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
    ) {
      if (g instanceof ForeignCurve) return g;
      return new ForeignCurve(g);
    }

    static generator = new ForeignCurve(params.generator);
    static modulus = params.modulus;
    get modulus() {
      return params.modulus;
    }

    /**
     * Checks whether this curve point is constant.
     *
     * See {@link FieldVar} to understand constants vs variables.
     */
    isConstant() {
      return isConstant(ForeignCurve, this);
    }

    /**
     * Convert this curve point to a point with bigint coordinates.
     */
    toBigint() {
      return { x: this.x.toBigInt(), y: this.y.toBigInt() };
    }

    /**
     * Elliptic curve addition.
     */
    add(
      h:
        | ForeignCurve
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
    ) {
      let h_ = ForeignCurve.from(h);
      if (this.isConstant() && h_.isConstant()) {
        let z = ConstantCurve.add(toConstant(this), toConstant(h_));
        return new ForeignCurve(z);
      }
      let p = EllipticCurve.add(toPoint(this), toPoint(h_), this.modulus);
      return new ForeignCurve(p);
    }

    /**
     * Elliptic curve doubling.
     */
    double() {
      if (this.isConstant()) {
        let z = ConstantCurve.double(toConstant(this));
        return new ForeignCurve(z);
      }
      let p = EllipticCurve.double(toPoint(this), this.modulus);
      return new ForeignCurve(p);
    }

    /**
     * Elliptic curve negation.
     */
    negate() {
      if (this.isConstant()) {
        let z = ConstantCurve.negate(toConstant(this));
        return new ForeignCurve(z);
      }
      throw Error('unimplemented');
    }

    private static assertOnCurve(g: Affine) {
      if (isConstant(ForeignCurve, g)) {
        let isOnCurve = ConstantCurve.isOnCurve(toConstant(g));
        if (!isOnCurve)
          throw Error(
            `${this.name}.assertOnCurve(): ${JSON.stringify(
              ForeignCurve.toJSON(g)
            )} is not on the curve.`
          );
        return;
      }
      throw Error('unimplemented');
    }

    /**
     * Assert that this point lies on the elliptic curve, which means it satisfies the equation
     * y^2 = x^3 + ax + b
     */
    assertOnCurve() {
      ForeignCurve.assertOnCurve(this);
    }

    // TODO wrap this in a `Scalar` type which is a Bool array under the hood?
    /**
     * Elliptic curve scalar multiplication, where the scalar is represented as a little-endian
     * array of bits, and each bit is represented by a {@link Bool}.
     */
    scale(scalar: ScalarField) {
      if (this.isConstant() && scalar.isConstant()) {
        let scalar0 = scalar.toBigInt();
        let z = ConstantCurve.scale(toConstant(this), scalar0);
        return new ForeignCurve(z);
      }
      let p = EllipticCurve.multiScalarMul(
        Curve,
        [scalar.value],
        [toPoint(this)]
      );
      return new ForeignCurve(p);
    }

    private static assertInSubgroup(g: Affine) {
      if (isConstant(Affine, g)) {
        let isInGroup = ConstantCurve.isInSubgroup(toConstant(g));
        if (!isInGroup)
          throw Error(
            `${this.name}.assertInSubgroup(): ${JSON.stringify(
              g
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
      ForeignCurve.assertInSubgroup(this);
    }

    /**
     * Check that this is a valid element of the target subgroup of the curve:
     * - Use {@link assertOnCurve()} to check that the point lies on the curve
     * - If the curve has cofactor unequal to 1, use {@link assertInSubgroup()}.
     *
     * **Exception**: If {@link createForeignCurve} is called with `{ unsafe: true }`,
     * we don't check that curve elements are valid by default.
     */
    static check(g: Affine) {
      super.check(g); // check that x, y are valid field elements
      ForeignCurve.assertOnCurve(g);
      if (ConstantCurve.hasCofactor) ForeignCurve.assertInSubgroup(g);
    }

    static BaseField = BaseField;
    static Scalar = ScalarField;
    static Bigint = ConstantCurve;
  }

  return ForeignCurve;
}

function toPoint({ x, y }: Affine): Point {
  return { x: x.value, y: y.value };
}
