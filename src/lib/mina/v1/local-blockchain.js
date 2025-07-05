import { SimpleLedger } from './transaction-logic/ledger.js';
import { Ml } from '../../ml/conversion.js';
import { transactionCommitments } from '../../../mina-signer/src/sign-zkapp-command.js';
import { Ledger, Test, initializeBindings } from '../../../bindings.js';
import { Field } from '../../provable/wrapped.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { PrivateKey, PublicKey } from '../../provable/crypto/signature.js';
import { Account } from './account.js';
import { ZkappCommand, TokenId, Authorization, Actions } from './account-update.js';
import { Types, TypesBigint } from '../../../bindings/mina-transaction/v1/types.js';
import { invalidTransactionError } from './errors.js';
import { createTransaction, toTransactionPromise, createIncludedTransaction, createRejectedTransaction, toPendingTransactionPromise, } from './transaction.js';
import { defaultNetworkConstants, } from './mina-instance.js';
import { reportGetAccountError, defaultNetworkState, verifyTransactionLimits, verifyAccountUpdate, } from './transaction-validation.js';
import { prettifyStacktrace } from '../../util/errors.js';
export { LocalBlockchain, TestPublicKey };
function TestPublicKey(key) {
    return Object.assign(PublicKey.fromPrivateKey(key), { key });
}
(function (TestPublicKey) {
    function random(count = 1) {
        if (count === 1)
            return TestPublicKey(PrivateKey.random());
        return Array.from({ length: count }, () => TestPublicKey(PrivateKey.random()));
    }
    TestPublicKey.random = random;
    function fromBase58(base58) {
        return TestPublicKey(PrivateKey.fromBase58(base58));
    }
    TestPublicKey.fromBase58 = fromBase58;
})(TestPublicKey || (TestPublicKey = {}));
/**
 * A mock Mina blockchain running locally and useful for testing.
 */
async function LocalBlockchain({ proofsEnabled = true, enforceTransactionLimits = true } = {}) {
    await initializeBindings();
    const slotTime = 3 * 60 * 1000;
    const startTime = Date.now();
    const genesisTimestamp = UInt64.from(startTime);
    const ledger = Ledger.create();
    let networkState = defaultNetworkState();
    function addAccount(publicKey, balance) {
        try {
            ledger.addAccount(Ml.fromPublicKey(publicKey), balance);
        }
        catch (error) {
            throw prettifyStacktrace(error);
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
                ...defaultNetworkConstants,
                genesisTimestamp,
            };
        },
        currentSlot() {
            return UInt32.from(Math.ceil((new Date().valueOf() - startTime) / slotTime));
        },
        hasAccount(publicKey, tokenId = TokenId.default) {
            return !!ledger.getAccount(Ml.fromPublicKey(publicKey), Ml.constFromField(tokenId));
        },
        getAccount(publicKey, tokenId = TokenId.default) {
            let accountJson = ledger.getAccount(Ml.fromPublicKey(publicKey), Ml.constFromField(tokenId));
            if (accountJson === undefined) {
                throw new Error(reportGetAccountError(publicKey.toBase58(), TokenId.toBase58(tokenId)));
            }
            return Types.Account.fromJSON(accountJson);
        },
        getNetworkState() {
            return networkState;
        },
        sendTransaction(txn) {
            return toPendingTransactionPromise(async () => {
                let zkappCommandJson = ZkappCommand.toJSON(txn.transaction);
                let commitments = transactionCommitments(TypesBigint.ZkappCommand.fromJSON(zkappCommandJson), this.getNetworkId());
                if (enforceTransactionLimits)
                    verifyTransactionLimits(txn.transaction);
                // create an ad-hoc ledger to record changes to accounts within the transaction
                let simpleLedger = SimpleLedger.create();
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
                        let accountJson = ledger.getAccount(Ml.fromPublicKey(update.body.publicKey), Ml.constFromField(update.body.tokenId));
                        if (accountJson !== undefined) {
                            let storedAccount = Account.fromJSON(accountJson);
                            simpleLedger.store(storedAccount);
                            account = storedAccount;
                        }
                    }
                    // TODO: verify account update even if the account doesn't exist yet, using a default initial account
                    if (account !== undefined) {
                        let publicInput = update.toPublicInput(txn.transaction);
                        await verifyAccountUpdate(account, update, publicInput, commitments, this.proofsEnabled, this.getNetworkId());
                        simpleLedger.apply(update);
                    }
                }
                let status = 'pending';
                const errors = [];
                try {
                    ledger.applyJsonTransaction(JSON.stringify(zkappCommandJson), defaultNetworkConstants.accountCreationFee.toString(), JSON.stringify(networkState));
                }
                catch (err) {
                    status = 'rejected';
                    try {
                        const errorMessages = JSON.parse(err.message);
                        const formattedError = invalidTransactionError(txn.transaction, errorMessages, {
                            accountCreationFee: defaultNetworkConstants.accountCreationFee.toString(),
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
                        ? Field(latestActionState_)
                        : Actions.emptyActionState();
                    actions[addr] ?? (actions[addr] = {});
                    if (p.body.actions.data.length > 0) {
                        let newActionState = Actions.updateSequenceState(latestActionState, p.body.actions.hash);
                        (_b = actions[addr])[tokenId] ?? (_b[tokenId] = []);
                        actions[addr][tokenId].push({
                            actions: pJson.body.actions,
                            hash: newActionState.toString(),
                        });
                    }
                });
                let test = await Test();
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
                        return createRejectedTransaction(pendingTransaction, pendingTransaction.errors);
                    }
                    return createIncludedTransaction(pendingTransaction);
                };
                return {
                    ...pendingTransaction,
                    wait,
                    safeWait,
                };
            });
        },
        transaction(sender, f) {
            return toTransactionPromise(async () => {
                // TODO we run the transaction twice to match the behavior of `Network.transaction`
                let tx = await createTransaction(sender, f, 0, {
                    isFinalRunOutsideCircuit: false,
                    proofsEnabled: this.proofsEnabled,
                    fetchMode: 'test',
                });
                let hasProofs = tx.transaction.accountUpdates.some(Authorization.hasLazyProof);
                return await createTransaction(sender, f, 1, {
                    isFinalRunOutsideCircuit: !hasProofs,
                    proofsEnabled: this.proofsEnabled,
                });
            });
        },
        applyJsonTransaction(json) {
            return ledger.applyJsonTransaction(json, defaultNetworkConstants.accountCreationFee.toString(), JSON.stringify(networkState));
        },
        async fetchEvents(publicKey, tokenId = TokenId.default) {
            // Return events in reverse chronological order (latest events at the beginning)
            const reversedEvents = (events?.[publicKey.toBase58()]?.[TokenId.toBase58(tokenId)] ?? []).reverse();
            return reversedEvents;
        },
        async fetchActions(publicKey, actionStates, tokenId = TokenId.default, _from, _to) {
            return this.getActions(publicKey, actionStates, tokenId);
        },
        getActions(publicKey, actionStates, tokenId = TokenId.default) {
            let currentActions = actions?.[publicKey.toBase58()]?.[TokenId.toBase58(tokenId)] ?? [];
            let { fromActionState, endActionState } = actionStates ?? {};
            let emptyState = Actions.emptyActionState();
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
            networkState.globalSlotSinceGenesis = UInt32.from(slot);
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
// assert type compatibility without preventing LocalBlockchain to return additional properties / methods
LocalBlockchain;
