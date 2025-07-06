"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashBase58 = exports.userCommandToV1 = exports.userCommandToEnum = exports.Common = exports.SignedCommandV1 = exports.SignedCommand = exports.hashStakeDelegation = exports.hashPayment = void 0;
const field_bigint_js_1 = require("./field-bigint.js");
const binable_js_1 = require("../../bindings/lib/binable.js");
const sign_legacy_js_1 = require("./sign-legacy.js");
const curve_bigint_js_1 = require("./curve-bigint.js");
const signature_js_1 = require("./signature.js");
const blakejs_1 = require("blakejs");
const base58_js_1 = require("../../lib/util/base58.js");
const constants_js_1 = require("../../bindings/crypto/constants.js");
const dummySignature = { r: (0, field_bigint_js_1.Field)(1), s: (0, curve_bigint_js_1.Scalar)(1) };
function hashPayment(signed, { berkeley = false } = {}) {
    if (!berkeley)
        return hashPaymentV1(signed);
    let payload = userCommandToEnum((0, sign_legacy_js_1.paymentFromJson)(signed.data));
    return hashSignedCommand({
        signer: curve_bigint_js_1.PublicKey.fromBase58(signed.data.common.feePayer),
        signature: dummySignature,
        payload,
    });
}
exports.hashPayment = hashPayment;
function hashStakeDelegation(signed, { berkeley = false } = {}) {
    if (!berkeley)
        return hashStakeDelegationV1(signed);
    let payload = userCommandToEnum((0, sign_legacy_js_1.delegationFromJson)(signed.data));
    return hashSignedCommand({
        signer: curve_bigint_js_1.PublicKey.fromBase58(signed.data.common.feePayer),
        signature: dummySignature,
        payload,
    });
}
exports.hashStakeDelegation = hashStakeDelegation;
function hashSignedCommand(command) {
    let inputBytes = SignedCommand.toBytes(command);
    let bytes = (0, blakejs_1.blake2b)(Uint8Array.from(inputBytes), undefined, 32);
    return HashBase58.toBase58(bytes);
}
// helper
function userCommandToEnum({ common, body }) {
    let { tag: type, ...value } = body;
    switch (type) {
        case 'Payment':
            return {
                common,
                body: { type, value: { receiver: body.receiver, amount: body.amount } },
            };
        case 'StakeDelegation':
            let { receiver: newDelegate } = value;
            return {
                common,
                body: {
                    type,
                    value: { type: 'SetDelegate', value: { newDelegate } },
                },
            };
    }
}
exports.userCommandToEnum = userCommandToEnum;
// binable
let BinablePublicKey = (0, binable_js_1.record)({ x: field_bigint_js_1.Field, isOdd: field_bigint_js_1.Bool }, ['x', 'isOdd']);
let GlobalSlotSinceGenesis = (0, binable_js_1.enumWithArgument)([
    { type: 'SinceGenesis', value: binable_js_1.BinableUint32 },
]);
const Common = (0, binable_js_1.record)({
    fee: binable_js_1.BinableUint64,
    feePayer: BinablePublicKey,
    nonce: binable_js_1.BinableUint32,
    validUntil: GlobalSlotSinceGenesis,
    memo: binable_js_1.BinableString,
}, ['fee', 'feePayer', 'nonce', 'validUntil', 'memo']);
exports.Common = Common;
const Payment = (0, binable_js_1.record)({
    receiver: BinablePublicKey,
    amount: binable_js_1.BinableUint64,
}, ['receiver', 'amount']);
const Delegation = (0, binable_js_1.record)({ newDelegate: BinablePublicKey }, ['newDelegate']);
const DelegationEnum = (0, binable_js_1.enumWithArgument)([
    { type: 'SetDelegate', value: Delegation },
]);
const Body = (0, binable_js_1.enumWithArgument)([
    { type: 'Payment', value: Payment },
    { type: 'StakeDelegation', value: DelegationEnum },
]);
const UserCommand = (0, binable_js_1.record)({ common: Common, body: Body }, ['common', 'body']);
const BinableSignature = (0, binable_js_1.record)({ r: field_bigint_js_1.Field, s: curve_bigint_js_1.Scalar }, ['r', 's']);
const SignedCommand = (0, binable_js_1.record)({
    payload: UserCommand,
    signer: BinablePublicKey,
    signature: BinableSignature,
}, ['payload', 'signer', 'signature']);
exports.SignedCommand = SignedCommand;
const HashBase58 = (0, base58_js_1.base58)((0, binable_js_1.defineBinable)({
    toBytes(t) {
        return [t.length, ...t];
    },
    readBytes(bytes) {
        return [Uint8Array.from(bytes.slice(1)), bytes.length];
    },
}), constants_js_1.versionBytes.transactionHash);
exports.HashBase58 = HashBase58;
// legacy / v1 stuff
function hashPaymentV1({ data, signature }) {
    let paymentV1 = userCommandToV1((0, sign_legacy_js_1.paymentFromJson)(data));
    return hashSignedCommandV1({
        signer: curve_bigint_js_1.PublicKey.fromBase58(data.common.feePayer),
        signature: signature_js_1.Signature.fromJSON(signature),
        payload: paymentV1,
    });
}
function hashStakeDelegationV1({ data, signature }) {
    let payload = userCommandToV1((0, sign_legacy_js_1.delegationFromJson)(data));
    return hashSignedCommandV1({
        signer: curve_bigint_js_1.PublicKey.fromBase58(data.common.feePayer),
        signature: signature_js_1.Signature.fromJSON(signature),
        payload,
    });
}
function hashSignedCommandV1(command) {
    let base58 = SignedCommandV1.toBase58(command);
    let inputBytes = (0, binable_js_1.stringToBytes)(base58);
    let bytes = (0, blakejs_1.blake2b)(Uint8Array.from(inputBytes), undefined, 32);
    return HashBase58.toBase58(bytes);
}
function userCommandToV1({ common, body }) {
    let { tag: type, ...value } = body;
    let commonV1 = {
        ...common,
        validUntil: common.validUntil.value,
        feeToken: 1n,
    };
    switch (type) {
        case 'Payment':
            let paymentV1 = { ...value, tokenId: 1n };
            return { common: commonV1, body: { type, value: paymentV1 } };
        case 'StakeDelegation':
            let { source: delegator, receiver: newDelegate } = value;
            return {
                common: commonV1,
                body: {
                    type,
                    value: { type: 'SetDelegate', value: { delegator, newDelegate } },
                },
            };
    }
}
exports.userCommandToV1 = userCommandToV1;
// binables for v1 signed commands
// TODO: Version numbers (of 1) were placed somewhat arbitrarily until it worked / matched serializations from OCaml.
// I couldn't precisely explain each of them from following the OCaml type annotations, which I find hard to parse.
// You could get an equivalent serialization by moving, for example, one of the version numbers on `common` one level down to become
// another version number on `fee`, and I'm not sure what the correct answer is. I think this doesn't matter because
// the type layout here, including version numbers, is frozen, so if it works once it'll work forever.
const with1 = (binable) => (0, binable_js_1.withVersionNumber)(binable, 1);
const Uint64V1 = with1(with1(binable_js_1.BinableUint64));
const Uint32V1 = with1(with1(binable_js_1.BinableUint32));
const CommonV1 = with1(with1((0, binable_js_1.record)({
    fee: with1(Uint64V1),
    feeToken: with1(Uint64V1),
    feePayer: curve_bigint_js_1.PublicKey,
    nonce: Uint32V1,
    validUntil: Uint32V1,
    memo: with1(binable_js_1.BinableString),
}, ['fee', 'feeToken', 'feePayer', 'nonce', 'validUntil', 'memo'])));
const PaymentV1 = with1(with1((0, binable_js_1.record)({
    source: curve_bigint_js_1.PublicKey,
    receiver: curve_bigint_js_1.PublicKey,
    tokenId: Uint64V1,
    amount: with1(Uint64V1),
}, ['source', 'receiver', 'tokenId', 'amount'])));
const DelegationV1 = (0, binable_js_1.record)({ delegator: curve_bigint_js_1.PublicKey, newDelegate: curve_bigint_js_1.PublicKey }, [
    'delegator',
    'newDelegate',
]);
const DelegationEnumV1 = with1((0, binable_js_1.enumWithArgument)([{ type: 'SetDelegate', value: DelegationV1 }]));
const BodyV1 = with1((0, binable_js_1.enumWithArgument)([
    { type: 'Payment', value: PaymentV1 },
    { type: 'StakeDelegation', value: DelegationEnumV1 },
]));
const UserCommandV1 = with1((0, binable_js_1.record)({ common: CommonV1, body: BodyV1 }, ['common', 'body']));
const SignedCommandV1 = (0, base58_js_1.withBase58)(with1(with1((0, binable_js_1.record)({
    payload: UserCommandV1,
    signer: with1(curve_bigint_js_1.PublicKey),
    signature: with1((0, binable_js_1.record)({ r: with1(field_bigint_js_1.Field), s: curve_bigint_js_1.Scalar }, ['r', 's'])),
}, ['payload', 'signer', 'signature']))), constants_js_1.versionBytes.signedCommandV1);
exports.SignedCommandV1 = SignedCommandV1;
