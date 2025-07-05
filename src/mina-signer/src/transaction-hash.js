import { Bool, Field } from './field-bigint.js';
import { BinableString, BinableUint64, BinableUint32, defineBinable, enumWithArgument, record, stringToBytes, withVersionNumber, } from '../../bindings/lib/binable.js';
import { delegationFromJson, paymentFromJson, } from './sign-legacy.js';
import { PublicKey, Scalar } from './curve-bigint.js';
import { Signature } from './signature.js';
import { blake2b } from 'blakejs';
import { base58, withBase58 } from '../../lib/util/base58.js';
import { versionBytes } from '../../bindings/crypto/constants.js';
export { hashPayment, hashStakeDelegation, SignedCommand, SignedCommandV1, Common, userCommandToEnum, userCommandToV1, HashBase58, };
const dummySignature = { r: Field(1), s: Scalar(1) };
function hashPayment(signed, { berkeley = false } = {}) {
    if (!berkeley)
        return hashPaymentV1(signed);
    let payload = userCommandToEnum(paymentFromJson(signed.data));
    return hashSignedCommand({
        signer: PublicKey.fromBase58(signed.data.common.feePayer),
        signature: dummySignature,
        payload,
    });
}
function hashStakeDelegation(signed, { berkeley = false } = {}) {
    if (!berkeley)
        return hashStakeDelegationV1(signed);
    let payload = userCommandToEnum(delegationFromJson(signed.data));
    return hashSignedCommand({
        signer: PublicKey.fromBase58(signed.data.common.feePayer),
        signature: dummySignature,
        payload,
    });
}
function hashSignedCommand(command) {
    let inputBytes = SignedCommand.toBytes(command);
    let bytes = blake2b(Uint8Array.from(inputBytes), undefined, 32);
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
// binable
let BinablePublicKey = record({ x: Field, isOdd: Bool }, ['x', 'isOdd']);
let GlobalSlotSinceGenesis = enumWithArgument([
    { type: 'SinceGenesis', value: BinableUint32 },
]);
const Common = record({
    fee: BinableUint64,
    feePayer: BinablePublicKey,
    nonce: BinableUint32,
    validUntil: GlobalSlotSinceGenesis,
    memo: BinableString,
}, ['fee', 'feePayer', 'nonce', 'validUntil', 'memo']);
const Payment = record({
    receiver: BinablePublicKey,
    amount: BinableUint64,
}, ['receiver', 'amount']);
const Delegation = record({ newDelegate: BinablePublicKey }, ['newDelegate']);
const DelegationEnum = enumWithArgument([
    { type: 'SetDelegate', value: Delegation },
]);
const Body = enumWithArgument([
    { type: 'Payment', value: Payment },
    { type: 'StakeDelegation', value: DelegationEnum },
]);
const UserCommand = record({ common: Common, body: Body }, ['common', 'body']);
const BinableSignature = record({ r: Field, s: Scalar }, ['r', 's']);
const SignedCommand = record({
    payload: UserCommand,
    signer: BinablePublicKey,
    signature: BinableSignature,
}, ['payload', 'signer', 'signature']);
const HashBase58 = base58(defineBinable({
    toBytes(t) {
        return [t.length, ...t];
    },
    readBytes(bytes) {
        return [Uint8Array.from(bytes.slice(1)), bytes.length];
    },
}), versionBytes.transactionHash);
// legacy / v1 stuff
function hashPaymentV1({ data, signature }) {
    let paymentV1 = userCommandToV1(paymentFromJson(data));
    return hashSignedCommandV1({
        signer: PublicKey.fromBase58(data.common.feePayer),
        signature: Signature.fromJSON(signature),
        payload: paymentV1,
    });
}
function hashStakeDelegationV1({ data, signature }) {
    let payload = userCommandToV1(delegationFromJson(data));
    return hashSignedCommandV1({
        signer: PublicKey.fromBase58(data.common.feePayer),
        signature: Signature.fromJSON(signature),
        payload,
    });
}
function hashSignedCommandV1(command) {
    let base58 = SignedCommandV1.toBase58(command);
    let inputBytes = stringToBytes(base58);
    let bytes = blake2b(Uint8Array.from(inputBytes), undefined, 32);
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
// binables for v1 signed commands
// TODO: Version numbers (of 1) were placed somewhat arbitrarily until it worked / matched serializations from OCaml.
// I couldn't precisely explain each of them from following the OCaml type annotations, which I find hard to parse.
// You could get an equivalent serialization by moving, for example, one of the version numbers on `common` one level down to become
// another version number on `fee`, and I'm not sure what the correct answer is. I think this doesn't matter because
// the type layout here, including version numbers, is frozen, so if it works once it'll work forever.
const with1 = (binable) => withVersionNumber(binable, 1);
const Uint64V1 = with1(with1(BinableUint64));
const Uint32V1 = with1(with1(BinableUint32));
const CommonV1 = with1(with1(record({
    fee: with1(Uint64V1),
    feeToken: with1(Uint64V1),
    feePayer: PublicKey,
    nonce: Uint32V1,
    validUntil: Uint32V1,
    memo: with1(BinableString),
}, ['fee', 'feeToken', 'feePayer', 'nonce', 'validUntil', 'memo'])));
const PaymentV1 = with1(with1(record({
    source: PublicKey,
    receiver: PublicKey,
    tokenId: Uint64V1,
    amount: with1(Uint64V1),
}, ['source', 'receiver', 'tokenId', 'amount'])));
const DelegationV1 = record({ delegator: PublicKey, newDelegate: PublicKey }, [
    'delegator',
    'newDelegate',
]);
const DelegationEnumV1 = with1(enumWithArgument([{ type: 'SetDelegate', value: DelegationV1 }]));
const BodyV1 = with1(enumWithArgument([
    { type: 'Payment', value: PaymentV1 },
    { type: 'StakeDelegation', value: DelegationEnumV1 },
]));
const UserCommandV1 = with1(record({ common: CommonV1, body: BodyV1 }, ['common', 'body']));
const SignedCommandV1 = withBase58(with1(with1(record({
    payload: UserCommandV1,
    signer: with1(PublicKey),
    signature: with1(record({ r: with1(Field), s: Scalar }, ['r', 's'])),
}, ['payload', 'signer', 'signature']))), versionBytes.signedCommandV1);
