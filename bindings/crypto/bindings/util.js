"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapTuple = exports.withPrefix = void 0;
function withPrefix(prefix, obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => {
        return [`${prefix}_${k}`, v];
    }));
}
exports.withPrefix = withPrefix;
function mapTuple(tuple, f) {
    return tuple.map(f);
}
exports.mapTuple = mapTuple;
