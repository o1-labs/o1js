"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TupleN = exports.Tuple = void 0;
const errors_js_1 = require("./errors.js");
const Tuple = {
    map(tuple, f) {
        return tuple.map(f);
    },
};
exports.Tuple = Tuple;
const TupleN = {
    map(tuple, f) {
        return tuple.map(f);
    },
    fromArray(n, arr) {
        (0, errors_js_1.assert)(arr.length === n, `Expected array of length ${n}, got ${arr.length}`);
        return arr;
    },
    hasLength(n, tuple) {
        return tuple.length === n;
    },
};
exports.TupleN = TupleN;
