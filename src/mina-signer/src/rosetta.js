import { PublicKey, PrivateKey, Scalar } from './curve-bigint.js';
import { Field } from './field-bigint.js';
import { Memo } from './memo.js';
import { Signature } from './signature.js';
import { signPayment, signStakeDelegation, verifyPayment, verifyStakeDelegation, } from './sign-legacy.js';
export { publicKeyToHex, signatureFromHex, signatureJsonFromHex, signatureToHex, signatureJsonToHex, fieldFromHex, fieldToHex, rosettaTransactionToSignedCommand, signTransaction, verifyTransaction, rosettaCombineSignature, rosettaCombinePayload, };
const defaultValidUntil = '4294967295';
function publicKeyToHex(publicKey) {
    return fieldToHex(Field, publicKey.x, !!publicKey.isOdd);
}
function signatureFromHex(signatureHex) {
    let half = signatureHex.length / 2;
    let fieldHex = signatureHex.slice(0, half);
    let scalarHex = signatureHex.slice(half);
    return {
        r: fieldFromHex(Field, fieldHex)[0],
        s: fieldFromHex(Scalar, scalarHex)[0],
    };
}
function signatureJsonFromHex(signatureHex) {
    return Signature.toJSON(signatureFromHex(signatureHex));
}
function signatureJsonToHex(signatureJson) {
    return signatureToHex(Signature.fromJSON(signatureJson));
}
function signatureToHex(signature) {
    let rHex = fieldToHex(Field, signature.r);
    let sHex = fieldToHex(Scalar, signature.s);
    return `${rHex}${sHex}`;
}
function fieldToHex(binable, x, paddingBit = false) {
    let bytes = binable.toBytes(x);
    // set highest bit (which is empty)
    bytes[bytes.length - 1] |= Number(paddingBit) << 7;
    // map each byte to a 0-padded hex string of length 2
    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
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
function signTransaction(transaction, privateKey, network) {
    let signature;
    if (transaction.payment !== null) {
        let payment = paymentFromRosetta(transaction.payment);
        signature = signPayment(payment, privateKey, network);
    }
    else if (transaction.stakeDelegation !== null) {
        let delegation = delegationFromRosetta(transaction.stakeDelegation);
        signature = signStakeDelegation(delegation, privateKey, network);
    }
    else {
        throw Error('signTransaction: Unsupported transaction');
    }
    let publicKey = PublicKey.toBase58(PrivateKey.toPublicKey(PrivateKey.fromBase58(privateKey)));
    return {
        data: transaction,
        signature: signatureJsonToHex(signature),
        publicKey,
    };
}
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
        return verifyPayment(paymentFromRosetta(signedTransaction.data.payment), signatureJsonFromHex(signedTransaction.signature), signedTransaction.publicKey, network);
    }
    if (signedTransaction.data.stakeDelegation !== null) {
        return verifyStakeDelegation(delegationFromRosetta(signedTransaction.data.stakeDelegation), signatureJsonFromHex(signedTransaction.signature), signedTransaction.publicKey, network);
    }
    throw Error('verifyTransaction: Unsupported transaction');
}
// create a signature for /construction/combine payload
function rosettaCombineSignature(signature, signingPayload) {
    let publicKey = PublicKey.fromBase58(signature.publicKey);
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
// TODO: clean up this logic, was copied over from OCaml code
function rosettaTransactionToSignedCommand({ signature, payment, stake_delegation, }) {
    let signatureDecoded = signatureFromHex(signature);
    let signatureBase58 = Signature.toBase58(signatureDecoded);
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
        let memo = Memo.toBase58(Memo.fromString(t.memo ?? ''));
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
