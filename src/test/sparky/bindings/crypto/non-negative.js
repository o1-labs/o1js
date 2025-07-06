"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asPositiveInteger = exports.asNonNegativeInteger = exports.asInteger = exports.assertPositiveInteger = exports.assertNonNegativeInteger = exports.assertInteger = exports.isPositiveInteger = exports.isNonNegativeInteger = exports.isInteger = void 0;
function asInteger(n) {
    return n;
}
exports.asInteger = asInteger;
function asNonNegativeInteger(n) {
    return n;
}
exports.asNonNegativeInteger = asNonNegativeInteger;
function asPositiveInteger(n) {
    return n;
}
exports.asPositiveInteger = asPositiveInteger;
function isInteger(n) {
    return Number.isInteger(n);
}
exports.isInteger = isInteger;
function isNonNegativeInteger(n) {
    return Number.isInteger(n) && n >= 0;
}
exports.isNonNegativeInteger = isNonNegativeInteger;
function isPositiveInteger(n) {
    return Number.isInteger(n) && n > 0;
}
exports.isPositiveInteger = isPositiveInteger;
function assertInteger(n, message) {
    if (!Number.isInteger(n))
        throw Error(message);
}
exports.assertInteger = assertInteger;
function assertNonNegativeInteger(n, message) {
    if (!Number.isInteger(n) || n < 0)
        throw Error(message);
}
exports.assertNonNegativeInteger = assertNonNegativeInteger;
function assertPositiveInteger(n, message) {
    if (!Number.isInteger(n) || n <= 0)
        throw Error(message);
}
exports.assertPositiveInteger = assertPositiveInteger;
