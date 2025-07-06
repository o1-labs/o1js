"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crypto = void 0;
const elliptic_curve_examples_js_1 = require("../../../bindings/crypto/elliptic-curve-examples.js");
const elliptic_curve_js_1 = require("../../../bindings/crypto/elliptic-curve.js");
// crypto namespace
const Crypto = {
    /**
     * Create elliptic curve arithmetic methods.
     */
    createCurve(params) {
        return (0, elliptic_curve_js_1.createCurveAffine)(params);
    },
    /**
     * Parameters defining an elliptic curve in short Weierstraß form
     * y^2 = x^3 + ax + b
     */
    CurveParams: elliptic_curve_examples_js_1.CurveParams,
};
exports.Crypto = Crypto;
