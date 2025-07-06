"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterGroups = exports.verifyAccountUpdate = exports.getTotalTimeRequired = exports.verifyTransactionLimits = exports.defaultNetworkState = exports.reportGetAccountError = void 0;
/**
 * This module holds the global Mina instance and its interface.
 */
const account_update_js_1 = require("./account-update.js");
const wrapped_js_1 = require("../../provable/wrapped.js");
const int_js_1 = require("../../provable/int.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
const zkprogram_js_1 = require("../../proof-system/zkprogram.js");
const sign_zkapp_command_js_1 = require("../../../mina-signer/src/sign-zkapp-command.js");
const constants_js_1 = require("./constants.js");
const struct_js_1 = require("../../provable/types/struct.js");
const common_js_1 = require("../../provable/gadgets/common.js");
const types_js_1 = require("../../../bindings/mina-transaction/v1/types.js");
const verification_key_js_1 = require("../../proof-system/verification-key.js");
function reportGetAccountError(publicKey, tokenId) {
    if (tokenId === account_update_js_1.TokenId.toBase58(account_update_js_1.TokenId.default)) {
        return `getAccount: Could not find account for public key ${publicKey}`;
    }
    else {
        return `getAccount: Could not find account for public key ${publicKey} with the tokenId ${tokenId}`;
    }
}
exports.reportGetAccountError = reportGetAccountError;
function defaultNetworkState() {
    let epochData = {
        ledger: { hash: (0, wrapped_js_1.Field)(0), totalCurrency: int_js_1.UInt64.zero },
        seed: (0, wrapped_js_1.Field)(0),
        startCheckpoint: (0, wrapped_js_1.Field)(0),
        lockCheckpoint: (0, wrapped_js_1.Field)(0),
        epochLength: int_js_1.UInt32.zero,
    };
    return {
        snarkedLedgerHash: (0, wrapped_js_1.Field)(0),
        blockchainLength: int_js_1.UInt32.zero,
        minWindowDensity: int_js_1.UInt32.zero,
        totalCurrency: int_js_1.UInt64.zero,
        globalSlotSinceGenesis: int_js_1.UInt32.zero,
        stakingEpochData: epochData,
        nextEpochData: (0, struct_js_1.cloneCircuitValue)(epochData),
    };
}
exports.defaultNetworkState = defaultNetworkState;
function verifyTransactionLimits({ accountUpdates }) {
    let { totalTimeRequired, eventElements, authTypes } = getTotalTimeRequired(accountUpdates);
    let isWithinCostLimit = totalTimeRequired < constants_js_1.TransactionCost.COST_LIMIT;
    let isWithinEventsLimit = eventElements.events <= constants_js_1.TransactionLimits.MAX_EVENT_ELEMENTS;
    let isWithinActionsLimit = eventElements.actions <= constants_js_1.TransactionLimits.MAX_ACTION_ELEMENTS;
    let error = '';
    if (!isWithinCostLimit) {
        // TODO: we should add a link to the docs explaining the reasoning behind it once we have such an explainer
        error += `Error: The transaction is too expensive, try reducing the number of AccountUpdates that are attached to the transaction.
Each transaction needs to be processed by the snark workers on the network.
Certain layouts of AccountUpdates require more proving time than others, and therefore are too expensive.

${JSON.stringify(authTypes)}
\n\n`;
    }
    if (!isWithinEventsLimit) {
        error += `Error: The account updates in your transaction are trying to emit too much event data. The maximum allowed number of field elements in events is ${constants_js_1.TransactionLimits.MAX_EVENT_ELEMENTS}, but you tried to emit ${eventElements.events}.\n\n`;
    }
    if (!isWithinActionsLimit) {
        error += `Error: The account updates in your transaction are trying to emit too much action data. The maximum allowed number of field elements in actions is ${constants_js_1.TransactionLimits.MAX_ACTION_ELEMENTS}, but you tried to emit ${eventElements.actions}.\n\n`;
    }
    if (error)
        throw Error('Error during transaction sending:\n\n' + error);
}
exports.verifyTransactionLimits = verifyTransactionLimits;
function getTotalTimeRequired(accountUpdates) {
    let eventElements = { events: 0, actions: 0 };
    let authKinds = accountUpdates.map((update) => {
        eventElements.events += countEventElements(update.body.events);
        eventElements.actions += countEventElements(update.body.actions);
        let { isSigned, isProved, verificationKeyHash } = update.body.authorizationKind;
        return {
            isSigned: isSigned.toBoolean(),
            isProved: isProved.toBoolean(),
            verificationKeyHash: verificationKeyHash.toString(),
        };
    });
    // insert entry for the fee payer
    authKinds.unshift({
        isSigned: true,
        isProved: false,
        verificationKeyHash: '',
    });
    let authTypes = filterGroups(authKinds);
    /*
    np := proof
    n2 := signedPair
    n1 := signedSingle
  
    formula used to calculate how expensive a zkapp transaction is
  
    10.26*np + 10.08*n2 + 9.14*n1 < 69.45
    */
    let totalTimeRequired = constants_js_1.TransactionCost.PROOF_COST * authTypes.proof +
        constants_js_1.TransactionCost.SIGNED_PAIR_COST * authTypes.signedPair +
        constants_js_1.TransactionCost.SIGNED_SINGLE_COST * authTypes.signedSingle;
    // returns totalTimeRequired and additional data used by verifyTransactionLimits
    return { totalTimeRequired, eventElements, authTypes };
}
exports.getTotalTimeRequired = getTotalTimeRequired;
function countEventElements({ data }) {
    return data.reduce((acc, ev) => acc + ev.length, 0);
}
function filterGroups(xs) {
    let pairs = filterPairs(xs);
    xs = pairs.xs;
    let singleCount = 0;
    let proofCount = 0;
    xs.forEach((t) => {
        if (t.isProved)
            proofCount++;
        else
            singleCount++;
    });
    return {
        signedPair: pairs.pairs,
        signedSingle: singleCount,
        proof: proofCount,
    };
}
exports.filterGroups = filterGroups;
async function verifyAccountUpdate(account, accountUpdate, publicInput, transactionCommitments, proofsEnabled, networkId) {
    // check that that top-level updates have mayUseToken = No
    // (equivalent check exists in the Mina node)
    if (accountUpdate.body.callDepth === 0 &&
        !account_update_js_1.AccountUpdate.MayUseToken.isNo(accountUpdate).toBoolean()) {
        throw Error('Top-level account update can not use or pass on token permissions. Make sure that\n' +
            'accountUpdate.body.mayUseToken = AccountUpdate.MayUseToken.No;');
    }
    let perm = account.permissions;
    // check if addMissingSignatures failed to include a signature
    // due to a missing private key
    if (accountUpdate.authorization === (0, account_update_js_1.dummySignature)()) {
        let pk = signature_js_1.PublicKey.toBase58(accountUpdate.body.publicKey);
        throw Error(`verifyAccountUpdate: Detected a missing signature for (${pk}), private key was missing.`);
    }
    // we are essentially only checking if the update is empty or an actual update
    function includesChange(val) {
        if (Array.isArray(val)) {
            return !val.every((v) => v === null);
        }
        else {
            return val !== null;
        }
    }
    function permissionForUpdate(key) {
        switch (key) {
            case 'appState':
                return perm.editState;
            case 'delegate':
                return perm.setDelegate;
            case 'verificationKey':
                return perm.setVerificationKey.auth;
            case 'permissions':
                return perm.setPermissions;
            case 'zkappUri':
                return perm.setZkappUri;
            case 'tokenSymbol':
                return perm.setTokenSymbol;
            case 'timing':
                return perm.setTiming;
            case 'votingFor':
                return perm.setVotingFor;
            case 'actions':
                return perm.editActionState;
            case 'incrementNonce':
                return perm.incrementNonce;
            case 'send':
                return perm.send;
            case 'receive':
                return perm.receive;
            default:
                throw Error(`Invalid permission for field ${key}: does not exist.`);
        }
    }
    let accountUpdateJson = accountUpdate.toJSON();
    const update = accountUpdateJson.body.update;
    let errorTrace = '';
    let isValidProof = false;
    let isValidSignature = false;
    // we don't check if proofs aren't enabled
    if (!proofsEnabled)
        isValidProof = true;
    if (accountUpdate.authorization.proof && proofsEnabled) {
        try {
            let publicInputFields = account_update_js_1.ZkappPublicInput.toFields(publicInput);
            let proof = {
                maxProofsVerified: 2,
                proof: accountUpdate.authorization.proof,
                publicInput: publicInputFields.map((f) => f.toString()),
                publicOutput: [],
            };
            let verificationKeyRaw = account.zkapp?.verificationKey;
            (0, common_js_1.assert)(verificationKeyRaw !== undefined, 'Account does not have a verification key');
            let verificationKey = verificationKeyRaw.data;
            const isVkValid = await verification_key_js_1.VerificationKey.checkValidity(verificationKeyRaw);
            if (!isVkValid)
                throw Error(`The verification key hash is not consistent with the provided data`);
            isValidProof = await (0, zkprogram_js_1.verify)(proof, verificationKey);
            if (!isValidProof) {
                throw Error(`Invalid proof for account update\n${JSON.stringify(update)}`);
            }
        }
        catch (error) {
            errorTrace += '\n\n' + error.stack;
            isValidProof = false;
        }
    }
    if (accountUpdate.authorization.signature) {
        // checking permissions and authorization for each account update individually
        try {
            isValidSignature = (0, sign_zkapp_command_js_1.verifyAccountUpdateSignature)(types_js_1.TypesBigint.AccountUpdate.fromJSON(accountUpdateJson), transactionCommitments, networkId);
        }
        catch (error) {
            errorTrace += '\n\n' + error.stack;
            isValidSignature = false;
        }
    }
    let verified = false;
    function checkPermission(p0, field) {
        let p = types_js_1.Types.AuthRequired.toJSON(p0);
        if (p === 'None')
            return;
        if (p === 'Impossible') {
            throw Error(`Transaction verification failed: Cannot update field '${field}' because permission for this field is '${p}'`);
        }
        if (p === 'Signature' || p === 'Either') {
            verified || (verified = isValidSignature);
        }
        if (p === 'Proof' || p === 'Either') {
            verified || (verified = isValidProof);
        }
        if (!verified) {
            throw Error(`Transaction verification failed: Cannot update field '${field}' because permission for this field is '${p}', but the required authorization was not provided or is invalid.
        ${errorTrace !== '' ? 'Error trace: ' + errorTrace : ''}\n\n`);
        }
    }
    // goes through the update field on a transaction
    Object.entries(update).forEach(([key, value]) => {
        if (includesChange(value)) {
            let p = permissionForUpdate(key);
            checkPermission(p, key);
        }
    });
    if (accountUpdate.update.verificationKey.isSome.toBoolean()) {
        const isVkValid = await verification_key_js_1.VerificationKey.checkValidity(accountUpdate.update.verificationKey.value);
        if (!isVkValid)
            throw Error(`The verification key hash is not consistent with the provided data`);
    }
    // checks the sequence events (which result in an updated sequence state)
    if (accountUpdate.body.actions.data.length > 0) {
        let p = permissionForUpdate('actions');
        checkPermission(p, 'actions');
    }
    if (accountUpdate.body.incrementNonce.toBoolean()) {
        let p = permissionForUpdate('incrementNonce');
        checkPermission(p, 'incrementNonce');
    }
    // this checks for an edge case where an account update can be approved using proofs but
    // a) the proof is invalid (bad verification key)
    // and b) there are no state changes initiate so no permissions will be checked
    // however, if the verification key changes, the proof should still be invalid
    if (errorTrace && !verified) {
        throw Error(`One or more proofs were invalid and no other form of authorization was provided.\n${errorTrace}`);
    }
}
exports.verifyAccountUpdate = verifyAccountUpdate;
const isPair = (a, b) => !a.isProved && !b.isProved;
function filterPairs(xs) {
    if (xs.length <= 1)
        return { xs, pairs: 0 };
    if (isPair(xs[0], xs[1])) {
        let rec = filterPairs(xs.slice(2));
        return { xs: rec.xs, pairs: rec.pairs + 1 };
    }
    else {
        let rec = filterPairs(xs.slice(1));
        return { xs: [xs[0]].concat(rec.xs), pairs: rec.pairs };
    }
}
