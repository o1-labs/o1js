"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncludedTransaction = exports.createRejectedTransaction = exports.transaction = exports.getAccount = exports.newTransaction = exports.sendTransaction = exports.toPendingTransactionPromise = exports.toTransactionPromise = exports.createTransaction = exports.Transaction = void 0;
const account_update_js_1 = require("./account-update.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
const int_js_1 = require("../../provable/int.js");
const transaction_context_js_1 = require("./transaction-context.js");
const provable_js_1 = require("../../provable/provable.js");
const precondition_js_1 = require("./precondition.js");
const mina_instance_js_1 = require("./mina-instance.js");
const Fetch = require("./fetch.js");
const graphql_js_1 = require("./graphql.js");
const assert_js_1 = require("../../util/assert.js");
const transaction_validation_js_1 = require("./transaction-validation.js");
var Transaction;
(function (Transaction) {
    function fromJSON(json) {
        let transaction = account_update_js_1.ZkappCommand.fromJSON(json);
        return newTransaction(transaction, mina_instance_js_1.activeInstance.proofsEnabled);
    }
    Transaction.fromJSON = fromJSON;
})(Transaction || (exports.Transaction = Transaction = {}));
function toTransactionPromise(getPromise) {
    const pending = getPromise().then();
    return Object.assign(pending, {
        sign(...args) {
            return toTransactionPromise(() => pending.then((v) => v.sign(...args)));
        },
        send() {
            return toPendingTransactionPromise(() => pending.then((v) => v.send()));
        },
        prove() {
            return toTransactionPromise(() => pending.then((v) => v.prove()));
        },
        proofs() {
            return pending.then((v) => v.proofs);
        },
    });
}
exports.toTransactionPromise = toTransactionPromise;
function toPendingTransactionPromise(getPromise) {
    const pending = getPromise().then();
    return Object.assign(pending, {
        wait(...args) {
            return pending.then((v) => v.wait(...args));
        },
    });
}
exports.toPendingTransactionPromise = toPendingTransactionPromise;
async function createTransaction(feePayer, f, numberOfRuns, { fetchMode = 'cached', isFinalRunOutsideCircuit = true, proofsEnabled = true } = {}) {
    if (transaction_context_js_1.currentTransaction.has()) {
        throw new Error('Cannot start new transaction within another transaction');
    }
    let feePayerSpec;
    if (feePayer === undefined) {
        feePayerSpec = {};
    }
    else if (feePayer instanceof signature_js_1.PublicKey) {
        feePayerSpec = { sender: feePayer };
    }
    else {
        feePayerSpec = feePayer;
    }
    let { sender, fee, memo = '', nonce } = feePayerSpec;
    let transactionId = transaction_context_js_1.currentTransaction.enter({
        sender,
        layout: new account_update_js_1.AccountUpdateLayout(),
        fetchMode,
        isFinalRunOutsideCircuit,
        numberOfRuns,
    });
    // run circuit
    try {
        if (fetchMode === 'test') {
            await provable_js_1.Provable.runUnchecked(async () => {
                await (0, assert_js_1.assertPromise)(f());
                provable_js_1.Provable.asProver(() => {
                    let tx = transaction_context_js_1.currentTransaction.get();
                    tx.layout.toConstantInPlace();
                });
            });
        }
        else {
            await (0, assert_js_1.assertPromise)(f());
        }
    }
    catch (err) {
        transaction_context_js_1.currentTransaction.leave(transactionId);
        throw err;
    }
    let accountUpdates = transaction_context_js_1.currentTransaction.get().layout.toFlatList({ mutate: true });
    try {
        // check that on-chain values weren't used without setting a precondition
        for (let accountUpdate of accountUpdates) {
            (0, precondition_js_1.assertPreconditionInvariants)(accountUpdate);
        }
    }
    catch (err) {
        transaction_context_js_1.currentTransaction.leave(transactionId);
        throw err;
    }
    let feePayerAccountUpdate;
    if (sender !== undefined) {
        // if senderKey is provided, fetch account to get nonce and mark to be signed
        let nonce_;
        let senderAccount = getAccount(sender, account_update_js_1.TokenId.default);
        if (nonce === undefined) {
            nonce_ = senderAccount.nonce;
        }
        else {
            nonce_ = int_js_1.UInt32.from(nonce);
            senderAccount.nonce = nonce_;
            Fetch.addCachedAccount(senderAccount);
        }
        feePayerAccountUpdate = account_update_js_1.AccountUpdate.defaultFeePayer(sender, nonce_);
        if (fee !== undefined) {
            feePayerAccountUpdate.body.fee = fee instanceof int_js_1.UInt64 ? fee : int_js_1.UInt64.from(String(fee));
        }
    }
    else {
        // otherwise use a dummy fee payer that has to be filled in later
        feePayerAccountUpdate = account_update_js_1.AccountUpdate.dummyFeePayer();
    }
    let transaction = {
        accountUpdates,
        feePayer: feePayerAccountUpdate,
        memo,
    };
    transaction_context_js_1.currentTransaction.leave(transactionId);
    return newTransaction(transaction, proofsEnabled);
}
exports.createTransaction = createTransaction;
function newTransaction(transaction, proofsEnabled) {
    let self = {
        transaction,
        sign(privateKeys) {
            self.transaction = (0, account_update_js_1.addMissingSignatures)(self.transaction, privateKeys);
            return self;
        },
        prove() {
            return toTransactionPromise(async () => {
                let { zkappCommand, proofs } = await (0, account_update_js_1.addMissingProofs)(self.transaction, {
                    proofsEnabled,
                });
                self.transaction = zkappCommand;
                return Object.assign(self, {
                    proofs,
                });
            });
        },
        toJSON() {
            let json = account_update_js_1.ZkappCommand.toJSON(self.transaction);
            return JSON.stringify(json);
        },
        toPretty() {
            return account_update_js_1.ZkappCommand.toPretty(self.transaction);
        },
        toGraphqlQuery() {
            return (0, graphql_js_1.sendZkappQuery)(self.toJSON());
        },
        send() {
            return toPendingTransactionPromise(async () => {
                const pendingTransaction = await sendTransaction(self);
                if (pendingTransaction.errors.length > 0) {
                    throw Error(`Transaction failed with errors:\n- ${pendingTransaction.errors.join('\n- ')}`);
                }
                return pendingTransaction;
            });
        },
        async safeSend() {
            const pendingTransaction = await sendTransaction(self);
            if (pendingTransaction.errors.length > 0) {
                return createRejectedTransaction(pendingTransaction, pendingTransaction.errors);
            }
            return pendingTransaction;
        },
        setFeePerSnarkCost(newFeePerSnarkCost) {
            let { totalTimeRequired } = (0, transaction_validation_js_1.getTotalTimeRequired)(transaction.accountUpdates);
            return this.setFee(new int_js_1.UInt64(Math.round(totalTimeRequired * newFeePerSnarkCost)));
        },
        setFee(newFee) {
            return toTransactionPromise(async () => {
                self = self;
                self.transaction.accountUpdates.forEach((au) => {
                    if (au.body.useFullCommitment.toBoolean()) {
                        au.authorization.signature = undefined;
                        au.lazyAuthorization = { kind: 'lazy-signature' };
                    }
                });
                self.transaction.feePayer.body.fee = newFee;
                self.transaction.feePayer.lazyAuthorization = { kind: 'lazy-signature' };
                return self;
            });
        },
    };
    return self;
}
exports.newTransaction = newTransaction;
function transaction(senderOrF, fOrUndefined) {
    let sender;
    let f;
    if (fOrUndefined !== undefined) {
        sender = senderOrF;
        f = fOrUndefined;
    }
    else {
        sender = undefined;
        f = senderOrF;
    }
    return mina_instance_js_1.activeInstance.transaction(sender, f);
}
exports.transaction = transaction;
// TODO: should we instead constrain to `Transaction<true, true>`?
async function sendTransaction(txn) {
    return await mina_instance_js_1.activeInstance.sendTransaction(txn);
}
exports.sendTransaction = sendTransaction;
/**
 * @return The account data associated to the given public key.
 */
function getAccount(publicKey, tokenId) {
    return mina_instance_js_1.activeInstance.getAccount(publicKey, tokenId);
}
exports.getAccount = getAccount;
function createRejectedTransaction({ transaction, data, toJSON, toPretty, hash }, errors) {
    return {
        status: 'rejected',
        errors,
        transaction,
        toJSON,
        toPretty,
        hash,
        data,
    };
}
exports.createRejectedTransaction = createRejectedTransaction;
function createIncludedTransaction({ transaction, data, toJSON, toPretty, hash, }) {
    return {
        status: 'included',
        transaction,
        toJSON,
        toPretty,
        hash,
        data,
    };
}
exports.createIncludedTransaction = createIncludedTransaction;
