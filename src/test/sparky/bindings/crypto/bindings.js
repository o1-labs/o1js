"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRustConversion = void 0;
/**
 * This file contains bindings for JSOO written in TS and integrated with our normal code base.
 * It is exposed to JSOO by populating a global variable with an object.
 * It gets imported as the first thing in ../../bindings.js so that the global variable is ready by the time JSOO code gets executed.
 */
const constants_js_1 = require("../crypto/constants.js");
const bigint256_js_1 = require("./bindings/bigint256.js");
const curve_js_1 = require("./bindings/curve.js");
const field_js_1 = require("./bindings/field.js");
const vector_js_1 = require("./bindings/vector.js");
const conversion_base_js_1 = require("./bindings/conversion-base.js");
const conversion_proof_js_1 = require("./bindings/conversion-proof.js");
const conversion_core_js_1 = require("./bindings/conversion-core.js");
const conversion_verifier_index_js_1 = require("./bindings/conversion-verifier-index.js");
const conversion_oracles_js_1 = require("./bindings/conversion-oracles.js");
const env_js_1 = require("./bindings/env.js");
const srs_js_1 = require("./bindings/srs.js");
const tsBindings = {
    jsEnvironment: env_js_1.jsEnvironment,
    prefixHashes: constants_js_1.prefixHashes,
    prefixHashesLegacy: constants_js_1.prefixHashesLegacy,
    ...bigint256_js_1.Bigint256Bindings,
    ...field_js_1.FpBindings,
    ...field_js_1.FqBindings,
    ...curve_js_1.VestaBindings,
    ...curve_js_1.PallasBindings,
    ...vector_js_1.FpVectorBindings,
    ...vector_js_1.FqVectorBindings,
    rustConversion: createRustConversion,
    srs: (wasm) => (0, srs_js_1.srs)(wasm, getRustConversion(wasm)),
};
// this is put in a global variable so that mina/src/lib/crypto/kimchi_bindings/js/bindings.js finds it
globalThis.__snarkyTsBindings = tsBindings;
function createRustConversion(wasm) {
    let core = (0, conversion_core_js_1.conversionCore)(wasm);
    let verifierIndex = (0, conversion_verifier_index_js_1.verifierIndexConversion)(wasm, core);
    let oracles = (0, conversion_oracles_js_1.oraclesConversion)(wasm);
    let proof = (0, conversion_proof_js_1.proofConversion)(wasm, core);
    return {
        fp: { ...core.fp, ...verifierIndex.fp, ...oracles.fp, ...proof.fp },
        fq: { ...core.fq, ...verifierIndex.fq, ...oracles.fq, ...proof.fq },
        fieldsToRustFlat: conversion_base_js_1.fieldsToRustFlat,
        fieldsFromRustFlat: conversion_base_js_1.fieldsFromRustFlat,
        wireToRust: core.wireToRust,
        mapMlArrayToRustVector: core.mapMlArrayToRustVector,
    };
}
let rustConversion;
function getRustConversion(wasm) {
    return rustConversion ?? (rustConversion = createRustConversion(wasm));
}
exports.getRustConversion = getRustConversion;
