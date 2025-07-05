import { AccountUpdateAuthorizationKind, } from './authorization.js';
import { AccountUpdate, AccountUpdateTree, Authorized, GenericData } from './account-update.js';
import { Account, AccountId, AccountIdSet } from './account.js';
import { TokenId } from './core.js';
import { getCallerFrame, ZkappCommandErrorTrace } from './errors.js';
import { Precondition } from './preconditions.js';
import { checkAndApplyAccountUpdate, checkAndApplyFeePayment } from './zkapp-logic.js';
import { Bool } from '../../provable/bool.js';
import { Field } from '../../provable/field.js';
import { Int64, Sign, UInt32 } from '../../provable/int.js';
import { mocks } from '../../../bindings/crypto/constants.js';
import * as BindingsLayout from '../../../bindings/mina-transaction/gen/v2/js-layout.js';
import { Memo } from '../../../mina-signer/src/memo.js';
import { hashWithPrefix, prefixes } from '../../../mina-signer/src/poseidon-bigint.js';
import { Signature, signFieldElement } from '../../../mina-signer/src/signature.js';
export { ZkappCommand, ZkappFeePayment, ZkappCommandContext, AuthorizedZkappCommand, createZkappCommand, };
class ZkappFeePayment {
    constructor(descr) {
        this.__type = 'ZkappCommand';
        this.publicKey = descr.publicKey;
        this.fee = descr.fee;
        this.validUntil = descr.validUntil;
        this.nonce = descr.nonce;
    }
    authorize({ networkId, privateKey, fullTransactionCommitment, }) {
        let signature = signFieldElement(fullTransactionCommitment, privateKey.toBigInt(), networkId);
        return new AuthorizedZkappFeePayment(this, Signature.toBase58(signature));
    }
    toAccountUpdate() {
        return new AccountUpdate('GenericState', GenericData, GenericData, {
            authorizationKind: AccountUpdateAuthorizationKind.Signature(),
            verificationKeyHash: new Field(mocks.dummyVerificationKeyHash),
            callData: new Field(0),
            accountId: new AccountId(this.publicKey, TokenId.MINA),
            balanceChange: Int64.create(this.fee, Sign.minusOne),
            incrementNonce: new Bool(true),
            useFullCommitment: new Bool(true),
            implicitAccountCreationFee: new Bool(true),
            preconditions: {
                account: {
                    nonce: this.nonce,
                },
                network: {
                    globalSlotSinceGenesis: Precondition.InRange.betweenInclusive(UInt32.zero, this.validUntil ?? UInt32.MAXINT()),
                },
            },
        });
    }
    toDummyAuthorizedAccountUpdate() {
        return new Authorized({ signature: '', proof: null }, this.toAccountUpdate());
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
        this.accountUpdateForest = descr.accountUpdates.map((update) => update instanceof AccountUpdateTree ? update : new AccountUpdateTree(update, []));
        // TODO: we probably want an explicit memo type instead to help enforce these rules early and not surprise the user when their memo changes slightly later
        this.memo = Memo.fromString(descr.memo ?? '');
    }
    commitments(networkId) {
        const feePayerCommitment = this.feePayment.toDummyAuthorizedAccountUpdate().hash(networkId);
        const accountUpdateForestCommitment = AccountUpdateTree.hashForest(networkId, this.accountUpdateForest);
        const memoCommitment = Memo.hash(this.memo);
        const fullTransactionCommitment = hashWithPrefix(prefixes.accountUpdateCons, [
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
        const authorizedAccountUpdateForest = await AccountUpdateTree.mapForest(this.accountUpdateForest, (accountUpdate) => accountUpdate.authorize(accountUpdateAuthEnv));
        return new AuthorizedZkappCommand({
            feePayment: authorizedFeePayment,
            accountUpdateForest: authorizedAccountUpdateForest,
            memo: this.memo,
        });
    }
}
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
            accountUpdates: AccountUpdateTree.unrollForest(this.accountUpdateForest, (update, depth) => update.toInternalRepr(depth)),
            memo: Memo.toBase58(this.memo),
        };
    }
    toJSON() {
        return AuthorizedZkappCommand.toJSON(this);
    }
    static toJSON(x) {
        return BindingsLayout.ZkappCommand.toJSON(x.toInternalRepr());
    }
}
// NB: this is really more of an environment than a context, but this naming convention helps to
//     disambiguate the transaction environment from the mina program environment
class ZkappCommandContext {
    constructor(ledger, chain, failedAccounts, globalSlot) {
        this.ledger = ledger;
        this.chain = chain;
        this.failedAccounts = failedAccounts;
        this.globalSlot = globalSlot;
        this.feeExcessState = { status: 'Alive', value: Int64.zero };
        this.accountUpdateForest = [];
        this.accountUpdateForestTrace = [];
    }
    add(x) {
        const callSite = getCallerFrame();
        const accountUpdateTree = x instanceof AccountUpdateTree ? x : new AccountUpdateTree(x, []);
        const genericAccountUpdateTree = AccountUpdateTree.mapRoot(accountUpdateTree, (accountUpdate) => accountUpdate.toGeneric());
        const trace = AccountUpdateTree.reduce(genericAccountUpdateTree, (accountUpdate, childTraces) => {
            let errors;
            if (!this.failedAccounts.has(accountUpdate.accountId)) {
                const account = this.ledger.getAccount(accountUpdate.accountId) ??
                    Account.empty(accountUpdate.accountId);
                const applied = checkAndApplyAccountUpdate(this.chain, account, accountUpdate, this.feeExcessState);
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
        const accountUpdateTree = x instanceof AccountUpdateTree ? x : new AccountUpdateTree(x, []);
        const genericAccountUpdateTree = AccountUpdateTree.mapRoot(accountUpdateTree, (accountUpdate) => accountUpdate.toGeneric());
        this.accountUpdateForest.push(genericAccountUpdateTree);
        // TODO: check that the trace shape matches the account update shape
        this.accountUpdateForestTrace.push(trace);
    }
    finalize() {
        const errors = [];
        if (this.feeExcessState.status === 'Dead') {
            errors.push(new Error('fee excess could not be computed due to other errors'));
        }
        else if (!this.feeExcessState.value.equals(Int64.zero).toBoolean()) {
            errors.push(new Error('fee excess does not equal 0 (this transaction is attempting to either burn or mint new Mina tokens, which is disallowed)'));
        }
        return {
            accountUpdateForest: [...this.accountUpdateForest],
            accountUpdateForestTrace: [...this.accountUpdateForestTrace],
            generalErrors: errors,
        };
    }
}
// IMPORTANT TODO: Currently, if a zkapp command fails in the virtual application, any successful
//                 account updates are still applied to the provided ledger view. We should
//                 probably make the ledger view interface immutable, or clone it every time we
//                 create a new zkapp command, to help avoid unexpected behavior externally.
async function createUnsignedZkappCommand(ledger, chain, { feePayer, fee, validUntil, }, f) {
    // TODO
    const globalSlot = UInt32.zero;
    const failedAccounts = new AccountIdSet();
    let feePaymentErrors = [];
    let feePayment = null;
    const feePayerId = new AccountId(feePayer, TokenId.MINA);
    const feePayerAccount = ledger.getAccount(feePayerId);
    if (feePayerAccount !== null) {
        feePayment = new ZkappFeePayment({
            publicKey: feePayer,
            nonce: feePayerAccount.nonce,
            fee,
            validUntil,
        });
        const applied = checkAndApplyFeePayment(chain, feePayerAccount, feePayment);
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
    const errorTrace = new ZkappCommandErrorTrace(generalErrors, feePaymentErrors, accountUpdateForestTrace);
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
