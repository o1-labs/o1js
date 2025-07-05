function hasCommonProperties(data) {
    return (data.hasOwnProperty('to') &&
        data.hasOwnProperty('from') &&
        data.hasOwnProperty('fee') &&
        data.hasOwnProperty('nonce'));
}
export function isZkappCommand(p) {
    return p.hasOwnProperty('zkappCommand') && p.hasOwnProperty('feePayer');
}
export function isPayment(p) {
    return hasCommonProperties(p) && p.hasOwnProperty('amount');
}
export function isStakeDelegation(p) {
    return hasCommonProperties(p) && !p.hasOwnProperty('amount');
}
function isLegacySignature(s) {
    return typeof s === 'object' && 'field' in s && 'scalar' in s;
}
export function isSignedZkappCommand(p) {
    return (p.data.hasOwnProperty('zkappCommand') &&
        p.data.hasOwnProperty('feePayer') &&
        typeof p.signature === 'string');
}
export function isSignedPayment(p) {
    return (hasCommonProperties(p.data) && isLegacySignature(p.signature) && p.data.hasOwnProperty('amount'));
}
export function isSignedDelegation(p) {
    return (hasCommonProperties(p.data) &&
        isLegacySignature(p.signature) &&
        !p.data.hasOwnProperty('amount'));
}
export function isSignedString(p) {
    return typeof p.data === 'string' && isLegacySignature(p.signature);
}
