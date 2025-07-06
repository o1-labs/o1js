"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterGroups = exports.getProofsEnabled = exports.waitForFunding = exports.faucet = exports.getActions = exports.fetchActions = exports.fetchEvents = exports.getNetworkState = exports.getNetworkConstants = exports.getNetworkId = exports.getBalance = exports.hasAccount = exports.getAccount = exports.currentSlot = exports.sender = exports.transaction = exports.setActiveInstance = exports.activeInstance = exports.TestPublicKey = exports.Transaction = exports.currentTransaction = exports.Network = exports.LocalBlockchain = void 0;
const bindings_js_1 = require("../../../bindings.js");
const int_js_1 = require("../../provable/int.js");
const account_update_js_1 = require("./account-update.js");
const Fetch = require("./fetch.js");
const errors_js_1 = require("./errors.js");
const types_js_1 = require("../../../bindings/mina-transaction/v1/types.js");
const transaction_context_js_1 = require("./transaction-context.js");
Object.defineProperty(exports, "currentTransaction", { enumerable: true, get: function () { return transaction_context_js_1.currentTransaction; } });
const mina_instance_js_1 = require("./mina-instance.js");
Object.defineProperty(exports, "activeInstance", { enumerable: true, get: function () { return mina_instance_js_1.activeInstance; } });
Object.defineProperty(exports, "setActiveInstance", { enumerable: true, get: function () { return mina_instance_js_1.setActiveInstance; } });
Object.defineProperty(exports, "currentSlot", { enumerable: true, get: function () { return mina_instance_js_1.currentSlot; } });
Object.defineProperty(exports, "getAccount", { enumerable: true, get: function () { return mina_instance_js_1.getAccount; } });
Object.defineProperty(exports, "hasAccount", { enumerable: true, get: function () { return mina_instance_js_1.hasAccount; } });
Object.defineProperty(exports, "getBalance", { enumerable: true, get: function () { return mina_instance_js_1.getBalance; } });
Object.defineProperty(exports, "getNetworkId", { enumerable: true, get: function () { return mina_instance_js_1.getNetworkId; } });
Object.defineProperty(exports, "getNetworkConstants", { enumerable: true, get: function () { return mina_instance_js_1.getNetworkConstants; } });
Object.defineProperty(exports, "getNetworkState", { enumerable: true, get: function () { return mina_instance_js_1.getNetworkState; } });
Object.defineProperty(exports, "fetchEvents", { enumerable: true, get: function () { return mina_instance_js_1.fetchEvents; } });
Object.defineProperty(exports, "fetchActions", { enumerable: true, get: function () { return mina_instance_js_1.fetchActions; } });
Object.defineProperty(exports, "getActions", { enumerable: true, get: function () { return mina_instance_js_1.getActions; } });
Object.defineProperty(exports, "getProofsEnabled", { enumerable: true, get: function () { return mina_instance_js_1.getProofsEnabled; } });
const transaction_js_1 = require("./transaction.js");
Object.defineProperty(exports, "Transaction", { enumerable: true, get: function () { return transaction_js_1.Transaction; } });
Object.defineProperty(exports, "transaction", { enumerable: true, get: function () { return transaction_js_1.transaction; } });
const transaction_validation_js_1 = require("./transaction-validation.js");
Object.defineProperty(exports, "filterGroups", { enumerable: true, get: function () { return transaction_validation_js_1.filterGroups; } });
const local_blockchain_js_1 = require("./local-blockchain.js");
Object.defineProperty(exports, "LocalBlockchain", { enumerable: true, get: function () { return local_blockchain_js_1.LocalBlockchain; } });
Object.defineProperty(exports, "TestPublicKey", { enumerable: true, get: function () { return local_blockchain_js_1.TestPublicKey; } });
// patch active instance so that we can still create basic transactions without giving Mina network details
(0, mina_instance_js_1.setActiveInstance)({
    ...mina_instance_js_1.activeInstance,
    transaction(sender, f) {
        return (0, transaction_js_1.toTransactionPromise)(() => (0, transaction_js_1.createTransaction)(sender, f, 0));
    },
});
function Network(options) {
    let minaNetworkId = 'devnet';
    let minaGraphqlEndpoint;
    let archiveEndpoint;
    let lightnetAccountManagerEndpoint;
    let enforceTransactionLimits = true;
    if (options && typeof options === 'string') {
        minaGraphqlEndpoint = options;
        Fetch.setGraphqlEndpoint(minaGraphqlEndpoint);
    }
    else if (options && typeof options === 'object') {
        if (options.networkId) {
            minaNetworkId = options.networkId;
        }
        if (!options.mina)
            throw new Error("Network: malformed input. Please provide an object with 'mina' endpoint.");
        if (Array.isArray(options.mina) && options.mina.length !== 0) {
            minaGraphqlEndpoint = options.mina[0];
            Fetch.setGraphqlEndpoint(minaGraphqlEndpoint, options.minaDefaultHeaders);
            Fetch.setMinaGraphqlFallbackEndpoints(options.mina.slice(1));
        }
        else if (typeof options.mina === 'string') {
            minaGraphqlEndpoint = options.mina;
            Fetch.setGraphqlEndpoint(minaGraphqlEndpoint, options.minaDefaultHeaders);
        }
        if (options.archive !== undefined) {
            if (Array.isArray(options.archive) && options.archive.length !== 0) {
                archiveEndpoint = options.archive[0];
                Fetch.setArchiveGraphqlEndpoint(archiveEndpoint, options.archiveDefaultHeaders);
                Fetch.setArchiveGraphqlFallbackEndpoints(options.archive.slice(1));
            }
            else if (typeof options.archive === 'string') {
                archiveEndpoint = options.archive;
                Fetch.setArchiveGraphqlEndpoint(archiveEndpoint, options.archiveDefaultHeaders);
            }
        }
        if (options.lightnetAccountManager !== undefined &&
            typeof options.lightnetAccountManager === 'string') {
            lightnetAccountManagerEndpoint = options.lightnetAccountManager;
            Fetch.setLightnetAccountManagerEndpoint(lightnetAccountManagerEndpoint);
        }
        if (options.bypassTransactionLimits !== undefined &&
            typeof options.bypassTransactionLimits === 'boolean') {
            enforceTransactionLimits = !options.bypassTransactionLimits;
        }
    }
    else {
        throw new Error("Network: malformed input. Please provide a string or an object with 'mina' and 'archive' endpoints.");
    }
    return {
        getNetworkId: () => minaNetworkId,
        getNetworkConstants() {
            if ((0, transaction_context_js_1.currentTransaction)()?.fetchMode === 'test') {
                Fetch.markNetworkToBeFetched(minaGraphqlEndpoint);
                const genesisConstants = Fetch.getCachedGenesisConstants(minaGraphqlEndpoint);
                return genesisConstants !== undefined
                    ? genesisToNetworkConstants(genesisConstants)
                    : mina_instance_js_1.defaultNetworkConstants;
            }
            if (!transaction_context_js_1.currentTransaction.has() || transaction_context_js_1.currentTransaction.get().fetchMode === 'cached') {
                const genesisConstants = Fetch.getCachedGenesisConstants(minaGraphqlEndpoint);
                if (genesisConstants !== undefined)
                    return genesisToNetworkConstants(genesisConstants);
            }
            return mina_instance_js_1.defaultNetworkConstants;
        },
        currentSlot() {
            throw Error('currentSlot() is not implemented yet for remote blockchains.');
        },
        hasAccount(publicKey, tokenId = account_update_js_1.TokenId.default) {
            if (!transaction_context_js_1.currentTransaction.has() || transaction_context_js_1.currentTransaction.get().fetchMode === 'cached') {
                return !!Fetch.getCachedAccount(publicKey, tokenId, minaGraphqlEndpoint);
            }
            return false;
        },
        getAccount(publicKey, tokenId = account_update_js_1.TokenId.default) {
            if ((0, transaction_context_js_1.currentTransaction)()?.fetchMode === 'test') {
                Fetch.markAccountToBeFetched(publicKey, tokenId, minaGraphqlEndpoint);
                let account = Fetch.getCachedAccount(publicKey, tokenId, minaGraphqlEndpoint);
                return account ?? dummyAccount(publicKey);
            }
            if (!transaction_context_js_1.currentTransaction.has() || transaction_context_js_1.currentTransaction.get().fetchMode === 'cached') {
                let account = Fetch.getCachedAccount(publicKey, tokenId, minaGraphqlEndpoint);
                if (account !== undefined)
                    return account;
            }
            throw Error(`${(0, transaction_validation_js_1.reportGetAccountError)(publicKey.toBase58(), account_update_js_1.TokenId.toBase58(tokenId))}\nGraphql endpoint: ${minaGraphqlEndpoint}`);
        },
        getNetworkState() {
            if ((0, transaction_context_js_1.currentTransaction)()?.fetchMode === 'test') {
                Fetch.markNetworkToBeFetched(minaGraphqlEndpoint);
                let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
                return network ?? (0, transaction_validation_js_1.defaultNetworkState)();
            }
            if (!transaction_context_js_1.currentTransaction.has() || transaction_context_js_1.currentTransaction.get().fetchMode === 'cached') {
                let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
                if (network !== undefined)
                    return network;
            }
            throw Error(`getNetworkState: Could not fetch network state from graphql endpoint ${minaGraphqlEndpoint} outside of a transaction.`);
        },
        sendTransaction(txn) {
            return (0, transaction_js_1.toPendingTransactionPromise)(async () => {
                if (enforceTransactionLimits)
                    (0, transaction_validation_js_1.verifyTransactionLimits)(txn.transaction);
                let [response, error] = await Fetch.sendZkapp(txn.toJSON());
                let errors = [];
                if (response === undefined && error !== undefined) {
                    errors = [JSON.stringify(error)];
                }
                else if (response && response.errors && response.errors.length > 0) {
                    response?.errors.forEach((e) => errors.push(JSON.stringify(e)));
                }
                const updatedErrors = (0, errors_js_1.humanizeErrors)(errors);
                const status = errors.length === 0 ? 'pending' : 'rejected';
                let mlTest = await (0, bindings_js_1.Test)();
                const hash = mlTest.transactionHash.hashZkAppCommand(txn.toJSON());
                const pendingTransaction = {
                    status,
                    data: response?.data,
                    errors: updatedErrors,
                    transaction: txn.transaction,
                    setFee: txn.setFee,
                    setFeePerSnarkCost: txn.setFeePerSnarkCost,
                    hash,
                    toJSON: txn.toJSON,
                    toPretty: txn.toPretty,
                };
                const pollTransactionStatus = async (transactionHash, maxAttempts, interval, attempts = 0) => {
                    let res;
                    try {
                        res = await Fetch.checkZkappTransaction(transactionHash);
                        if (res.success) {
                            return (0, transaction_js_1.createIncludedTransaction)(pendingTransaction);
                        }
                        else if (res.failureReason) {
                            const error = (0, errors_js_1.invalidTransactionError)(txn.transaction, res.failureReason, {
                                accountCreationFee: mina_instance_js_1.defaultNetworkConstants.accountCreationFee.toString(),
                            });
                            return (0, transaction_js_1.createRejectedTransaction)(pendingTransaction, [error]);
                        }
                    }
                    catch (error) {
                        return (0, transaction_js_1.createRejectedTransaction)(pendingTransaction, [error.message]);
                    }
                    if (maxAttempts && attempts >= maxAttempts) {
                        return (0, transaction_js_1.createRejectedTransaction)(pendingTransaction, [
                            `Exceeded max attempts.\nTransactionId: ${transactionHash}\nAttempts: ${attempts}\nLast received status: ${res}`,
                        ]);
                    }
                    await new Promise((resolve) => setTimeout(resolve, interval));
                    return pollTransactionStatus(transactionHash, maxAttempts, interval, attempts + 1);
                };
                // default is 45 attempts * 20s each = 15min
                // the block time on berkeley is currently longer than the average 3-4min, so its better to target a higher block time
                // fetching an update every 20s is more than enough with a current block time of 3min
                const poll = async (maxAttempts = 45, interval = 20000) => {
                    return pollTransactionStatus(hash, maxAttempts, interval);
                };
                const wait = async (options) => {
                    const pendingTransaction = await safeWait(options);
                    if (pendingTransaction.status === 'rejected') {
                        throw Error(`Transaction failed with errors:\n${pendingTransaction.errors.join('\n')}`);
                    }
                    return pendingTransaction;
                };
                const safeWait = async (options) => {
                    if (status === 'rejected') {
                        return (0, transaction_js_1.createRejectedTransaction)(pendingTransaction, pendingTransaction.errors);
                    }
                    return await poll(options?.maxAttempts, options?.interval);
                };
                return {
                    ...pendingTransaction,
                    wait,
                    safeWait,
                };
            });
        },
        transaction(sender, f) {
            return (0, transaction_js_1.toTransactionPromise)(async () => {
                // TODO we run the transaction twice to be able to fetch data in between
                let tx = await (0, transaction_js_1.createTransaction)(sender, f, 0, {
                    fetchMode: 'test',
                    isFinalRunOutsideCircuit: false,
                });
                await Fetch.fetchMissingData(minaGraphqlEndpoint, archiveEndpoint);
                let hasProofs = tx.transaction.accountUpdates.some(account_update_js_1.Authorization.hasLazyProof);
                return await (0, transaction_js_1.createTransaction)(sender, f, 1, {
                    fetchMode: 'cached',
                    isFinalRunOutsideCircuit: !hasProofs,
                });
            });
        },
        async fetchEvents(publicKey, tokenId = account_update_js_1.TokenId.default, filterOptions = {}, headers) {
            const pubKey = publicKey.toBase58();
            const token = account_update_js_1.TokenId.toBase58(tokenId);
            const from = filterOptions.from ? Number(filterOptions.from.toString()) : undefined;
            const to = filterOptions.to ? Number(filterOptions.to.toString()) : undefined;
            return Fetch.fetchEvents({ publicKey: pubKey, tokenId: token, from, to }, archiveEndpoint, headers);
        },
        async fetchActions(publicKey, actionStates, tokenId = account_update_js_1.TokenId.default, from, to, headers) {
            const pubKey = publicKey.toBase58();
            const token = account_update_js_1.TokenId.toBase58(tokenId);
            const { fromActionState, endActionState } = actionStates ?? {};
            const fromActionStateBase58 = fromActionState ? fromActionState.toString() : undefined;
            const endActionStateBase58 = endActionState ? endActionState.toString() : undefined;
            return Fetch.fetchActions({
                publicKey: pubKey,
                actionStates: {
                    fromActionState: fromActionStateBase58,
                    endActionState: endActionStateBase58,
                },
                from,
                to,
                tokenId: token,
            }, archiveEndpoint, headers);
        },
        getActions(publicKey, actionStates, tokenId = account_update_js_1.TokenId.default) {
            if ((0, transaction_context_js_1.currentTransaction)()?.fetchMode === 'test') {
                Fetch.markActionsToBeFetched(publicKey, tokenId, archiveEndpoint, actionStates);
                let actions = Fetch.getCachedActions(publicKey, tokenId);
                return actions ?? [];
            }
            if (!transaction_context_js_1.currentTransaction.has() || transaction_context_js_1.currentTransaction.get().fetchMode === 'cached') {
                let actions = Fetch.getCachedActions(publicKey, tokenId);
                if (actions !== undefined)
                    return actions;
            }
            throw Error(`getActions: Could not find actions for the public key ${publicKey.toBase58()}`);
        },
        proofsEnabled: true,
    };
}
exports.Network = Network;
/**
 * Returns the public key of the current transaction's sender account.
 *
 * Throws an error if not inside a transaction, or the sender wasn't passed in.
 */
function sender() {
    let tx = (0, transaction_context_js_1.currentTransaction)();
    if (tx === undefined)
        throw Error(`The sender is not available outside a transaction. Make sure you only use it within \`Mina.transaction\` blocks or smart contract methods.`);
    let sender = (0, transaction_context_js_1.currentTransaction)()?.sender;
    if (sender === undefined)
        throw Error(`The sender is not available, because the transaction block was created without the optional \`sender\` argument.
Here's an example for how to pass in the sender and make it available:

Mina.transaction(sender, // <-- pass in sender's public key here
() => {
  // methods can use this.sender
});
`);
    return sender;
}
exports.sender = sender;
function dummyAccount(pubkey) {
    let dummy = types_js_1.Types.Account.empty();
    if (pubkey)
        dummy.publicKey = pubkey;
    return dummy;
}
async function waitForFunding(address, headers) {
    let attempts = 0;
    let maxAttempts = 30;
    let interval = 30000;
    const executePoll = async (resolve, reject) => {
        let { account } = await Fetch.fetchAccount({ publicKey: address }, undefined, { headers });
        attempts++;
        if (account) {
            return resolve();
        }
        else if (maxAttempts && attempts === maxAttempts) {
            return reject(new Error(`Exceeded max attempts`));
        }
        else {
            setTimeout(executePoll, interval, resolve, reject);
        }
    };
    return new Promise(executePoll);
}
exports.waitForFunding = waitForFunding;
/**
 * Requests the [testnet faucet](https://faucet.minaprotocol.com/api/v1/faucet) to fund a public key.
 */
async function faucet(pub, network = 'devnet', headers) {
    let address = pub.toBase58();
    let response = await fetch('https://faucet.minaprotocol.com/api/v1/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            network,
            address: address,
        }),
    });
    response = await response.json();
    if (response.status.toString() !== 'success') {
        throw new Error(`Error funding account ${address}, got response status: ${response.status}, text: ${response.statusText}`);
    }
    await waitForFunding(address, headers);
}
exports.faucet = faucet;
function genesisToNetworkConstants(genesisConstants) {
    return {
        genesisTimestamp: int_js_1.UInt64.from(Date.parse(genesisConstants.genesisTimestamp)),
        slotTime: int_js_1.UInt64.from(genesisConstants.slotDuration),
        accountCreationFee: int_js_1.UInt64.from(genesisConstants.accountCreationFee),
    };
}
