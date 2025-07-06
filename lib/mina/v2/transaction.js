"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZkappCommand = exports.AuthorizedZkappCommand = exports.ZkappCommandContext = exports.ZkappFeePayment = exports.ZkappCommand = void 0;
const authorization_js_1 = require("./authorization.js");
const account_update_js_1 = require("./account-update.js");
const account_js_1 = require("./account.js");
const core_js_1 = require("./core.js");
const errors_js_1 = require("./errors.js");
const preconditions_js_1 = require("./preconditions.js");
const zkapp_logic_js_1 = require("./zkapp-logic.js");
const bool_js_1 = require("../../provable/bool.js");
const field_js_1 = require("../../provable/field.js");
const int_js_1 = require("../../provable/int.js");
const constants_js_1 = require("../../../bindings/crypto/constants.js");
const BindingsLayout = require("../../../bindings/mina-transaction/gen/v2/js-layout.js");
const memo_js_1 = require("../../../mina-signer/src/memo.js");
const poseidon_bigint_js_1 = require("../../../mina-signer/src/poseidon-bigint.js");
const signature_js_1 = require("../../../mina-signer/src/signature.js");
class ZkappFeePayment {
    constructor(descr) {
        this.__type = 'ZkappCommand';
        this.publicKey = descr.publicKey;
        this.fee = descr.fee;
        this.validUntil = descr.validUntil;
        this.nonce = descr.nonce;
    }
    authorize({ networkId, privateKey, fullTransactionCommitment, }) {
        let signature = (0, signature_js_1.signFieldElement)(fullTransactionCommitment, privateKey.toBigInt(), networkId);
        return new AuthorizedZkappFeePayment(this, signature_js_1.Signature.toBase58(signature));
    }
    toAccountUpdate() {
        return new account_update_js_1.AccountUpdate('GenericState', account_update_js_1.GenericData, account_update_js_1.GenericData, {
            authorizationKind: authorization_js_1.AccountUpdateAuthorizationKind.Signature(),
            verificationKeyHash: new field_js_1.Field(constants_js_1.mocks.dummyVerificationKeyHash),
            callData: new field_js_1.Field(0),
            accountId: new account_js_1.AccountId(this.publicKey, core_js_1.TokenId.MINA),
            balanceChange: int_js_1.Int64.create(this.fee, int_js_1.Sign.minusOne),
            incrementNonce: new bool_js_1.Bool(true),
            useFullCommitment: new bool_js_1.Bool(true),
            implicitAccountCreationFee: new bool_js_1.Bool(true),
            preconditions: {
                account: {
                    nonce: this.nonce,
                },
                network: {
                    globalSlotSinceGenesis: preconditions_js_1.Precondition.InRange.betweenInclusive(int_js_1.UInt32.zero, this.validUntil ?? int_js_1.UInt32.MAXINT()),
                },
            },
        });
    }
    toDummyAuthorizedAccountUpdate() {
        return new account_update_js_1.Authorized({ signature: '', proof: null }, this.toAccountUpdate());
    }
    toInternalRepr() {
        return {
            publicKey: this.publicKey,
            fee: this.fee,
            validUntil: this.validUntil,
            nonce: this.nonce,
        };
    }
    toJSON() {
        return ZkappFeePayment.toJSON(this);
    }
    static toJSON(x) {
        return BindingsLayout.FeePayerBody.toJSON(x.toInternalRepr());
    }
}
exports.ZkappFeePayment = ZkappFeePayment;
class AuthorizedZkappFeePayment {
    constructor(body, signature) {
        this.body = body;
        this.signature = signature;
    }
    toInternalRepr() {
        return {
            body: this.body.toInternalRepr(),
            authorization: this.signature,
        };
    }
}
class ZkappCommand {
    constructor(descr) {
        // TODO: put this on everything (in this case, we really need it to disambiguate the Description format)
        this.__type = 'ZkappCommand';
        this.feePayment = descr.feePayment;
        this.accountUpdateForest = descr.accountUpdates.map((update) => update instanceof account_update_js_1.AccountUpdateTree ? update : new account_update_js_1.AccountUpdateTree(update, []));
        // TODO: we probably want an explicit memo type instead to help enforce these rules early and not surprise the user when their memo changes slightly later
        this.memo = memo_js_1.Memo.fromString(descr.memo ?? '');
    }
    commitments(networkId) {
        const feePayerCommitment = this.feePayment.toDummyAuthorizedAccountUpdate().hash(networkId);
        const accountUpdateForestCommitment = account_update_js_1.AccountUpdateTree.hashForest(networkId, this.accountUpdateForest);
        const memoCommitment = memo_js_1.Memo.hash(this.memo);
        const fullTransactionCommitment = (0, poseidon_bigint_js_1.hashWithPrefix)(poseidon_bigint_js_1.prefixes.accountUpdateCons, [
            memoCommitment,
            feePayerCommitment.toBigInt(),
            accountUpdateForestCommitment,
        ]);
        return { accountUpdateForestCommitment, fullTransactionCommitment };
    }
    async authorize(authEnv) {
        const feePayerPrivateKey = await authEnv.getPrivateKey(this.feePayment.publicKey);
        const commitments = this.commitments(authEnv.networkId);
        const authorizedFeePayment = this.feePayment.authorize({
            networkId: authEnv.networkId,
            privateKey: feePayerPrivateKey,
            fullTransactionCommitment: commitments.fullTransactionCommitment,
        });
        const accountUpdateAuthEnv = {
            ...authEnv,
            ...commitments,
        };
        const authorizedAccountUpdateForest = await account_update_js_1.AccountUpdateTree.mapForest(this.accountUpdateForest, (accountUpdate) => accountUpdate.authorize(accountUpdateAuthEnv));
        return new AuthorizedZkappCommand({
            feePayment: authorizedFeePayment,
            accountUpdateForest: authorizedAccountUpdateForest,
            memo: this.memo,
        });
    }
}
exports.ZkappCommand = ZkappCommand;
class AuthorizedZkappCommand {
    constructor({ feePayment, accountUpdateForest, memo, }) {
        this.__type = 'AuthorizedZkappCommand';
        this.feePayment = feePayment;
        this.accountUpdateForest = accountUpdateForest;
        // TODO: here we have to assume the Memo is already encoded correctly, but what we really want is a Memo type...
        this.memo = memo;
    }
    toInternalRepr() {
        return {
            feePayer: this.feePayment.toInternalRepr(),
            accountUpdates: account_update_js_1.AccountUpdateTree.unrollForest(this.accountUpdateForest, (update, depth) => update.toInternalRepr(depth)),
            memo: memo_js_1.Memo.toBase58(this.memo),
        };
    }
    toJSON() {
        return AuthorizedZkappCommand.toJSON(this);
    }
    static toJSON(x) {
        return BindingsLayout.ZkappCommand.toJSON(x.toInternalRepr());
    }
}
exports.AuthorizedZkappCommand = AuthorizedZkappCommand;
// NB: this is really more of an environment than a context, but this naming convention helps to
//     disambiguate the transaction environment from the mina program environment
class ZkappCommandContext {
    constructor(ledger, chain, failedAccounts, globalSlot) {
        this.ledger = ledger;
        this.chain = chain;
        this.failedAccounts = failedAccounts;
        this.globalSlot = globalSlot;
        this.feeExcessState = { status: 'Alive', value: int_js_1.Int64.zero };
        this.accountUpdateForest = [];
        this.accountUpdateForestTrace = [];
    }
    add(x) {
        const callSite = (0, errors_js_1.getCallerFrame)();
        const accountUpdateTree = x instanceof account_update_js_1.AccountUpdateTree ? x : new account_update_js_1.AccountUpdateTree(x, []);
        const genericAccountUpdateTree = account_update_js_1.AccountUpdateTree.mapRoot(accountUpdateTree, (accountUpdate) => accountUpdate.toGeneric());
        const trace = account_update_js_1.AccountUpdateTree.reduce(genericAccountUpdateTree, (accountUpdate, childTraces) => {
            let errors;
            if (!this.failedAccounts.has(accountUpdate.accountId)) {
                const account = this.ledger.getAccount(accountUpdate.accountId) ??
                    account_js_1.Account.empty(accountUpdate.accountId);
                const applied = (0, zkapp_logic_js_1.checkAndApplyAccountUpdate)(this.chain, account, accountUpdate, this.feeExcessState);
                switch (applied.status) {
                    case 'Applied':
                        errors = [];
                        this.ledger.setAccount(applied.updatedAccount);
                        this.feeExcessState = applied.updatedFeeExcessState;
                        break;
                    case 'Failed':
                        errors = applied.errors;
                        break;
                }
            }
            else {
                errors = [
                    // TODO: this should be a warning
                    new Error('skipping account update because a previous account update failed when accessing the same account'),
                ];
            }
            return {
                accountId: accountUpdate.accountId,
                callSite,
                errors,
                childTraces,
            };
        });
        this.accountUpdateForest.push(genericAccountUpdateTree);
        this.accountUpdateForestTrace.push(trace);
    }
    // only to be used when an account update tree has already been applied to the ledger view
    unsafeAddWithoutApplying(x, trace) {
        const accountUpdateTree = x instanceof account_update_js_1.AccountUpdateTree ? x : new account_update_js_1.AccountUpdateTree(x, []);
        const genericAccountUpdateTree = account_update_js_1.AccountUpdateTree.mapRoot(accountUpdateTree, (accountUpdate) => accountUpdate.toGeneric());
        this.accountUpdateForest.push(genericAccountUpdateTree);
        // TODO: check that the trace shape matches the account update shape
        this.accountUpdateForestTrace.push(trace);
    }
    finalize() {
        const errors = [];
        if (this.feeExcessState.status === 'Dead') {
            errors.push(new Error('fee excess could not be computed due to other errors'));
        }
        else if (!this.feeExcessState.value.equals(int_js_1.Int64.zero).toBoolean()) {
            errors.push(new Error('fee excess does not equal 0 (this transaction is attempting to either burn or mint new Mina tokens, which is disallowed)'));
        }
        return {
            accountUpdateForest: [...this.accountUpdateForest],
            accountUpdateForestTrace: [...this.accountUpdateForestTrace],
            generalErrors: errors,
        };
    }
}
exports.ZkappCommandContext = ZkappCommandContext;
// IMPORTANT TODO: Currently, if a zkapp command fails in the virtual application, any successful
//                 account updates are still applied to the provided ledger view. We should
//                 probably make the ledger view interface immutable, or clone it every time we
//                 create a new zkapp command, to help avoid unexpected behavior externally.
async function createUnsignedZkappCommand(ledger, chain, { feePayer, fee, validUntil, }, f) {
    // TODO
    const globalSlot = int_js_1.UInt32.zero;
    const failedAccounts = new account_js_1.AccountIdSet();
    let feePaymentErrors = [];
    let feePayment = null;
    const feePayerId = new account_js_1.AccountId(feePayer, core_js_1.TokenId.MINA);
    const feePayerAccount = ledger.getAccount(feePayerId);
    if (feePayerAccount !== null) {
        feePayment = new ZkappFeePayment({
            publicKey: feePayer,
            nonce: feePayerAccount.nonce,
            fee,
            validUntil,
        });
        const applied = (0, zkapp_logic_js_1.checkAndApplyFeePayment)(chain, feePayerAccount, feePayment);
        switch (applied.status) {
            case 'Applied':
                ledger.setAccount(applied.updatedAccount);
                break;
            case 'Failed':
                feePaymentErrors = applied.errors;
                failedAccounts.add(feePayerAccount.accountId);
                break;
        }
    }
    else {
        feePaymentErrors = [new Error('zkapp fee payer account not found')];
        failedAccounts.add(feePayerId);
    }
    const ctx = new ZkappCommandContext(ledger, chain, failedAccounts, globalSlot);
    await f(ctx);
    const { accountUpdateForest, accountUpdateForestTrace, generalErrors } = ctx.finalize();
    const errorTrace = new errors_js_1.ZkappCommandErrorTrace(generalErrors, feePaymentErrors, accountUpdateForestTrace);
    if (!errorTrace.hasErrors()) {
        // should never be true if we hit this branch
        if (feePayment === null)
            throw new Error('internal error');
        return new ZkappCommand({
            feePayment,
            accountUpdates: accountUpdateForest,
        });
    }
    else {
        console.log(errorTrace.generateReport());
        throw new Error('errors were encountered while creating a ZkappCommand (an error report is available in the logs)');
    }
}
async function createZkappCommand(ledger, chain, authEnv, feePayment, f) {
    const unsignedCmd = await createUnsignedZkappCommand(ledger, chain, feePayment, f);
    return unsignedCmd.authorize(authEnv);
}
exports.createZkappCommand = createZkappCommand;
