export { isInteger, isNonNegativeInteger, isPositiveInteger, assertInteger, assertNonNegativeInteger, assertPositiveInteger, asInteger, asNonNegativeInteger, asPositiveInteger, };
function asInteger(n) {
    return n;
}
function asNonNegativeInteger(n) {
    return n;
}
function asPositiveInteger(n) {
    return n;
}
function isInteger(n) {
    return Number.isInteger(n);
}
function isNonNegativeInteger(n) {
    return Number.isInteger(n) && n >= 0;
}
function isPositiveInteger(n) {
    return Number.isInteger(n) && n > 0;
}
function assertInteger(n, message) {
    if (!Number.isInteger(n))
        throw Error(message);
}
function assertNonNegativeInteger(n, message) {
    if (!Number.isInteger(n) || n < 0)
        throw Error(message);
}
function assertPositiveInteger(n, message) {
    if (!Number.isInteger(n) || n <= 0)
        throw Error(message);
}
