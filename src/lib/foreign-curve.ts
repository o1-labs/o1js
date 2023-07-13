import { createCurveAffine } from '../bindings/crypto/elliptic_curve.js';
import { Snarky } from '../snarky.js';
import { Bool } from './bool.js';
import type { Group } from './group.js';
import { Struct, isConstant } from './circuit_value.js';
import {
  ForeignField,
  ForeignFieldConst,
  ForeignFieldVar,
  createForeignField,
} from './foreign-field.js';
import { MlBigint } from './ml/base.js';
import { MlBoolArray } from './ml/fields.js';
import { inCheckedComputation } from './provable-context.js';

// external API
export { createForeignCurve, CurveParams };

// internal API
export {
  ForeignCurveVar,
  ForeignCurveConst,
  MlCurveParams,
  MlCurveParamsWithIa,
  ForeignCurveClass,
  toMl as affineToMl,
};

type MlAffine<F> = [_: 0, x: F, y: F];
type ForeignCurveVar = MlAffine<ForeignFieldVar>;
type ForeignCurveConst = MlAffine<ForeignFieldConst>;

type AffineBigint = { x: bigint; y: bigint };
type Affine = { x: ForeignField; y: ForeignField };

function toMl({ x, y }: Affine): ForeignCurveVar {
  return [0, x.value, y.value];
}

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
 * @param curve parameters for the elliptic curve you are instantiating
 * @param options
 * - `unsafe: boolean` determines whether `ForeignField` elements are constrained to be valid on creation.
 */
function createForeignCurve(curve: CurveParams, { unsafe = false } = {}) {
  const curveParamsMl = Snarky.foreignCurve.create(MlCurveParams(curve));
  const curveName = curve.name;
  const hasCofactor = curve.cofactor !== undefined && curve.cofactor !== 1n;

  class BaseField extends createForeignField(curve.modulus, { unsafe }) {}
  class ScalarField extends createForeignField(curve.order, { unsafe }) {}

  // this is necessary to simplify the type of ForeignCurve, to avoid
  // TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize.
  const Affine: Struct<Affine> = Struct({ x: BaseField, y: BaseField });

  const ConstantCurve = createCurveAffine({
    p: curve.modulus,
    order: curve.order,
    a: curve.a,
    b: curve.b,
    generator: curve.gen,
  });

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
    constructor(
      g:
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
        | ForeignCurveVar
    ) {
      let x_: BaseField;
      let y_: BaseField;
      // ForeignCurveVar
      if (Array.isArray(g)) {
        let [, x, y] = g;
        x_ = new BaseField(x);
        y_ = new BaseField(y);
      } else {
        let { x, y } = g;
        x_ = BaseField.from(x);
        y_ = BaseField.from(y);
      }
      super({ x: x_, y: y_ });
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

    static #curveParamsMlVar: unknown | undefined;

    /**
     * Initialize usage of the curve. This function has to be called oncel per provable method to use the curve.
     */
    static initialize() {
      if (!inCheckedComputation()) return;
      ForeignCurve.#curveParamsMlVar =
        Snarky.foreignCurve.paramsToVars(curveParamsMl);
    }

    static _getParams(name: string): unknown {
      if (ForeignCurve.#curveParamsMlVar === undefined) {
        throw Error(
          `${name}(): You must call ${this.name}.initialize() once per provable method to use ${curveName}.`
        );
      }
      return ForeignCurve.#curveParamsMlVar;
    }

    static generator = new ForeignCurve(curve.gen);

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
      let curve = ForeignCurve._getParams(`${this.constructor.name}.add`);
      let p = Snarky.foreignCurve.add(toMl(this), toMl(h_), curve);
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
      let curve = ForeignCurve._getParams(`${this.constructor.name}.double`);
      let p = Snarky.foreignCurve.double(toMl(this), curve);
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
      let curve = ForeignCurve._getParams(`${this.constructor.name}.negate`);
      let p = Snarky.foreignCurve.negate(toMl(this), curve);
      return new ForeignCurve(p);
    }

    static #assertOnCurve(g: Affine) {
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
      let curve = ForeignCurve._getParams(`${this.name}.assertOnCurve`);
      Snarky.foreignCurve.assertOnCurve(toMl(g), curve);
    }

    /**
     * Assert that this point lies on the elliptic curve, which means it satisfies the equation
     * y^2 = x^3 + ax + b
     */
    assertOnCurve() {
      ForeignCurve.#assertOnCurve(this);
    }

    // TODO wrap this in a `Scalar` type which is a Bool array under the hood?
    /**
     * Elliptic curve scalar multiplication, where the scalar is represented as a little-endian
     * array of bits, and each bit is represented by a {@link Bool}.
     */
    scale(scalar: Bool[]) {
      if (this.isConstant() && scalar.every((b) => b.isConstant())) {
        let scalar0 = scalar.map((b) => b.toBoolean());
        let z = ConstantCurve.scale(toConstant(this), scalar0);
        return new ForeignCurve(z);
      }
      let curve = ForeignCurve._getParams(`${this.constructor.name}.scale`);
      let p = Snarky.foreignCurve.scale(
        toMl(this),
        MlBoolArray.to(scalar),
        curve
      );
      return new ForeignCurve(p);
    }

    static #assertInSubgroup(g: Affine) {
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
      let curve_ = ForeignCurve._getParams(`${curveName}.assertInSubgroup`);
      Snarky.foreignCurve.checkSubgroup(toMl(g), curve_);
    }

    /**
     * Assert than this point lies in the subgroup defined by order*P = 0,
     * by performing the scalar multiplication.
     */
    assertInSubgroup() {
      ForeignCurve.#assertInSubgroup(this);
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
      if (unsafe) return;
      ForeignCurve.#assertOnCurve(g);
      if (hasCofactor) ForeignCurve.#assertInSubgroup(g);
    }

    static BaseField = BaseField;
    static Scalar = ScalarField;
  }

  return ForeignCurve;
}

/**
 * Parameters defining an elliptic curve in short Weierstraß form
 * y^2 = x^3 + ax + b
 */
type CurveParams = {
  /**
   * Human-friendly name for the curve
   */
  name: string;
  /**
   * Base field modulus
   */
  modulus: bigint;
  /**
   * Scalar field modulus = group order
   */
  order: bigint;
  /**
   * Cofactor = size of EC / order
   *
   * This can be left undefined if the cofactor is 1.
   */
  cofactor?: bigint;
  /**
   * The `a` parameter in the curve equation y^2 = x^3 + ax + b
   */
  a: bigint;
  /**
   * The `b` parameter in the curve equation y^2 = x^3 + ax + b
   */
  b: bigint;
  /**
   * Generator point
   */
  gen: AffineBigint;
};

type MlBigintPoint = MlAffine<MlBigint>;

function MlBigintPoint({ x, y }: AffineBigint): MlBigintPoint {
  return [0, MlBigint(x), MlBigint(y)];
}

type MlCurveParams = [
  _: 0,
  modulus: MlBigint,
  order: MlBigint,
  a: MlBigint,
  b: MlBigint,
  gen: MlBigintPoint
];
type MlCurveParamsWithIa = [
  ...params: MlCurveParams,
  ia: [_: 0, acc: MlBigintPoint, neg_acc: MlBigintPoint]
];

function MlCurveParams(params: CurveParams): MlCurveParams {
  let { modulus, order, a, b, gen } = params;
  return [
    0,
    MlBigint(modulus),
    MlBigint(order),
    MlBigint(a),
    MlBigint(b),
    MlBigintPoint(gen),
  ];
}
