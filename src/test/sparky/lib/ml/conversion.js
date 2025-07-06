"use strict";
/**
 * this file contains conversion functions between JS and OCaml
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MlHashInput = exports.Ml = void 0;
const wrapped_js_1 = require("../provable/wrapped.js");
const scalar_js_1 = require("../provable/scalar.js");
const signature_js_1 = require("../provable/crypto/signature.js");
const base_js_1 = require("./base.js");
const fields_js_1 = require("./fields.js");
const Ml = {
    constFromField,
    constToField,
    varFromField,
    varToField,
    fromScalar,
    toScalar,
    fromPrivateKey,
    toPrivateKey,
    fromPublicKey,
    toPublicKey,
    fromPublicKeyVar,
    toPublicKeyVar,
};
exports.Ml = Ml;
const MlHashInput = {
    to({ fields = [], packed = [] }) {
        return [
            0,
            fields_js_1.MlFieldConstArray.to(fields),
            base_js_1.MlArray.to(packed.map(([field, size]) => [0, Ml.constFromField(field), size])),
        ];
    },
    from([, fields, packed]) {
        return {
            fields: fields_js_1.MlFieldConstArray.from(fields),
            packed: base_js_1.MlArray.from(packed).map(([, field, size]) => [(0, wrapped_js_1.Field)(field), size]),
        };
    },
};
exports.MlHashInput = MlHashInput;
function constFromField(x) {
    return x.toConstant().value[1];
}
function constToField(x) {
    return (0, wrapped_js_1.Field)(x);
}
function varFromField(x) {
    return x.value;
}
function varToField(x) {
    return (0, wrapped_js_1.Field)(x);
}
function fromScalar(s) {
    return [0, s.toBigInt()];
}
function toScalar(s) {
    return scalar_js_1.Scalar.from(s[1]);
}
function fromPrivateKey(sk) {
    return fromScalar(sk.s);
}
function toPrivateKey(sk) {
    return new signature_js_1.PrivateKey(scalar_js_1.Scalar.from(sk[1]));
}
function fromPublicKey(pk) {
    return (0, base_js_1.MlPair)(pk.x.toConstant().value[1], (0, base_js_1.MlBool)(pk.isOdd.toBoolean()));
}
function toPublicKey([, x, isOdd]) {
    return signature_js_1.PublicKey.from({
        x: (0, wrapped_js_1.Field)(x),
        isOdd: (0, wrapped_js_1.Bool)(base_js_1.MlBool.from(isOdd)),
    });
}
function fromPublicKeyVar(pk) {
    return (0, base_js_1.MlPair)(pk.x.value, pk.isOdd.toField().value);
}
function toPublicKeyVar([, x, isOdd]) {
    return signature_js_1.PublicKey.from({ x: (0, wrapped_js_1.Field)(x), isOdd: (0, wrapped_js_1.Bool)(isOdd) });
}
