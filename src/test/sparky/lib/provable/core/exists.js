"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.existsOne = exports.existsAsync = exports.exists = exports.createVarField = void 0;
const bindings_js_1 = require("../../../bindings.js");
const fieldvar_js_1 = require("./fieldvar.js");
const base_js_1 = require("../../ml/base.js");
const field_constructor_js_1 = require("./field-constructor.js");
const types_js_1 = require("../../util/types.js");
/**
 * Witness `size` field element variables by passing a callback that returns `size` bigints.
 *
 * Note: this is called "exists" because in a proof, you use it like this:
 * > "I prove that there exists x, such that (some statement)"
 */
function exists(size, compute) {
    // enter prover block
    let finish = bindings_js_1.Snarky.run.enterAsProver(size);
    if (!bindings_js_1.Snarky.run.inProver()) {
        // step outside prover block and create vars: compile case
        let vars = base_js_1.MlArray.mapFrom(finish((0, base_js_1.MlOption)()), createVarField);
        return types_js_1.TupleN.fromArray(size, vars);
    }
    // run the callback to get values to witness
    let values = compute();
    if (values.length !== size)
        throw Error(`Expected witnessed values of length ${size}, got ${values.length}.`);
    // note: here, we deliberately reduce the bigint values modulo the field size
    // this makes it easier to use normal arithmetic in low-level gadgets,
    // i.e. you can just witness x - y and it will be a field subtraction
    let inputValues = base_js_1.MlArray.mapTo(values, fieldvar_js_1.FieldConst.fromBigint);
    // step outside prover block and create vars: prover case
    let fieldVars = finish((0, base_js_1.MlOption)(inputValues));
    let vars = base_js_1.MlArray.mapFrom(fieldVars, createVarField);
    return types_js_1.TupleN.fromArray(size, vars);
}
exports.exists = exists;
/**
 * Variant of {@link exists} that witnesses 1 field element.
 */
function existsOne(compute) {
    return exists(1, () => [compute()])[0];
}
exports.existsOne = existsOne;
/**
 * Async variant of {@link exists}, which allows an async callback.
 */
async function existsAsync(size, compute) {
    // enter prover block
    let finish = bindings_js_1.Snarky.run.enterAsProver(size);
    if (!bindings_js_1.Snarky.run.inProver()) {
        let vars = base_js_1.MlArray.mapFrom(finish((0, base_js_1.MlOption)()), createVarField);
        return types_js_1.TupleN.fromArray(size, vars);
    }
    // run the async callback to get values to witness
    let values = await compute();
    if (values.length !== size)
        throw Error(`Expected witnessed values of length ${size}, got ${values.length}.`);
    // note: here, we deliberately reduce the bigint values modulo the field size
    // this makes it easier to use normal arithmetic in low-level gadgets,
    // i.e. you can just witness x - y and it will be a field subtraction
    let inputValues = base_js_1.MlArray.mapTo(values, fieldvar_js_1.FieldConst.fromBigint);
    let fieldVars = finish((0, base_js_1.MlOption)(inputValues));
    let vars = base_js_1.MlArray.mapFrom(fieldVars, createVarField);
    return types_js_1.TupleN.fromArray(size, vars);
}
exports.existsAsync = existsAsync;
// helpers for varfields
function createVarField(x) {
    return (0, field_constructor_js_1.createField)(x);
}
exports.createVarField = createVarField;
