"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDefined = exports.assertPromise = exports.assert = void 0;
function assert(stmt, message) {
    if (!stmt) {
        throw Error(message ?? 'Assertion failed');
    }
}
exports.assert = assert;
function assertPromise(value, message) {
    assert(value instanceof Promise, message ?? 'Expected a promise');
    return value;
}
exports.assertPromise = assertPromise;
/**
 * Assert that the value is not undefined, return the value.
 */
function assertDefined(value, message = 'Input value is undefined.') {
    if (value === undefined)
        throw Error(message);
    return value;
}
exports.assertDefined = assertDefined;
