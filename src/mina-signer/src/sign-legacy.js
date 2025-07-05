import { UInt32, UInt64 } from './field-bigint.js';
import { PrivateKey, PublicKey } from './curve-bigint.js';
import { HashInputLegacy } from './poseidon-bigint.js';
import { Memo } from './memo.js';
import { Signature, signLegacy, verifyLegacy } from './signature.js';
import { bytesToBits, stringToBytes } from '../../bindings/lib/binable.js';
export { signPayment, signStakeDelegation, signString, verifyPayment, verifyStakeDelegation, verifyStringSignature, paymentFromJson, delegationFromJson, commonFromJson, };
function signPayment(payment, privateKeyBase58, networkId) {
    let command = paymentFromJson(payment);
    return signUserCommand(command, privateKeyBase58, networkId);
}
function signStakeDelegation(delegation, privateKeyBase58, networkId) {
    let command = delegationFromJson(delegation);
    return signUserCommand(command, privateKeyBase58, networkId);
}
function signUserCommand(command, privateKeyBase58, networkId) {
    let input = toInputLegacy(command);
    let privateKey = PrivateKey.fromBase58(privateKeyBase58);
    let signature = signLegacy(input, privateKey, networkId);
    return Signature.toJSON(signature);
}
function verifyPayment(payment, signatureJson, publicKeyBase58, networkId) {
    try {
        return verifyUserCommand(paymentFromJson(payment), signatureJson, publicKeyBase58, networkId);
    }
    catch {
        return false;
    }
}
function verifyStakeDelegation(delegation, signatureJson, publicKeyBase58, networkId) {
    try {
        return verifyUserCommand(delegationFromJson(delegation), signatureJson, publicKeyBase58, networkId);
    }
    catch {
        return false;
    }
}
function verifyUserCommand(command, signatureJson, publicKeyBase58, networkId) {
    let input = toInputLegacy(command);
    let signature = Signature.fromJSON(signatureJson);
    let publicKey = PublicKey.fromBase58(publicKeyBase58);
    return verifyLegacy(signature, input, publicKey, networkId);
}
function toInputLegacy({ common, body }) {
    return HashInputLegacy.append(commonToInputLegacy(common), bodyToInputLegacy(body));
}
// Mina_base.Transaction_union_payload.Body.to_input_legacy
function bodyToInputLegacy({ tag, source, receiver, amount }) {
    return [
        tagToInput(tag),
        PublicKey.toInputLegacy(source),
        PublicKey.toInputLegacy(receiver),
        HashInputLegacy.bits(legacyTokenId),
        HashInputLegacy.bits(UInt64.toBits(amount)),
        HashInputLegacy.bits([false]), // token_locked
    ].reduce(HashInputLegacy.append);
}
// Mina_base.Signed_command_payload.Common.to_input_legacy
function commonToInputLegacy({ fee, feePayer, nonce, validUntil, memo }) {
    return [
        HashInputLegacy.bits(UInt64.toBits(fee)),
        HashInputLegacy.bits(legacyTokenId),
        PublicKey.toInputLegacy(feePayer),
        HashInputLegacy.bits(UInt32.toBits(nonce)),
        HashInputLegacy.bits(UInt32.toBits(validUntil.value)),
        HashInputLegacy.bits(Memo.toBits(memo)),
    ].reduce(HashInputLegacy.append);
}
function tagToInput(tag) {
    let int = { Payment: 0, StakeDelegation: 1 }[tag];
    let bits = [int & 4, int & 2, int & 1].map(Boolean);
    return HashInputLegacy.bits(bits);
}
const legacyTokenId = [true, ...Array(63).fill(false)];
function paymentFromJson({ common, body: { receiver, amount } }) {
    return {
        common: commonFromJson(common),
        body: {
            tag: 'Payment',
            source: PublicKey.fromJSON(common.feePayer),
            receiver: PublicKey.fromJSON(receiver),
            amount: UInt64.fromJSON(amount),
        },
    };
}
function delegationFromJson({ common, body: { newDelegate } }) {
    return {
        common: commonFromJson(common),
        body: {
            tag: 'StakeDelegation',
            source: PublicKey.fromJSON(common.feePayer),
            receiver: PublicKey.fromJSON(newDelegate),
            amount: UInt64(0),
        },
    };
}
function commonFromJson(c) {
    return {
        fee: UInt64.fromJSON(c.fee),
        feePayer: PublicKey.fromJSON(c.feePayer),
        nonce: UInt32.fromJSON(c.nonce),
        validUntil: { type: 'SinceGenesis', value: UInt32.fromJSON(c.validUntil) },
        // TODO: this might need to be fromBase58
        memo: Memo.fromString(c.memo),
    };
}
function signString(string, privateKeyBase58, networkId) {
    let input = stringToInput(string);
    let privateKey = PrivateKey.fromBase58(privateKeyBase58);
    let signature = signLegacy(input, privateKey, networkId);
    return Signature.toJSON(signature);
}
function verifyStringSignature(string, signatureJson, publicKeyBase58, networkId) {
    try {
        let input = stringToInput(string);
        let signature = Signature.fromJSON(signatureJson);
        let publicKey = PublicKey.fromBase58(publicKeyBase58);
        return verifyLegacy(signature, input, publicKey, networkId);
    }
    catch {
        return false;
    }
}
function stringToInput(string) {
    let bits = stringToBytes(string)
        .map((byte) => bytesToBits([byte]).reverse())
        .flat();
    return HashInputLegacy.bits(bits);
}
