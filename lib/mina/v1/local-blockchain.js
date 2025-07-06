"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPublicKey = exports.LocalBlockchain = void 0;
const ledger_js_1 = require("./transaction-logic/ledger.js");
const conversion_js_1 = require("../../ml/conversion.js");
const sign_zkapp_command_js_1 = require("../../../mina-signer/src/sign-zkapp-command.js");
const bindings_js_1 = require("../../../bindings.js");
const wrapped_js_1 = require("../../provable/wrapped.js");
const int_js_1 = require("../../provable/int.js");
const signature_js_1 = require("../../provable/crypto/signature.js");
const account_js_1 = require("./account.js");
const account_update_js_1 = require("./account-update.js");
const types_js_1 = require("../../../bindings/mina-transaction/v1/types.js");
const errors_js_1 = require("./errors.js");
const transaction_js_1 = require("./transaction.js");
const mina_instance_js_1 = require("./mina-instance.js");
const transaction_validation_js_1 = require("./transaction-validation.js");
const errors_js_2 = require("../../util/errors.js");
function TestPublicKey(key) {
    return Object.assign(signature_js_1.PublicKey.fromPrivateKey(key), { key });
}
exports.TestPublicKey = TestPublicKey;
(function (TestPublicKey) {
    function random(count = 1) {
        if (count === 1)
            return TestPublicKey(signature_js_1.PrivateKey.random());
        return Array.from({ length: count }, () => TestPublicKey(signature_js_1.PrivateKey.random()));
    }
    TestPublicKey.random = random;
    function fromBase58(base58) {
        return TestPublicKey(signature_js_1.PrivateKey.fromBase58(base58));
    }
    TestPublicKey.fromBase58 = fromBase58;
})(TestPublicKey || (exports.TestPublicKey = TestPublicKey = {}));
/**
 * A mock Mina blockchain running locally and useful for testing.
 */
async function LocalBlockchain({ proofsEnabled = true, enforceTransactionLimits = true } = {}) {
    await (0, bindings_js_1.initializeBindings)();
    const slotTime = 3 * 60 * 1000;
    const startTime = Date.now();
    const genesisTimestamp = int_js_1.UInt64.from(startTime);
    const ledger = bindings_js_1.Ledger.create();
    let networkState = (0, transaction_validation_js_1.defaultNetworkState)();
    function addAccount(publicKey, balance) {
        try {
            ledger.addAccount(conversion_js_1.Ml.fromPublicKey(publicKey), balance);
        }
        catch (error) {
            throw (0, errors_js_2.prettifyStacktrace)(error);
        }
    }
    let testAccounts = [];
    for (let i = 0; i < 10; ++i) {
        let MINA = 10n ** 9n;
        const largeValue = 1000n * MINA;
        const testAccount = TestPublicKey.random();
        addAccount(testAccount, largeValue.toString());
        testAccounts.push(testAccount);
    }
    const events = {};
    const actions = {};
    const originalProofsEnabled = proofsEnabled;
    return {
        getNetworkId: () => 'devnet',
        proofsEnabled,
        getNetworkConstants() {
            return {
                ...mina_instance_js_1.defaultNetworkConstants,
                genesisTimestamp,
            };
        },
        currentSlot() {
            return int_js_1.UInt32.from(Math.ceil((new Date().valueOf() - startTime) / slotTime));
        },
        hasAccount(publicKey, tokenId = account_update_js_1.TokenId.default) {
            return !!ledger.getAccount(conversion_js_1.Ml.fromPublicKey(publicKey), conversion_js_1.Ml.constFromField(tokenId));
        },
        getAccount(publicKey, tokenId = account_update_js_1.TokenId.default) {
            let accountJson = ledger.getAccount(conversion_js_1.Ml.fromPublicKey(publicKey), conversion_js_1.Ml.constFromField(tokenId));
            if (accountJson === undefined) {
                throw new Error((0, transaction_validation_js_1.reportGetAccountError)(publicKey.toBase58(), account_update_js_1.TokenId.toBase58(tokenId)));
            }
            return types_js_1.Types.Account.fromJSON(accountJson);
        },
        getNetworkState() {
            return networkState;
        },
        sendTransaction(txn) {
            return (0, transaction_js_1.toPendingTransactionPromise)(async () => {
                let zkappCommandJson = account_update_js_1.ZkappCommand.toJSON(txn.transaction);
                let commitments = (0, sign_zkapp_command_js_1.transactionCommitments)(types_js_1.TypesBigint.ZkappCommand.fromJSON(zkappCommandJson), this.getNetworkId());
                if (enforceTransactionLimits)
                    (0, transaction_validation_js_1.verifyTransactionLimits)(txn.transaction);
                // create an ad-hoc ledger to record changes to accounts within the transaction
                let simpleLedger = ledger_js_1.SimpleLedger.create();
                for (const update of txn.transaction.accountUpdates) {
                    let authIsProof = !!update.authorization.proof;
                    let kindIsProof = update.body.authorizationKind.isProved.toBoolean();
                    // checks and edge case where a proof is expected, but the developer forgot to invoke await tx.prove()
                    // this resulted in an assertion OCaml error, which didn't contain any useful information
                    if (kindIsProof && !authIsProof) {
                        throw Error(`The actual authorization does not match the expected authorization kind. Did you forget to invoke \`await tx.prove();\`?`);
                    }
                    let account = simpleLedger.load(update.body);
                    // the first time we encounter an account, use it from the persistent ledger
                    if (account === undefined) {
                        let accountJson = ledger.getAccount(conversion_js_1.Ml.fromPublicKey(update.body.publicKey), conversion_js_1.Ml.constFromField(update.body.tokenId));
                        if (accountJson !== undefined) {
                            let storedAccount = account_js_1.Account.fromJSON(accountJson);
                            simpleLedger.store(storedAccount);
                            account = storedAccount;
                        }
                    }
                    // TODO: verify account update even if the account doesn't exist yet, using a default initial account
                    if (account !== undefined) {
                        let publicInput = update.toPublicInput(txn.transaction);
                        await (0, transaction_validation_js_1.verifyAccountUpdate)(account, update, publicInput, commitments, this.proofsEnabled, this.getNetworkId());
                        simpleLedger.apply(update);
                    }
                }
                let status = 'pending';
                const errors = [];
                try {
                    ledger.applyJsonTransaction(JSON.stringify(zkappCommandJson), mina_instance_js_1.defaultNetworkConstants.accountCreationFee.toString(), JSON.stringify(networkState));
                }
                catch (err) {
                    status = 'rejected';
                    try {
                        const errorMessages = JSON.parse(err.message);
                        const formattedError = (0, errors_js_1.invalidTransactionError)(txn.transaction, errorMessages, {
                            accountCreationFee: mina_instance_js_1.defaultNetworkConstants.accountCreationFee.toString(),
                        });
                        errors.push(formattedError);
                    }
                    catch (parseError) {
                        const fallbackErrorMessage = err.message || parseError.message || 'Unknown error occurred';
                        errors.push(fallbackErrorMessage);
                    }
                }
                // fetches all events from the transaction and stores them
                // events are identified and associated with a publicKey and tokenId
                txn.transaction.accountUpdates.forEach((p, i) => {
                    var _a, _b;
                    let pJson = zkappCommandJson.accountUpdates[i];
                    let addr = pJson.body.publicKey;
                    let tokenId = pJson.body.tokenId;
                    events[addr] ?? (events[addr] = {});
                    if (p.body.events.data.length > 0) {
                        (_a = events[addr])[tokenId] ?? (_a[tokenId] = []);
                        let updatedEvents = p.body.events.data.map((data) => {
                            return {
                                data: data.map((e) => e.toString()),
                                transactionInfo: {
                                    transactionHash: '',
                                    transactionStatus: '',
                                    transactionMemo: '',
                                },
                            };
                        });
                        events[addr][tokenId].push({
                            events: updatedEvents,
                            blockHeight: networkState.blockchainLength,
                            globalSlot: networkState.globalSlotSinceGenesis,
                            // The following fields are fetched from the Mina network. For now, we mock these values out
                            // since networkState does not contain these fields.
                            blockHash: '',
                            parentBlockHash: '',
                            chainStatus: '',
                        });
                    }
                    // actions/sequencing events
                    // most recent action state
                    let storedActions = actions[addr]?.[tokenId];
                    let latestActionState_ = storedActions?.[storedActions.length - 1]?.hash;
                    // if there exists no hash, this means we initialize our latest hash with the empty state
                    let latestActionState = latestActionState_ !== undefined
                        ? (0, wrapped_js_1.Field)(latestActionState_)
                        : account_update_js_1.Actions.emptyActionState();
                    actions[addr] ?? (actions[addr] = {});
                    if (p.body.actions.data.length > 0) {
                        let newActionState = account_update_js_1.Actions.updateSequenceState(latestActionState, p.body.actions.hash);
                        (_b = actions[addr])[tokenId] ?? (_b[tokenId] = []);
                        actions[addr][tokenId].push({
                            actions: pJson.body.actions,
                            hash: newActionState.toString(),
                        });
                    }
                });
                let test = await (0, bindings_js_1.Test)();
                const hash = test.transactionHash.hashZkAppCommand(txn.toJSON());
                const pendingTransaction = {
                    status,
                    errors,
                    transaction: txn.transaction,
                    setFee: txn.setFee,
                    setFeePerSnarkCost: txn.setFeePerSnarkCost,
                    hash,
                    toJSON: txn.toJSON,
                    toPretty: txn.toPretty,
                };
                const wait = async (_options) => {
                    const pendingTransaction = await safeWait(_options);
                    if (pendingTransaction.status === 'rejected') {
                        throw Error(`Transaction failed with errors:\n${pendingTransaction.errors.join('\n')}`);
                    }
                    return pendingTransaction;
                };
                const safeWait = async (_options) => {
                    if (status === 'rejected') {
                        return (0, transaction_js_1.createRejectedTransaction)(pendingTransaction, pendingTransaction.errors);
                    }
                    return (0, transaction_js_1.createIncludedTransaction)(pendingTransaction);
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
                // TODO we run the transaction twice to match the behavior of `Network.transaction`
                let tx = await (0, transaction_js_1.createTransaction)(sender, f, 0, {
                    isFinalRunOutsideCircuit: false,
                    proofsEnabled: this.proofsEnabled,
                    fetchMode: 'test',
                });
                let hasProofs = tx.transaction.accountUpdates.some(account_update_js_1.Authorization.hasLazyProof);
                return await (0, transaction_js_1.createTransaction)(sender, f, 1, {
                    isFinalRunOutsideCircuit: !hasProofs,
                    proofsEnabled: this.proofsEnabled,
                });
            });
        },
        applyJsonTransaction(json) {
            return ledger.applyJsonTransaction(json, mina_instance_js_1.defaultNetworkConstants.accountCreationFee.toString(), JSON.stringify(networkState));
        },
        async fetchEvents(publicKey, tokenId = account_update_js_1.TokenId.default) {
            // Return events in reverse chronological order (latest events at the beginning)
            const reversedEvents = (events?.[publicKey.toBase58()]?.[account_update_js_1.TokenId.toBase58(tokenId)] ?? []).reverse();
            return reversedEvents;
        },
        async fetchActions(publicKey, actionStates, tokenId = account_update_js_1.TokenId.default, _from, _to) {
            return this.getActions(publicKey, actionStates, tokenId);
        },
        getActions(publicKey, actionStates, tokenId = account_update_js_1.TokenId.default) {
            let currentActions = actions?.[publicKey.toBase58()]?.[account_update_js_1.TokenId.toBase58(tokenId)] ?? [];
            let { fromActionState, endActionState } = actionStates ?? {};
            let emptyState = account_update_js_1.Actions.emptyActionState();
            if (endActionState?.equals(emptyState).toBoolean())
                return [];
            let start = fromActionState?.equals(emptyState).toBoolean()
                ? undefined
                : fromActionState?.toString();
            let end = endActionState?.toString();
            let startIndex = 0;
            if (start) {
                let i = currentActions.findIndex((e) => e.hash === start);
                if (i === -1)
                    throw Error(`getActions: fromActionState not found.`);
                startIndex = i + 1;
            }
            let endIndex;
            if (end) {
                let i = currentActions.findIndex((e) => e.hash === end);
                if (i === -1)
                    throw Error(`getActions: endActionState not found.`);
                endIndex = i + 1;
            }
            return currentActions.slice(startIndex, endIndex);
        },
        addAccount,
        /**
         * An array of 10 test accounts that have been pre-filled with
         * 30000000000 units of currency.
         */
        testAccounts,
        setGlobalSlot(slot) {
            networkState.globalSlotSinceGenesis = int_js_1.UInt32.from(slot);
        },
        incrementGlobalSlot(increment) {
            networkState.globalSlotSinceGenesis = networkState.globalSlotSinceGenesis.add(increment);
        },
        setBlockchainLength(height) {
            networkState.blockchainLength = height;
        },
        setTotalCurrency(currency) {
            networkState.totalCurrency = currency;
        },
        setProofsEnabled(newProofsEnabled) {
            this.proofsEnabled = newProofsEnabled;
        },
        resetProofsEnabled() {
            this.proofsEnabled = originalProofsEnabled;
        },
    };
}
exports.LocalBlockchain = LocalBlockchain;
// assert type compatibility without preventing LocalBlockchain to return additional properties / methods
LocalBlockchain;
