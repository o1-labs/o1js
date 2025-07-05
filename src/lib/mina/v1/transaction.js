import { ZkappCommand, AccountUpdate, AccountUpdateLayout, addMissingSignatures, TokenId, addMissingProofs, } from './account-update.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { currentTransaction } from './transaction-context.js';
import { Provable } from '../../provable/provable.js';
import { assertPreconditionInvariants } from './precondition.js';
import { activeInstance } from './mina-instance.js';
import * as Fetch from './fetch.js';
import { sendZkappQuery } from './graphql.js';
import { assertPromise } from '../../util/assert.js';
import { getTotalTimeRequired } from './transaction-validation.js';
export { Transaction, createTransaction, toTransactionPromise, toPendingTransactionPromise, sendTransaction, newTransaction, getAccount, transaction, createRejectedTransaction, createIncludedTransaction, };
var Transaction;
(function (Transaction) {
    function fromJSON(json) {
        let transaction = ZkappCommand.fromJSON(json);
        return newTransaction(transaction, activeInstance.proofsEnabled);
    }
    Transaction.fromJSON = fromJSON;
})(Transaction || (Transaction = {}));
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
function toPendingTransactionPromise(getPromise) {
    const pending = getPromise().then();
    return Object.assign(pending, {
        wait(...args) {
            return pending.then((v) => v.wait(...args));
        },
    });
}
async function createTransaction(feePayer, f, numberOfRuns, { fetchMode = 'cached', isFinalRunOutsideCircuit = true, proofsEnabled = true } = {}) {
    if (currentTransaction.has()) {
        throw new Error('Cannot start new transaction within another transaction');
    }
    let feePayerSpec;
    if (feePayer === undefined) {
        feePayerSpec = {};
    }
    else if (feePayer instanceof PublicKey) {
        feePayerSpec = { sender: feePayer };
    }
    else {
        feePayerSpec = feePayer;
    }
    let { sender, fee, memo = '', nonce } = feePayerSpec;
    let transactionId = currentTransaction.enter({
        sender,
        layout: new AccountUpdateLayout(),
        fetchMode,
        isFinalRunOutsideCircuit,
        numberOfRuns,
    });
    // run circuit
    try {
        if (fetchMode === 'test') {
            await Provable.runUnchecked(async () => {
                await assertPromise(f());
                Provable.asProver(() => {
                    let tx = currentTransaction.get();
                    tx.layout.toConstantInPlace();
                });
            });
        }
        else {
            await assertPromise(f());
        }
    }
    catch (err) {
        currentTransaction.leave(transactionId);
        throw err;
    }
    let accountUpdates = currentTransaction.get().layout.toFlatList({ mutate: true });
    try {
        // check that on-chain values weren't used without setting a precondition
        for (let accountUpdate of accountUpdates) {
            assertPreconditionInvariants(accountUpdate);
        }
    }
    catch (err) {
        currentTransaction.leave(transactionId);
        throw err;
    }
    let feePayerAccountUpdate;
    if (sender !== undefined) {
        // if senderKey is provided, fetch account to get nonce and mark to be signed
        let nonce_;
        let senderAccount = getAccount(sender, TokenId.default);
        if (nonce === undefined) {
            nonce_ = senderAccount.nonce;
        }
        else {
            nonce_ = UInt32.from(nonce);
            senderAccount.nonce = nonce_;
            Fetch.addCachedAccount(senderAccount);
        }
        feePayerAccountUpdate = AccountUpdate.defaultFeePayer(sender, nonce_);
        if (fee !== undefined) {
            feePayerAccountUpdate.body.fee = fee instanceof UInt64 ? fee : UInt64.from(String(fee));
        }
    }
    else {
        // otherwise use a dummy fee payer that has to be filled in later
        feePayerAccountUpdate = AccountUpdate.dummyFeePayer();
    }
    let transaction = {
        accountUpdates,
        feePayer: feePayerAccountUpdate,
        memo,
    };
    currentTransaction.leave(transactionId);
    return newTransaction(transaction, proofsEnabled);
}
function newTransaction(transaction, proofsEnabled) {
    let self = {
        transaction,
        sign(privateKeys) {
            self.transaction = addMissingSignatures(self.transaction, privateKeys);
            return self;
        },
        prove() {
            return toTransactionPromise(async () => {
                let { zkappCommand, proofs } = await addMissingProofs(self.transaction, {
                    proofsEnabled,
                });
                self.transaction = zkappCommand;
                return Object.assign(self, {
                    proofs,
                });
            });
        },
        toJSON() {
            let json = ZkappCommand.toJSON(self.transaction);
            return JSON.stringify(json);
        },
        toPretty() {
            return ZkappCommand.toPretty(self.transaction);
        },
        toGraphqlQuery() {
            return sendZkappQuery(self.toJSON());
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
            let { totalTimeRequired } = getTotalTimeRequired(transaction.accountUpdates);
            return this.setFee(new UInt64(Math.round(totalTimeRequired * newFeePerSnarkCost)));
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
    return activeInstance.transaction(sender, f);
}
// TODO: should we instead constrain to `Transaction<true, true>`?
async function sendTransaction(txn) {
    return await activeInstance.sendTransaction(txn);
}
/**
 * @return The account data associated to the given public key.
 */
function getAccount(publicKey, tokenId) {
    return activeInstance.getAccount(publicKey, tokenId);
}
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
