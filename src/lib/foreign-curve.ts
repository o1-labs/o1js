import { Snarky } from '../snarky.js';
import { Bool } from './bool.js';
import { Struct } from './circuit_value.js';
import {
  ForeignField,
  ForeignFieldConst,
  ForeignFieldVar,
  createForeignField,
} from './foreign-field.js';
import { MlBigint } from './ml/base.js';
import { MlBoolArray } from './ml/fields.js';

// external API
export { createForeignCurve, CurveParams };

// internal API
export {
  ForeignCurveVar,
  ForeignCurveConst,
  MlCurveParams,
  MlCurveParamsWithIa,
  ForeignCurveClass,
};

type MlAffine<F> = [_: 0, x: F, y: F];
type ForeignCurveVar = MlAffine<ForeignFieldVar>;
type ForeignCurveConst = MlAffine<ForeignFieldConst>;

type AffineBigint = { x: bigint; y: bigint };
type Affine = { x: ForeignField; y: ForeignField };

type ForeignCurveClass = ReturnType<typeof createForeignCurve>;

function createForeignCurve(curve: CurveParams) {
  const curveMl = Snarky.foreignCurve.create(MlCurveParams(curve));
  let curveMlVar: unknown | undefined;
  function getParams(name: string): unknown {
    if (curveMlVar === undefined) {
      throw Error(
        `ForeignCurve.${name}(): You must call ForeignCurve.initialize() once per provable method to use ForeignCurve.`
      );
    }
    return curveMlVar;
  }

  class BaseField extends createForeignField(curve.modulus) {}
  class ScalarField extends createForeignField(curve.order) {}

  function toMl({ x, y }: Affine): ForeignCurveVar {
    return [0, x.value, y.value];
  }

  // this is necessary to simplify the type of ForeignCurve, to avoid
  // TS7056: The inferred type of this node exceeds the maximum length the compiler will serialize.
  const Affine: Struct<Affine> = Struct({ x: BaseField, y: BaseField });

  return class ForeignCurve extends Affine {
    constructor(
      g:
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
        | ForeignCurveVar
    ) {
      // ForeignCurveVar
      if (Array.isArray(g)) {
        let [, x, y] = g;
        super({ x: new BaseField(x), y: new BaseField(y) });
        return;
      }
      let { x, y } = g;
      super({ x: BaseField.from(x), y: BaseField.from(y) });
    }

    static from(
      g:
        | ForeignCurve
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
    ) {
      if (g instanceof ForeignCurve) return g;
      return new ForeignCurve(g);
    }

    static initialize() {
      curveMlVar = Snarky.foreignCurve.paramsToVars(curveMl);
    }

    static generator = new ForeignCurve(curve.gen);

    add(
      h:
        | ForeignCurve
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
    ) {
      let h_ = ForeignCurve.from(h);
      let curve = getParams('add');
      let p = Snarky.foreignCurve.add(toMl(this), toMl(h_), curve);
      return new ForeignCurve(p);
    }

    double() {
      let curve = getParams('double');
      let p = Snarky.foreignCurve.double(toMl(this), curve);
      return new ForeignCurve(p);
    }

    negate() {
      let curve = getParams('negate');
      let p = Snarky.foreignCurve.negate(toMl(this), curve);
      return new ForeignCurve(p);
    }

    assertOnCurve() {
      let curve = getParams('assertOnCurve');
      Snarky.foreignCurve.assertOnCurve(toMl(this), curve);
    }

    // TODO wrap this in a `Scalar` type which is a Bool array under the hood?
    scale(scalar: Bool[]) {
      let curve = getParams('scale');
      let p = Snarky.foreignCurve.scale(
        toMl(this),
        MlBoolArray.to(scalar),
        curve
      );
      return new ForeignCurve(p);
    }

    checkSubgroup() {
      let curve = getParams('checkSubgroup');
      Snarky.foreignCurve.checkSubgroup(toMl(this), curve);
    }

    static BaseField = BaseField;
    static ScalarField = ScalarField;
  };
}

/**
 * Parameters defining an elliptic curve in short Weierstraß form
 * y^2 = x^3 + ax + b
 */
type CurveParams = {
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
