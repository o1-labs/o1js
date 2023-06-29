import { Snarky } from '../snarky.js';
import {
  ForeignField,
  ForeignFieldConst,
  ForeignFieldVar,
  createForeignField,
} from './foreign-field.js';
import { MlBigint } from './ml/base.js';

// external API
export { createForeignCurve };

// internal API
export {
  ForeignCurveVar,
  ForeignCurveConst,
  MlCurveParams,
  MlCurveParamsWithIa,
};

type MlAffine<F> = [_: 0, x: F, y: F];
type ForeignCurveVar = MlAffine<ForeignFieldVar>;
type ForeignCurveConst = MlAffine<ForeignFieldConst>;

type AffineBigint = { x: bigint; y: bigint };
type Affine = { x: ForeignField; y: ForeignField };

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

  class ForeignCurve implements Affine {
    x: BaseField;
    y: BaseField;

    constructor(
      g:
        | { x: BaseField | bigint | number; y: BaseField | bigint | number }
        | ForeignCurveVar
    ) {
      // ForeignCurveVar
      if (Array.isArray(g)) {
        let [, x, y] = g;
        this.x = new BaseField(x);
        this.y = new BaseField(y);
        return;
      }
      let { x, y } = g;
      this.x = BaseField.from(x);
      this.y = BaseField.from(y);
    }

    static initialize() {
      curveMlVar = Snarky.foreignCurve.paramsToVars(curveMl);
    }

    add(h: ForeignCurve) {
      let curve = getParams('add');
      let p = Snarky.foreignCurve.add(toMl(this), toMl(h), curve);
      return new ForeignCurve(p);
    }

    static BaseField = BaseField;
    static ScalarField = ScalarField;
  }

  return ForeignCurve;
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
  _: 0,
  modulus: MlBigint,
  order: MlBigint,
  a: MlBigint,
  b: MlBigint,
  gen: MlBigintPoint,
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
