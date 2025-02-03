import {
  CurveParams as CurveParams_,
  TwistedCurveParams as TwistedCurveParams_,
} from '../../../bindings/crypto/elliptic-curve-examples.js';
import {
  CurveAffine,
  CurveTwisted,
  createCurveAffine,
  createCurveTwisted,
} from '../../../bindings/crypto/elliptic-curve.js';

// crypto namespace
const Crypto = {
  /**
   * Create elliptic curve arithmetic methods.
   */
  createCurve(params: Crypto.CurveParams): Crypto.Curve {
    return createCurveAffine(params);
  },
  /**
   * Create twisted elliptic curve arithmetic methods.
   */
  createCurveTwisted(params: Crypto.TwistedCurveParams): Crypto.TwistedCurve {
    return createCurveTwisted(params);
  },
  /**
   * Parameters defining an elliptic curve in short Weierstraß form
   * y^2 = x^3 + ax + b
   */
  CurveParams: CurveParams_,
  /**
   * Parameters defining an elliptic curve in twisted Edwards form
   * a * x^2 + y^2 = 1 + d * x^2 * y^2
   */
  TwistedCurveParams: TwistedCurveParams_,
};

namespace Crypto {
  /**
   * Parameters defining an elliptic curve in short Weierstraß form
   * y^2 = x^3 + ax + b
   */
  export type CurveParams = CurveParams_;

  /**
   * Parameters defining an elliptic curve in twisted Edwards form
   * a * x^2 + y^2 = 1 + d * x^2 * y^2
   */
  export type TwistedCurveParams = TwistedCurveParams_;

  export type Curve = CurveAffine;

  export type TwistedCurve = CurveTwisted;
}
export { Crypto };
