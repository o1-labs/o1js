"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rosettaCombinePayload = exports.rosettaCombineSignature = exports.verifyTransaction = exports.signTransaction = exports.rosettaTransactionToSignedCommand = exports.fieldToHex = exports.fieldFromHex = exports.signatureJsonToHex = exports.signatureToHex = exports.signatureJsonFromHex = exports.signatureFromHex = exports.publicKeyToHex = void 0;
const curve_bigint_js_1 = require("./curve-bigint.js");
const field_bigint_js_1 = require("./field-bigint.js");
const memo_js_1 = require("./memo.js");
const signature_js_1 = require("./signature.js");
const sign_legacy_js_1 = require("./sign-legacy.js");
const defaultValidUntil = '4294967295';
function publicKeyToHex(publicKey) {
    return fieldToHex(field_bigint_js_1.Field, publicKey.x, !!publicKey.isOdd);
}
exports.publicKeyToHex = publicKeyToHex;
function signatureFromHex(signatureHex) {
    let half = signatureHex.length / 2;
    let fieldHex = signatureHex.slice(0, half);
    let scalarHex = signatureHex.slice(half);
    return {
        r: fieldFromHex(field_bigint_js_1.Field, fieldHex)[0],
        s: fieldFromHex(curve_bigint_js_1.Scalar, scalarHex)[0],
    };
}
exports.signatureFromHex = signatureFromHex;
function signatureJsonFromHex(signatureHex) {
    return signature_js_1.Signature.toJSON(signatureFromHex(signatureHex));
}
exports.signatureJsonFromHex = signatureJsonFromHex;
function signatureJsonToHex(signatureJson) {
    return signatureToHex(signature_js_1.Signature.fromJSON(signatureJson));
}
exports.signatureJsonToHex = signatureJsonToHex;
function signatureToHex(signature) {
    let rHex = fieldToHex(field_bigint_js_1.Field, signature.r);
    let sHex = fieldToHex(curve_bigint_js_1.Scalar, signature.s);
    return `${rHex}${sHex}`;
}
exports.signatureToHex = signatureToHex;
function fieldToHex(binable, x, paddingBit = false) {
    let bytes = binable.toBytes(x);
    // set highest bit (which is empty)
    bytes[bytes.length - 1] |= Number(paddingBit) << 7;
    // map each byte to a 0-padded hex string of length 2
    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
exports.fieldToHex = fieldToHex;
function fieldFromHex(binable, hex) {
    let bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        let byte = parseInt(hex[i] + hex[i + 1], 16);
        bytes.push(byte);
    }
    // read highest bit
    let paddingBit = !!(bytes[bytes.length - 1] >> 7);
    bytes[bytes.length - 1] &= 0x7f;
    return [binable.fromBytes(bytes), paddingBit];
}
exports.fieldFromHex = fieldFromHex;
function signTransaction(transaction, privateKey, network) {
    let signature;
    if (transaction.payment !== null) {
        let payment = paymentFromRosetta(transaction.payment);
        signature = (0, sign_legacy_js_1.signPayment)(payment, privateKey, network);
    }
    else if (transaction.stakeDelegation !== null) {
        let delegation = delegationFromRosetta(transaction.stakeDelegation);
        signature = (0, sign_legacy_js_1.signStakeDelegation)(delegation, privateKey, network);
    }
    else {
        throw Error('signTransaction: Unsupported transaction');
    }
    let publicKey = curve_bigint_js_1.PublicKey.toBase58(curve_bigint_js_1.PrivateKey.toPublicKey(curve_bigint_js_1.PrivateKey.fromBase58(privateKey)));
    return {
        data: transaction,
        signature: signatureJsonToHex(signature),
        publicKey,
    };
}
exports.signTransaction = signTransaction;
function paymentFromRosetta(payment) {
    return {
        common: {
            fee: payment.fee,
            feePayer: payment.from,
            nonce: payment.nonce,
            validUntil: payment.valid_until ?? defaultValidUntil,
            memo: payment.memo ?? '',
        },
        body: {
            receiver: payment.to,
            amount: payment.amount,
        },
    };
}
function delegationFromRosetta(delegation) {
    return {
        common: {
            feePayer: delegation.delegator,
            fee: delegation.fee,
            validUntil: delegation.valid_until ?? defaultValidUntil,
            memo: delegation.memo ?? '',
            nonce: delegation.nonce,
        },
        body: {
            newDelegate: delegation.new_delegate,
        },
    };
}
function verifyTransaction(signedTransaction, network) {
    if (signedTransaction.data.payment !== null) {
        return (0, sign_legacy_js_1.verifyPayment)(paymentFromRosetta(signedTransaction.data.payment), signatureJsonFromHex(signedTransaction.signature), signedTransaction.publicKey, network);
    }
    if (signedTransaction.data.stakeDelegation !== null) {
        return (0, sign_legacy_js_1.verifyStakeDelegation)(delegationFromRosetta(signedTransaction.data.stakeDelegation), signatureJsonFromHex(signedTransaction.signature), signedTransaction.publicKey, network);
    }
    throw Error('verifyTransaction: Unsupported transaction');
}
exports.verifyTransaction = verifyTransaction;
// create a signature for /construction/combine payload
function rosettaCombineSignature(signature, signingPayload) {
    let publicKey = curve_bigint_js_1.PublicKey.fromBase58(signature.publicKey);
    return {
        hex_bytes: signature.signature,
        public_key: {
            hex_bytes: publicKeyToHex(publicKey),
            curve_type: 'pallas',
        },
        signature_type: 'schnorr_poseidon',
        signing_payload: signingPayload,
    };
}
exports.rosettaCombineSignature = rosettaCombineSignature;
// create a payload for /construction/combine
function rosettaCombinePayload(unsignedPayload, privateKey, network) {
    let signature = signTransaction(JSON.parse(unsignedPayload.unsigned_transaction), privateKey, network);
    let signatures = [rosettaCombineSignature(signature, unsignedPayload.payloads[0])];
    return {
        network_identifier: { blockchain: 'mina', network },
        unsigned_transaction: unsignedPayload.unsigned_transaction,
        signatures,
    };
}
exports.rosettaCombinePayload = rosettaCombinePayload;
// TODO: clean up this logic, was copied over from OCaml code
function rosettaTransactionToSignedCommand({ signature, payment, stake_delegation, }) {
    let signatureDecoded = signatureFromHex(signature);
    let signatureBase58 = signature_js_1.Signature.toBase58(signatureDecoded);
    let [t, nonce] = (() => {
        if (payment !== null && stake_delegation === null) {
            let r = payment;
            let command = {
                receiver: r.to,
                source: r.from,
                kind: 'Payment',
                fee_payer: r.from,
                fee_token: r.token,
                fee: r.fee,
                amount: r.amount,
                valid_until: r.valid_until,
                memo: r.memo,
            };
            return [command, r.nonce];
        }
        else if (payment === null && stake_delegation !== null) {
            let r = stake_delegation;
            let command = {
                receiver: r.new_delegate,
                source: r.delegator,
                kind: 'Delegation',
                fee_payer: r.delegator,
                fee_token: '1',
                fee: r.fee,
                amount: null,
                valid_until: r.valid_until,
                memo: r.memo,
            };
            return [command, r.nonce];
        }
        else {
            throw Error('rosettaTransactionToSignedCommand: Unsupported transaction');
        }
    })();
    let payload = (() => {
        let fee_payer_pk = t.fee_payer;
        let source_pk = t.source;
        let receiver_pk = t.receiver;
        let memo = memo_js_1.Memo.toBase58(memo_js_1.Memo.fromString(t.memo ?? ''));
        let common = {
            fee: t.fee,
            fee_payer_pk,
            nonce,
            valid_until: t.valid_until,
            memo,
        };
        if (t.kind === 'Payment') {
            return {
                common,
                body: ['Payment', { source_pk, receiver_pk, amount: t.amount }],
            };
        }
        else if (t.kind === 'Delegation') {
            return {
                common,
                body: [
                    'Stake_delegation',
                    ['Set_delegate', { delegator: source_pk, new_delegate: receiver_pk }],
                ],
            };
        }
        else
            throw Error('rosettaTransactionToSignedCommand has a bug');
    })();
    return {
        signature: signatureBase58,
        signer: payload.common.fee_payer_pk,
        payload,
    };
}
exports.rosettaTransactionToSignedCommand = rosettaTransactionToSignedCommand;
