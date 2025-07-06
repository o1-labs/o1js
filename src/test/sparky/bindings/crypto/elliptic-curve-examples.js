"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurveParams = void 0;
const elliptic_curve_js_1 = require("./elliptic-curve.js");
const finite_field_examples_js_1 = require("./finite-field-examples.js");
const secp256k1Params = {
    name: 'secp256k1',
    modulus: finite_field_examples_js_1.exampleFields.secp256k1.modulus,
    order: finite_field_examples_js_1.exampleFields.secq256k1.modulus,
    a: 0n,
    b: 7n,
    generator: {
        x: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
        y: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
    },
};
const secp256r1Params = {
    name: 'secp256r1',
    modulus: finite_field_examples_js_1.exampleFields.secp256r1.modulus,
    order: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,
    a: 0xffffffff00000001000000000000000000000000fffffffffffffffffffffffcn,
    b: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn,
    generator: {
        x: 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n,
        y: 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n,
    },
};
const pallasParams = {
    name: 'Pallas',
    modulus: elliptic_curve_js_1.Pallas.modulus,
    order: elliptic_curve_js_1.Pallas.order,
    a: elliptic_curve_js_1.Pallas.a,
    b: elliptic_curve_js_1.Pallas.b,
    generator: elliptic_curve_js_1.Pallas.one,
    endoBase: elliptic_curve_js_1.Pallas.endoBase,
    endoScalar: elliptic_curve_js_1.Pallas.endoScalar,
};
const vestaParams = {
    name: 'Vesta',
    modulus: elliptic_curve_js_1.Vesta.modulus,
    order: elliptic_curve_js_1.Vesta.order,
    a: elliptic_curve_js_1.Vesta.a,
    b: elliptic_curve_js_1.Vesta.b,
    generator: elliptic_curve_js_1.Vesta.one,
    endoBase: elliptic_curve_js_1.Vesta.endoBase,
    endoScalar: elliptic_curve_js_1.Vesta.endoScalar,
};
const CurveParams = {
    Secp256k1: secp256k1Params,
    Secp256r1: secp256r1Params,
    Pallas: pallasParams,
    Vesta: vestaParams,
};
exports.CurveParams = CurveParams;
