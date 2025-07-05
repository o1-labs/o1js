export { assert, assertPromise, assertDefined };
function assert(stmt, message) {
    if (!stmt) {
        throw Error(message ?? 'Assertion failed');
    }
}
function assertPromise(value, message) {
    assert(value instanceof Promise, message ?? 'Expected a promise');
    return value;
}
/**
 * Assert that the value is not undefined, return the value.
 */
function assertDefined(value, message = 'Input value is undefined.') {
    if (value === undefined)
        throw Error(message);
    return value;
}
