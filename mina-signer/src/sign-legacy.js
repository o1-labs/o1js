"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonFromJson = exports.delegationFromJson = exports.paymentFromJson = exports.verifyStringSignature = exports.verifyStakeDelegation = exports.verifyPayment = exports.signString = exports.signStakeDelegation = exports.signPayment = void 0;
const field_bigint_js_1 = require("./field-bigint.js");
const curve_bigint_js_1 = require("./curve-bigint.js");
const poseidon_bigint_js_1 = require("./poseidon-bigint.js");
const memo_js_1 = require("./memo.js");
const signature_js_1 = require("./signature.js");
const binable_js_1 = require("../../bindings/lib/binable.js");
function signPayment(payment, privateKeyBase58, networkId) {
    let command = paymentFromJson(payment);
    return signUserCommand(command, privateKeyBase58, networkId);
}
exports.signPayment = signPayment;
function signStakeDelegation(delegation, privateKeyBase58, networkId) {
    let command = delegationFromJson(delegation);
    return signUserCommand(command, privateKeyBase58, networkId);
}
exports.signStakeDelegation = signStakeDelegation;
function signUserCommand(command, privateKeyBase58, networkId) {
    let input = toInputLegacy(command);
    let privateKey = curve_bigint_js_1.PrivateKey.fromBase58(privateKeyBase58);
    let signature = (0, signature_js_1.signLegacy)(input, privateKey, networkId);
    return signature_js_1.Signature.toJSON(signature);
}
function verifyPayment(payment, signatureJson, publicKeyBase58, networkId) {
    try {
        return verifyUserCommand(paymentFromJson(payment), signatureJson, publicKeyBase58, networkId);
    }
    catch {
        return false;
    }
}
exports.verifyPayment = verifyPayment;
function verifyStakeDelegation(delegation, signatureJson, publicKeyBase58, networkId) {
    try {
        return verifyUserCommand(delegationFromJson(delegation), signatureJson, publicKeyBase58, networkId);
    }
    catch {
        return false;
    }
}
exports.verifyStakeDelegation = verifyStakeDelegation;
function verifyUserCommand(command, signatureJson, publicKeyBase58, networkId) {
    let input = toInputLegacy(command);
    let signature = signature_js_1.Signature.fromJSON(signatureJson);
    let publicKey = curve_bigint_js_1.PublicKey.fromBase58(publicKeyBase58);
    return (0, signature_js_1.verifyLegacy)(signature, input, publicKey, networkId);
}
function toInputLegacy({ common, body }) {
    return poseidon_bigint_js_1.HashInputLegacy.append(commonToInputLegacy(common), bodyToInputLegacy(body));
}
// Mina_base.Transaction_union_payload.Body.to_input_legacy
function bodyToInputLegacy({ tag, source, receiver, amount }) {
    return [
        tagToInput(tag),
        curve_bigint_js_1.PublicKey.toInputLegacy(source),
        curve_bigint_js_1.PublicKey.toInputLegacy(receiver),
        poseidon_bigint_js_1.HashInputLegacy.bits(legacyTokenId),
        poseidon_bigint_js_1.HashInputLegacy.bits(field_bigint_js_1.UInt64.toBits(amount)),
        poseidon_bigint_js_1.HashInputLegacy.bits([false]), // token_locked
    ].reduce(poseidon_bigint_js_1.HashInputLegacy.append);
}
// Mina_base.Signed_command_payload.Common.to_input_legacy
function commonToInputLegacy({ fee, feePayer, nonce, validUntil, memo }) {
    return [
        poseidon_bigint_js_1.HashInputLegacy.bits(field_bigint_js_1.UInt64.toBits(fee)),
        poseidon_bigint_js_1.HashInputLegacy.bits(legacyTokenId),
        curve_bigint_js_1.PublicKey.toInputLegacy(feePayer),
        poseidon_bigint_js_1.HashInputLegacy.bits(field_bigint_js_1.UInt32.toBits(nonce)),
        poseidon_bigint_js_1.HashInputLegacy.bits(field_bigint_js_1.UInt32.toBits(validUntil.value)),
        poseidon_bigint_js_1.HashInputLegacy.bits(memo_js_1.Memo.toBits(memo)),
    ].reduce(poseidon_bigint_js_1.HashInputLegacy.append);
}
function tagToInput(tag) {
    let int = { Payment: 0, StakeDelegation: 1 }[tag];
    let bits = [int & 4, int & 2, int & 1].map(Boolean);
    return poseidon_bigint_js_1.HashInputLegacy.bits(bits);
}
const legacyTokenId = [true, ...Array(63).fill(false)];
function paymentFromJson({ common, body: { receiver, amount } }) {
    return {
        common: commonFromJson(common),
        body: {
            tag: 'Payment',
            source: curve_bigint_js_1.PublicKey.fromJSON(common.feePayer),
            receiver: curve_bigint_js_1.PublicKey.fromJSON(receiver),
            amount: field_bigint_js_1.UInt64.fromJSON(amount),
        },
    };
}
exports.paymentFromJson = paymentFromJson;
function delegationFromJson({ common, body: { newDelegate } }) {
    return {
        common: commonFromJson(common),
        body: {
            tag: 'StakeDelegation',
            source: curve_bigint_js_1.PublicKey.fromJSON(common.feePayer),
            receiver: curve_bigint_js_1.PublicKey.fromJSON(newDelegate),
            amount: (0, field_bigint_js_1.UInt64)(0),
        },
    };
}
exports.delegationFromJson = delegationFromJson;
function commonFromJson(c) {
    return {
        fee: field_bigint_js_1.UInt64.fromJSON(c.fee),
        feePayer: curve_bigint_js_1.PublicKey.fromJSON(c.feePayer),
        nonce: field_bigint_js_1.UInt32.fromJSON(c.nonce),
        validUntil: { type: 'SinceGenesis', value: field_bigint_js_1.UInt32.fromJSON(c.validUntil) },
        // TODO: this might need to be fromBase58
        memo: memo_js_1.Memo.fromString(c.memo),
    };
}
exports.commonFromJson = commonFromJson;
function signString(string, privateKeyBase58, networkId) {
    let input = stringToInput(string);
    let privateKey = curve_bigint_js_1.PrivateKey.fromBase58(privateKeyBase58);
    let signature = (0, signature_js_1.signLegacy)(input, privateKey, networkId);
    return signature_js_1.Signature.toJSON(signature);
}
exports.signString = signString;
function verifyStringSignature(string, signatureJson, publicKeyBase58, networkId) {
    try {
        let input = stringToInput(string);
        let signature = signature_js_1.Signature.fromJSON(signatureJson);
        let publicKey = curve_bigint_js_1.PublicKey.fromBase58(publicKeyBase58);
        return (0, signature_js_1.verifyLegacy)(signature, input, publicKey, networkId);
    }
    catch {
        return false;
    }
}
exports.verifyStringSignature = verifyStringSignature;
function stringToInput(string) {
    let bits = (0, binable_js_1.stringToBytes)(string)
        .map((byte) => (0, binable_js_1.bytesToBits)([byte]).reverse())
        .flat();
    return poseidon_bigint_js_1.HashInputLegacy.bits(bits);
}
