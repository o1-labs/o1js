import { createCurveAffine } from '../bindings/crypto/elliptic_curve.js';
import { Snarky } from '../snarky.js';
import { Bool } from './bool.js';
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

function createForeignCurve(curve: CurveParams) {
  const curveParamsMl = Snarky.foreignCurve.create(MlCurveParams(curve));
  const curveName = curve.name;

  class BaseField extends createForeignField(curve.modulus) {}
  class ScalarField extends createForeignField(curve.order) {}

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

  function toConstant(x: ForeignCurve) {
    return { ...x.toBigint(), infinity: false };
  }

  class ForeignCurve extends Affine {
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
    }

    static from(
      g:
        | ForeignCurve
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
    ) {
      if (g instanceof ForeignCurve) return g;
      return new ForeignCurve(g);
    }

    static #curveParamsMlVar: unknown | undefined;

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

    isConstant() {
      return isConstant(ForeignCurve, this);
    }

    toBigint() {
      return { x: this.x.toBigInt(), y: this.y.toBigInt() };
    }

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

    double() {
      if (this.isConstant()) {
        let z = ConstantCurve.double(toConstant(this));
        return new ForeignCurve(z);
      }
      let curve = ForeignCurve._getParams(`${this.constructor.name}.double`);
      let p = Snarky.foreignCurve.double(toMl(this), curve);
      return new ForeignCurve(p);
    }

    negate() {
      if (this.isConstant()) {
        let z = ConstantCurve.negate(toConstant(this));
        return new ForeignCurve(z);
      }
      let curve = ForeignCurve._getParams(`${this.constructor.name}.negate`);
      let p = Snarky.foreignCurve.negate(toMl(this), curve);
      return new ForeignCurve(p);
    }

    assertOnCurve() {
      if (this.isConstant()) {
        let isOnCurve = ConstantCurve.isOnCurve(toConstant(this));
        if (!isOnCurve)
          throw Error(
            `${this.constructor.name}.assertOnCurve(): ${JSON.stringify(
              this
            )} is not on the curve.`
          );
        return;
      }
      let curve = ForeignCurve._getParams(
        `${this.constructor.name}.assertOnCurve`
      );
      Snarky.foreignCurve.assertOnCurve(toMl(this), curve);
    }

    // TODO wrap this in a `Scalar` type which is a Bool array under the hood?
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

    assertInSubgroup() {
      if (this.isConstant()) {
        let isInGroup = ConstantCurve.isInSubgroup(toConstant(this));
        if (!isInGroup)
          throw Error(
            `${this.constructor.name}.assertInSubgroup(): ${JSON.stringify(
              this
            )} is not in the target subgroup.`
          );
        return;
      }
      let curve = ForeignCurve._getParams(`${curveName}.assertInSubgroup`);
      Snarky.foreignCurve.checkSubgroup(toMl(this), curve);
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
