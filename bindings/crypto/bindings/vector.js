"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FqVectorBindings = exports.FpVectorBindings = void 0;
const util_js_1 = require("./util.js");
const FieldVectorBindings = {
    create() {
        // OCaml tag for arrays, so that we can use the same utility fns on both
        return [0];
    },
    length(v) {
        return v.length - 1;
    },
    emplace_back(v, x) {
        v.push(x);
    },
    get(v, i) {
        let value = v[i + 1];
        if (value === undefined) {
            throw Error(`FieldVector.get(): Index out of bounds, got ${i}/${v.length - 1}`);
        }
        // copying to a new array to break mutable reference
        return [...value];
    },
    set(v, i, x) {
        v[i + 1] = x;
    },
};
const FpVectorBindings = (0, util_js_1.withPrefix)('caml_fp_vector', FieldVectorBindings);
exports.FpVectorBindings = FpVectorBindings;
const FqVectorBindings = (0, util_js_1.withPrefix)('caml_fq_vector', FieldVectorBindings);
exports.FqVectorBindings = FqVectorBindings;
