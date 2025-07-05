import { CurveParams as CurveParams_ } from '../../../bindings/crypto/elliptic-curve-examples.js';
import { createCurveAffine } from '../../../bindings/crypto/elliptic-curve.js';
// crypto namespace
const Crypto = {
    /**
     * Create elliptic curve arithmetic methods.
     */
    createCurve(params) {
        return createCurveAffine(params);
    },
    /**
     * Parameters defining an elliptic curve in short Weierstraß form
     * y^2 = x^3 + ax + b
     */
    CurveParams: CurveParams_,
};
export { Crypto };
