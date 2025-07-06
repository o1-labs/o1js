"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSignedString = exports.isSignedDelegation = exports.isSignedPayment = exports.isSignedZkappCommand = exports.isStakeDelegation = exports.isPayment = exports.isZkappCommand = void 0;
function hasCommonProperties(data) {
    return (data.hasOwnProperty('to') &&
        data.hasOwnProperty('from') &&
        data.hasOwnProperty('fee') &&
        data.hasOwnProperty('nonce'));
}
function isZkappCommand(p) {
    return p.hasOwnProperty('zkappCommand') && p.hasOwnProperty('feePayer');
}
exports.isZkappCommand = isZkappCommand;
function isPayment(p) {
    return hasCommonProperties(p) && p.hasOwnProperty('amount');
}
exports.isPayment = isPayment;
function isStakeDelegation(p) {
    return hasCommonProperties(p) && !p.hasOwnProperty('amount');
}
exports.isStakeDelegation = isStakeDelegation;
function isLegacySignature(s) {
    return typeof s === 'object' && 'field' in s && 'scalar' in s;
}
function isSignedZkappCommand(p) {
    return (p.data.hasOwnProperty('zkappCommand') &&
        p.data.hasOwnProperty('feePayer') &&
        typeof p.signature === 'string');
}
exports.isSignedZkappCommand = isSignedZkappCommand;
function isSignedPayment(p) {
    return (hasCommonProperties(p.data) && isLegacySignature(p.signature) && p.data.hasOwnProperty('amount'));
}
exports.isSignedPayment = isSignedPayment;
function isSignedDelegation(p) {
    return (hasCommonProperties(p.data) &&
        isLegacySignature(p.signature) &&
        !p.data.hasOwnProperty('amount'));
}
exports.isSignedDelegation = isSignedDelegation;
function isSignedString(p) {
    return typeof p.data === 'string' && isLegacySignature(p.signature);
}
exports.isSignedString = isSignedString;
