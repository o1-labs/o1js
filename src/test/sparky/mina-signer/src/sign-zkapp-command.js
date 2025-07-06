"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCallDepthValid = exports.accountUpdateFromFeePayer = exports.createFeePayer = exports.feePayerHash = exports.accountUpdateHash = exports.callForestHashGeneric = exports.callForestHash = exports.accountUpdatesToCallForest = exports.verifyAccountUpdateSignature = exports.transactionCommitments = exports.verifyZkappCommandSignature = exports.signZkappCommand = void 0;
const field_bigint_js_1 = require("./field-bigint.js");
const curve_bigint_js_1 = require("./curve-bigint.js");
const transaction_bigint_js_1 = require("../../bindings/mina-transaction/gen/v1/transaction-bigint.js");
const poseidon_bigint_js_1 = require("./poseidon-bigint.js");
const memo_js_1 = require("./memo.js");
const signature_js_1 = require("./signature.js");
const constants_js_1 = require("../../bindings/crypto/constants.js");
function signZkappCommand(zkappCommand_, privateKeyBase58, networkId) {
    let zkappCommand = transaction_bigint_js_1.ZkappCommand.fromJSON(zkappCommand_);
    let { commitment, fullCommitment } = transactionCommitments(zkappCommand, networkId);
    let privateKey = curve_bigint_js_1.PrivateKey.fromBase58(privateKeyBase58);
    let publicKey = zkappCommand.feePayer.body.publicKey;
    // sign fee payer
    let signature = (0, signature_js_1.signFieldElement)(fullCommitment, privateKey, networkId);
    zkappCommand.feePayer.authorization = signature_js_1.Signature.toBase58(signature);
    // sign other updates with the same public key that require a signature
    for (let update of zkappCommand.accountUpdates) {
        if (!update.body.authorizationKind.isSigned)
            continue;
        if (!curve_bigint_js_1.PublicKey.equal(update.body.publicKey, publicKey))
            continue;
        let { useFullCommitment } = update.body;
        let usedCommitment = useFullCommitment ? fullCommitment : commitment;
        let signature = (0, signature_js_1.signFieldElement)(usedCommitment, privateKey, networkId);
        update.authorization = { signature: signature_js_1.Signature.toBase58(signature) };
    }
    return transaction_bigint_js_1.ZkappCommand.toJSON(zkappCommand);
}
exports.signZkappCommand = signZkappCommand;
function verifyZkappCommandSignature(zkappCommand_, publicKeyBase58, networkId) {
    let zkappCommand = transaction_bigint_js_1.ZkappCommand.fromJSON(zkappCommand_);
    let { commitment, fullCommitment } = transactionCommitments(zkappCommand, networkId);
    let publicKey = curve_bigint_js_1.PublicKey.fromBase58(publicKeyBase58);
    // verify fee payer signature
    let signature = signature_js_1.Signature.fromBase58(zkappCommand.feePayer.authorization);
    let ok = (0, signature_js_1.verifyFieldElement)(signature, fullCommitment, publicKey, networkId);
    if (!ok)
        return false;
    // verify other signatures for the same public key
    for (let update of zkappCommand.accountUpdates) {
        if (!update.body.authorizationKind.isSigned)
            continue;
        if (!curve_bigint_js_1.PublicKey.equal(update.body.publicKey, publicKey))
            continue;
        let { useFullCommitment } = update.body;
        let usedCommitment = useFullCommitment ? fullCommitment : commitment;
        if (update.authorization.signature === undefined)
            return false;
        let signature = signature_js_1.Signature.fromBase58(update.authorization.signature);
        ok = (0, signature_js_1.verifyFieldElement)(signature, usedCommitment, publicKey, networkId);
        if (!ok)
            return false;
    }
    return ok;
}
exports.verifyZkappCommandSignature = verifyZkappCommandSignature;
function verifyAccountUpdateSignature(update, transactionCommitments, networkId) {
    if (update.authorization.signature === undefined)
        return false;
    let { publicKey, useFullCommitment } = update.body;
    let { commitment, fullCommitment } = transactionCommitments;
    let usedCommitment = useFullCommitment ? fullCommitment : commitment;
    let signature = signature_js_1.Signature.fromBase58(update.authorization.signature);
    return (0, signature_js_1.verifyFieldElement)(signature, usedCommitment, publicKey, networkId);
}
exports.verifyAccountUpdateSignature = verifyAccountUpdateSignature;
function transactionCommitments(zkappCommand, networkId) {
    if (!isCallDepthValid(zkappCommand)) {
        throw Error('zkapp command: invalid call depth');
    }
    let callForest = accountUpdatesToCallForest(zkappCommand.accountUpdates);
    let commitment = callForestHash(callForest, networkId);
    let memoHash = memo_js_1.Memo.hash(memo_js_1.Memo.fromBase58(zkappCommand.memo));
    let feePayerDigest = feePayerHash(zkappCommand.feePayer, networkId);
    let fullCommitment = (0, poseidon_bigint_js_1.hashWithPrefix)(poseidon_bigint_js_1.prefixes.accountUpdateCons, [
        memoHash,
        feePayerDigest,
        commitment,
    ]);
    return { commitment, fullCommitment };
}
exports.transactionCommitments = transactionCommitments;
/**
 * Turn flat list into a hierarchical structure (forest) by letting the callDepth
 * determine parent-child relationships
 */
function accountUpdatesToCallForest(updates, callDepth = 0) {
    let remainingUpdates = callDepth > 0 ? updates : [...updates];
    let forest = [];
    while (remainingUpdates.length > 0) {
        let accountUpdate = remainingUpdates[0];
        if (accountUpdate.body.callDepth < callDepth)
            return forest;
        remainingUpdates.shift();
        let children = accountUpdatesToCallForest(remainingUpdates, callDepth + 1);
        forest.push({ accountUpdate, children });
    }
    return forest;
}
exports.accountUpdatesToCallForest = accountUpdatesToCallForest;
function accountUpdateHash(update, networkId) {
    assertAuthorizationKindValid(update);
    let input = transaction_bigint_js_1.AccountUpdate.toInput(update);
    let fields = (0, poseidon_bigint_js_1.packToFields)(input);
    return (0, poseidon_bigint_js_1.hashWithPrefix)((0, signature_js_1.zkAppBodyPrefix)(networkId), fields);
}
exports.accountUpdateHash = accountUpdateHash;
function callForestHash(forest, networkId) {
    return callForestHashGeneric(forest, accountUpdateHash, poseidon_bigint_js_1.hashWithPrefix, 0n, networkId);
}
exports.callForestHash = callForestHash;
function callForestHashGeneric(forest, hash, hashWithPrefix, emptyHash, networkId) {
    let stackHash = emptyHash;
    for (let callTree of [...forest].reverse()) {
        let calls = callForestHashGeneric(callTree.children, hash, hashWithPrefix, emptyHash, networkId);
        let treeHash = hash(callTree.accountUpdate, networkId);
        let nodeHash = hashWithPrefix(poseidon_bigint_js_1.prefixes.accountUpdateNode, [treeHash, calls]);
        stackHash = hashWithPrefix(poseidon_bigint_js_1.prefixes.accountUpdateCons, [nodeHash, stackHash]);
    }
    return stackHash;
}
exports.callForestHashGeneric = callForestHashGeneric;
function createFeePayer(feePayer) {
    return { authorization: '', body: feePayer };
}
exports.createFeePayer = createFeePayer;
function feePayerHash(feePayer, networkId) {
    let accountUpdate = accountUpdateFromFeePayer(feePayer);
    return accountUpdateHash(accountUpdate, networkId);
}
exports.feePayerHash = feePayerHash;
function accountUpdateFromFeePayer({ body: { fee, nonce, publicKey, validUntil }, authorization: signature, }) {
    let { body } = transaction_bigint_js_1.AccountUpdate.empty();
    body.publicKey = publicKey;
    body.balanceChange = { magnitude: fee, sgn: (0, field_bigint_js_1.Sign)(-1) };
    body.incrementNonce = (0, field_bigint_js_1.Bool)(true);
    body.preconditions.network.globalSlotSinceGenesis = {
        isSome: (0, field_bigint_js_1.Bool)(true),
        value: { lower: (0, field_bigint_js_1.UInt32)(0), upper: validUntil ?? field_bigint_js_1.UInt32.maxValue },
    };
    body.preconditions.account.nonce = {
        isSome: (0, field_bigint_js_1.Bool)(true),
        value: { lower: nonce, upper: nonce },
    };
    body.useFullCommitment = (0, field_bigint_js_1.Bool)(true);
    body.implicitAccountCreationFee = (0, field_bigint_js_1.Bool)(true);
    body.authorizationKind = {
        isProved: (0, field_bigint_js_1.Bool)(false),
        isSigned: (0, field_bigint_js_1.Bool)(true),
        verificationKeyHash: (0, field_bigint_js_1.Field)(constants_js_1.mocks.dummyVerificationKeyHash),
    };
    return { body, authorization: { signature } };
}
exports.accountUpdateFromFeePayer = accountUpdateFromFeePayer;
function isCallDepthValid(zkappCommand) {
    let callDepths = zkappCommand.accountUpdates.map((a) => a.body.callDepth);
    let current = callDepths.shift() ?? 0;
    if (current !== 0)
        return false;
    for (let callDepth of callDepths) {
        if (callDepth < 0)
            return false;
        if (callDepth - current > 1)
            return false;
        current = callDepth;
    }
    return true;
}
exports.isCallDepthValid = isCallDepthValid;
function assertAuthorizationKindValid(accountUpdate) {
    let { isSigned, isProved, verificationKeyHash } = accountUpdate.body.authorizationKind;
    if (isProved && isSigned)
        throw Error('Invalid authorization kind: Only one of `isProved` and `isSigned` may be true.');
    if (!isProved && verificationKeyHash !== (0, field_bigint_js_1.Field)(constants_js_1.mocks.dummyVerificationKeyHash))
        throw Error(`Invalid authorization kind: If \`isProved\` is false, verification key hash must be ${constants_js_1.mocks.dummyVerificationKeyHash}, got ${verificationKeyHash}`);
}
