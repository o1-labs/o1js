import { Ledger } from '../snarky.js';
import { Field } from './core.js';
import { UInt32, UInt64 } from './int.js';
import { PrivateKey, PublicKey } from './signature.js';
import {
  addMissingProofs,
  addMissingSignatures,
  FeePayerUnsigned,
  ZkappCommand,
  AccountUpdate,
  ZkappPublicInput,
  TokenId,
  CallForest,
  Authorization,
  Actions,
  Events,
  dummySignature,
  AccountUpdateLayout,
} from './account-update.js';
import * as Fetch from './fetch.js';
import { assertPreconditionInvariants, NetworkValue } from './precondition.js';
import { cloneCircuitValue, toConstant } from './circuit-value.js';
import { Empty, JsonProof, Proof, verify } from './proof-system.js';
import { invalidTransactionError } from './mina/errors.js';
import { Types, TypesBigint } from '../bindings/mina-transaction/types.js';
import { Account } from './mina/account.js';
import { TransactionCost, TransactionLimits } from './mina/constants.js';
import { Provable } from './provable.js';
import { prettifyStacktrace } from './errors.js';
import { Ml } from './ml/conversion.js';
import {
  transactionCommitments,
  verifyAccountUpdateSignature,
} from '../mina-signer/src/sign-zkapp-command.js';
import { NetworkId } from '../mina-signer/src/types.js';
import { FetchMode, currentTransaction } from './mina/transaction-context.js';
import {
  activeInstance,
  setActiveInstance,
  Mina,
  defaultNetworkConstants,
  type FeePayerSpec,
  type DeprecatedFeePayerSpec,
  type ActionStates,
  type NetworkConstants,
} from './mina/mina-instance.js';
import { SimpleLedger } from './mina/transaction-logic/ledger.js';
import { assert } from './gadgets/common.js';
import {
  type EventActionFilterOptions,
  type SendZkAppResponse,
  sendZkappQuery,
} from './mina/graphql.js';

export {
  createTransaction,
  BerkeleyQANet,
  Network,
  LocalBlockchain,
  currentTransaction,
  Transaction,
  PendingTransaction,
  IncludedTransaction,
  RejectedTransaction,
  activeInstance,
  setActiveInstance,
  transaction,
  sender,
  currentSlot,
  getAccount,
  hasAccount,
  getBalance,
  getNetworkId,
  getNetworkConstants,
  getNetworkState,
  accountCreationFee,
  sendTransaction,
  fetchEvents,
  fetchActions,
  getActions,
  FeePayerSpec,
  ActionStates,
  faucet,
  waitForFunding,
  getProofsEnabled,
  // for internal testing only
  filterGroups,
  type NetworkConstants,
};

// patch active instance so that we can still create basic transactions without giving Mina network details
setActiveInstance({
  ...activeInstance,
  async transaction(sender: DeprecatedFeePayerSpec, f: () => void) {
    return createTransaction(sender, f, 0);
  },
});

type Transaction = {
  /**
   * Transaction structure used to describe a state transition on the Mina blockchain.
   */
  transaction: ZkappCommand;
  /**
   * Returns a JSON representation of the {@link Transaction}.
   */
  toJSON(): string;
  /**
   * Returns a pretty-printed JSON representation of the {@link Transaction}.
   */
  toPretty(): any;
  /**
   * Returns the GraphQL query for the Mina daemon.
   */
  toGraphqlQuery(): string;
  /**
   * Signs all {@link AccountUpdate}s included in the {@link Transaction} that require a signature.
   *
   * {@link AccountUpdate}s that require a signature can be specified with `{AccountUpdate|SmartContract}.requireSignature()`.
   *
   * @param additionalKeys The list of keys that should be used to sign the {@link Transaction}
   */
  sign(additionalKeys?: PrivateKey[]): Transaction;
  /**
   * Generates proofs for the {@link Transaction}.
   *
   * This can take some time.
   */
  prove(): Promise<(Proof<ZkappPublicInput, Empty> | undefined)[]>;
  /**
   * Sends the {@link Transaction} to the network.
   */
  send(): Promise<PendingTransaction>;

  /**
   * Sends the {@link Transaction} to the network, unlike the standard send(), this function will throw an error if internal errors are detected.
   */
  sendOrThrowIfError(): Promise<PendingTransaction>;
};

type PendingTransaction = Pick<
  Transaction,
  'transaction' | 'toJSON' | 'toPretty'
> & {
  isSuccess: boolean;
  wait(options?: {
    maxAttempts?: number;
    interval?: number;
  }): Promise<IncludedTransaction | RejectedTransaction>;
  waitOrThrowIfError(options?: {
    maxAttempts?: number;
    interval?: number;
  }): Promise<IncludedTransaction | RejectedTransaction>;
  hash(): string;
  data?: SendZkAppResponse;
  errors?: string[];
};

type IncludedTransaction = Pick<
  PendingTransaction,
  'transaction' | 'toJSON' | 'toPretty' | 'hash' | 'data'
> & {
  status: 'included';
};

type RejectedTransaction = Pick<
  PendingTransaction,
  'transaction' | 'toJSON' | 'toPretty' | 'hash' | 'data'
> & {
  status: 'rejected';
  errors: string[];
};

function createIncludedOrRejectedTransaction(
  {
    transaction,
    data,
    toJSON,
    toPretty,
    hash,
  }: Omit<PendingTransaction, 'wait' | 'waitOrThrowIfError'>,
  errors?: string[]
): IncludedTransaction | RejectedTransaction {
  if (errors !== undefined) {
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
  return {
    status: 'included',
    transaction,
    toJSON,
    toPretty,
    hash,
    data,
  };
}

const Transaction = {
  fromJSON(json: Types.Json.ZkappCommand): Transaction {
    let transaction = ZkappCommand.fromJSON(json);
    return newTransaction(transaction, activeInstance.proofsEnabled);
  },
};

function reportGetAccountError(publicKey: string, tokenId: string) {
  if (tokenId === TokenId.toBase58(TokenId.default)) {
    return `getAccount: Could not find account for public key ${publicKey}`;
  } else {
    return `getAccount: Could not find account for public key ${publicKey} with the tokenId ${tokenId}`;
  }
}

function createTransaction(
  feePayer: DeprecatedFeePayerSpec,
  f: () => unknown,
  numberOfRuns: 0 | 1 | undefined,
  {
    fetchMode = 'cached' as FetchMode,
    isFinalRunOutsideCircuit = true,
    proofsEnabled = true,
  } = {}
): Transaction {
  if (currentTransaction.has()) {
    throw new Error('Cannot start new transaction within another transaction');
  }
  let feePayerSpec: {
    sender?: PublicKey;
    feePayerKey?: PrivateKey;
    fee?: number | string | UInt64;
    memo?: string;
    nonce?: number;
  };
  if (feePayer === undefined) {
    feePayerSpec = {};
  } else if (feePayer instanceof PrivateKey) {
    feePayerSpec = { feePayerKey: feePayer, sender: feePayer.toPublicKey() };
  } else if (feePayer instanceof PublicKey) {
    feePayerSpec = { sender: feePayer };
  } else {
    feePayerSpec = feePayer;
    if (feePayerSpec.sender === undefined)
      feePayerSpec.sender = feePayerSpec.feePayerKey?.toPublicKey();
  }
  let { feePayerKey, sender, fee, memo = '', nonce } = feePayerSpec;

  let transactionId = currentTransaction.enter({
    sender,
    layout: new AccountUpdateLayout(),
    fetchMode,
    isFinalRunOutsideCircuit,
    numberOfRuns,
  });

  // run circuit
  // we have this while(true) loop because one of the smart contracts we're calling inside `f` might be calling
  // SmartContract.analyzeMethods, which would be running its methods again inside `Provable.constraintSystem`, which
  // would throw an error when nested inside `Provable.runAndCheck`. So if that happens, we have to run `analyzeMethods` first
  // and retry `Provable.runAndCheck(f)`. Since at this point in the function, we don't know which smart contracts are involved,
  // we created that hack with a `bootstrap()` function that analyzeMethods sticks on the error, to call itself again.
  try {
    let err: any;
    while (true) {
      if (err !== undefined) err.bootstrap();
      try {
        if (fetchMode === 'test') {
          Provable.runUnchecked(() => {
            f();
            Provable.asProver(() => {
              let tx = currentTransaction.get();
              tx.layout.toConstantInPlace();
            });
          });
        } else {
          f();
        }
        break;
      } catch (err_) {
        if ((err_ as any)?.bootstrap) err = err_;
        else throw err_;
      }
    }
  } catch (err) {
    currentTransaction.leave(transactionId);
    throw err;
  }

  let accountUpdates = currentTransaction
    .get()
    .layout.toFlatList({ mutate: true });

  try {
    // check that on-chain values weren't used without setting a precondition
    for (let accountUpdate of accountUpdates) {
      assertPreconditionInvariants(accountUpdate);
    }
  } catch (err) {
    currentTransaction.leave(transactionId);
    throw err;
  }

  let feePayerAccountUpdate: FeePayerUnsigned;
  if (sender !== undefined) {
    // if senderKey is provided, fetch account to get nonce and mark to be signed
    let nonce_;
    let senderAccount = getAccount(sender, TokenId.default);

    if (nonce === undefined) {
      nonce_ = senderAccount.nonce;
    } else {
      nonce_ = UInt32.from(nonce);
      senderAccount.nonce = nonce_;
      Fetch.addCachedAccount(senderAccount);
    }
    feePayerAccountUpdate = AccountUpdate.defaultFeePayer(sender, nonce_);
    if (feePayerKey !== undefined)
      feePayerAccountUpdate.lazyAuthorization!.privateKey = feePayerKey;
    if (fee !== undefined) {
      feePayerAccountUpdate.body.fee =
        fee instanceof UInt64 ? fee : UInt64.from(String(fee));
    }
  } else {
    // otherwise use a dummy fee payer that has to be filled in later
    feePayerAccountUpdate = AccountUpdate.dummyFeePayer();
  }

  let transaction: ZkappCommand = {
    accountUpdates,
    feePayer: feePayerAccountUpdate,
    memo,
  };

  currentTransaction.leave(transactionId);
  return newTransaction(transaction, proofsEnabled);
}

function newTransaction(transaction: ZkappCommand, proofsEnabled?: boolean) {
  let self: Transaction = {
    transaction,
    sign(additionalKeys?: PrivateKey[]) {
      self.transaction = addMissingSignatures(self.transaction, additionalKeys);
      return self;
    },
    async prove() {
      let { zkappCommand, proofs } = await addMissingProofs(self.transaction, {
        proofsEnabled,
      });
      self.transaction = zkappCommand;
      return proofs;
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
    async send() {
      try {
        return await sendTransaction(self);
      } catch (error) {
        throw prettifyStacktrace(error);
      }
    },
    async sendOrThrowIfError() {
      return await sendOrThrowIfError(self);
    },
  };
  return self;
}

/**
 * A mock Mina blockchain running locally and useful for testing.
 */
function LocalBlockchain({
  proofsEnabled = true,
  enforceTransactionLimits = true,
  networkId = 'testnet' as NetworkId,
} = {}) {
  const slotTime = 3 * 60 * 1000;
  const startTime = Date.now();
  const genesisTimestamp = UInt64.from(startTime);
  const ledger = Ledger.create();
  let networkState = defaultNetworkState();
  let minaNetworkId: NetworkId = networkId;

  function addAccount(publicKey: PublicKey, balance: string) {
    ledger.addAccount(Ml.fromPublicKey(publicKey), balance);
  }

  let testAccounts: {
    publicKey: PublicKey;
    privateKey: PrivateKey;
  }[] = [];

  for (let i = 0; i < 10; ++i) {
    let MINA = 10n ** 9n;
    const largeValue = 1000n * MINA;
    const k = PrivateKey.random();
    const pk = k.toPublicKey();
    addAccount(pk, largeValue.toString());
    testAccounts.push({ privateKey: k, publicKey: pk });
  }

  const events: Record<string, any> = {};
  const actions: Record<
    string,
    Record<string, { actions: string[][]; hash: string }[]>
  > = {};

  return {
    getNetworkId: () => minaNetworkId,
    proofsEnabled,
    /**
     * @deprecated use {@link Mina.getNetworkConstants}
     */
    accountCreationFee: () => defaultNetworkConstants.accountCreationFee,
    getNetworkConstants() {
      return {
        ...defaultNetworkConstants,
        genesisTimestamp,
      };
    },
    currentSlot() {
      return UInt32.from(
        Math.ceil((new Date().valueOf() - startTime) / slotTime)
      );
    },
    hasAccount(publicKey: PublicKey, tokenId: Field = TokenId.default) {
      return !!ledger.getAccount(
        Ml.fromPublicKey(publicKey),
        Ml.constFromField(tokenId)
      );
    },
    getAccount(
      publicKey: PublicKey,
      tokenId: Field = TokenId.default
    ): Account {
      let accountJson = ledger.getAccount(
        Ml.fromPublicKey(publicKey),
        Ml.constFromField(tokenId)
      );
      if (accountJson === undefined) {
        throw new Error(
          reportGetAccountError(publicKey.toBase58(), TokenId.toBase58(tokenId))
        );
      }
      return Types.Account.fromJSON(accountJson);
    },
    getNetworkState() {
      return networkState;
    },
    async sendTransaction(txn: Transaction): Promise<PendingTransaction> {
      txn.sign();

      let zkappCommandJson = ZkappCommand.toJSON(txn.transaction);
      let commitments = transactionCommitments(
        TypesBigint.ZkappCommand.fromJSON(zkappCommandJson)
      );

      if (enforceTransactionLimits) verifyTransactionLimits(txn.transaction);

      // create an ad-hoc ledger to record changes to accounts within the transaction
      let simpleLedger = SimpleLedger.create();

      for (const update of txn.transaction.accountUpdates) {
        let authIsProof = !!update.authorization.proof;
        let kindIsProof = update.body.authorizationKind.isProved.toBoolean();
        // checks and edge case where a proof is expected, but the developer forgot to invoke await tx.prove()
        // this resulted in an assertion OCaml error, which didn't contain any useful information
        if (kindIsProof && !authIsProof) {
          throw Error(
            `The actual authorization does not match the expected authorization kind. Did you forget to invoke \`await tx.prove();\`?`
          );
        }

        let account = simpleLedger.load(update.body);

        // the first time we encounter an account, use it from the persistent ledger
        if (account === undefined) {
          let accountJson = ledger.getAccount(
            Ml.fromPublicKey(update.body.publicKey),
            Ml.constFromField(update.body.tokenId)
          );
          if (accountJson !== undefined) {
            let storedAccount = Account.fromJSON(accountJson);
            simpleLedger.store(storedAccount);
            account = storedAccount;
          }
        }

        // TODO: verify account update even if the account doesn't exist yet, using a default initial account
        if (account !== undefined) {
          let publicInput = update.toPublicInput(txn.transaction);
          await verifyAccountUpdate(
            account,
            update,
            publicInput,
            commitments,
            this.proofsEnabled,
            this.getNetworkId()
          );
          simpleLedger.apply(update);
        }
      }

      try {
        ledger.applyJsonTransaction(
          JSON.stringify(zkappCommandJson),
          defaultNetworkConstants.accountCreationFee.toString(),
          JSON.stringify(networkState)
        );
      } catch (err: any) {
        try {
          // reverse errors so they match order of account updates
          // TODO: label updates, and try to give precise explanations about what went wrong
          let errors = JSON.parse(err.message);
          err.message = invalidTransactionError(txn.transaction, errors, {
            accountCreationFee:
              defaultNetworkConstants.accountCreationFee.toString(),
          });
        } finally {
          throw err;
        }
      }

      // fetches all events from the transaction and stores them
      // events are identified and associated with a publicKey and tokenId
      txn.transaction.accountUpdates.forEach((p, i) => {
        let pJson = zkappCommandJson.accountUpdates[i];
        let addr = pJson.body.publicKey;
        let tokenId = pJson.body.tokenId;
        events[addr] ??= {};
        if (p.body.events.data.length > 0) {
          events[addr][tokenId] ??= [];
          let updatedEvents = p.body.events.data.map((data) => {
            return {
              data,
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
        let latestActionState_ =
          storedActions?.[storedActions.length - 1]?.hash;
        // if there exists no hash, this means we initialize our latest hash with the empty state
        let latestActionState =
          latestActionState_ !== undefined
            ? Field(latestActionState_)
            : Actions.emptyActionState();

        actions[addr] ??= {};
        if (p.body.actions.data.length > 0) {
          let newActionState = Actions.updateSequenceState(
            latestActionState,
            p.body.actions.hash
          );
          actions[addr][tokenId] ??= [];
          actions[addr][tokenId].push({
            actions: pJson.body.actions,
            hash: newActionState.toString(),
          });
        }
      });

      const pendingTransaction = {
        isSuccess: true,
        transaction: txn.transaction,
        toJSON: txn.toJSON,
        toPretty: txn.toPretty,
        hash: (): string => {
          const message =
            'Info: Txn Hash retrieving is not supported for LocalBlockchain.';
          console.log(message);
          return message;
        },
      };

      const wait = async (_options?: {
        maxAttempts?: number;
        interval?: number;
      }) => {
        console.log(
          'Info: Waiting for inclusion in a block is not supported for LocalBlockchain.'
        );
        return Promise.resolve(
          createIncludedOrRejectedTransaction(pendingTransaction)
        );
      };

      const waitOrThrowIfError = async (_options?: {
        maxAttempts?: number;
        interval?: number;
      }) => {
        console.log(
          'Info: Waiting for inclusion in a block is not supported for LocalBlockchain.'
        );
        return Promise.resolve(
          createIncludedOrRejectedTransaction(pendingTransaction)
        );
      };

      return {
        ...pendingTransaction,
        wait,
        waitOrThrowIfError,
      };
    },
    async transaction(sender: DeprecatedFeePayerSpec, f: () => void) {
      // bad hack: run transaction just to see whether it creates proofs
      // if it doesn't, this is the last chance to run SmartContract.runOutsideCircuit, which is supposed to run only once
      // TODO: this has obvious holes if multiple zkapps are involved, but not relevant currently because we can't prove with multiple account updates
      // and hopefully with upcoming work by Matt we can just run everything in the prover, and nowhere else
      let tx = createTransaction(sender, f, 0, {
        isFinalRunOutsideCircuit: false,
        proofsEnabled: this.proofsEnabled,
        fetchMode: 'test',
      });
      let hasProofs = tx.transaction.accountUpdates.some(
        Authorization.hasLazyProof
      );
      return createTransaction(sender, f, 1, {
        isFinalRunOutsideCircuit: !hasProofs,
        proofsEnabled: this.proofsEnabled,
      });
    },
    applyJsonTransaction(json: string) {
      return ledger.applyJsonTransaction(
        json,
        defaultNetworkConstants.accountCreationFee.toString(),
        JSON.stringify(networkState)
      );
    },
    async fetchEvents(publicKey: PublicKey, tokenId: Field = TokenId.default) {
      return events?.[publicKey.toBase58()]?.[TokenId.toBase58(tokenId)] ?? [];
    },
    async fetchActions(
      publicKey: PublicKey,
      actionStates?: ActionStates,
      tokenId: Field = TokenId.default
    ) {
      return this.getActions(publicKey, actionStates, tokenId);
    },
    getActions(
      publicKey: PublicKey,
      actionStates?: ActionStates,
      tokenId: Field = TokenId.default
    ): { hash: string; actions: string[][] }[] {
      let currentActions =
        actions?.[publicKey.toBase58()]?.[TokenId.toBase58(tokenId)] ?? [];
      let { fromActionState, endActionState } = actionStates ?? {};

      let emptyState = Actions.emptyActionState();
      if (endActionState?.equals(emptyState).toBoolean()) return [];

      let start = fromActionState?.equals(emptyState).toBoolean()
        ? undefined
        : fromActionState?.toString();
      let end = endActionState?.toString();

      let startIndex = 0;
      if (start) {
        let i = currentActions.findIndex((e) => e.hash === start);
        if (i === -1) throw Error(`getActions: fromActionState not found.`);
        startIndex = i + 1;
      }
      let endIndex: number | undefined;
      if (end) {
        let i = currentActions.findIndex((e) => e.hash === end);
        if (i === -1) throw Error(`getActions: endActionState not found.`);
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
    setGlobalSlot(slot: UInt32 | number) {
      networkState.globalSlotSinceGenesis = UInt32.from(slot);
    },
    incrementGlobalSlot(increment: UInt32 | number) {
      networkState.globalSlotSinceGenesis =
        networkState.globalSlotSinceGenesis.add(increment);
    },
    setBlockchainLength(height: UInt32) {
      networkState.blockchainLength = height;
    },
    setTotalCurrency(currency: UInt64) {
      networkState.totalCurrency = currency;
    },
    setProofsEnabled(newProofsEnabled: boolean) {
      this.proofsEnabled = newProofsEnabled;
    },
  };
}
// assert type compatibility without preventing LocalBlockchain to return additional properties / methods
LocalBlockchain satisfies (...args: any) => Mina;

/**
 * Represents the Mina blockchain running on a real network
 */
function Network(graphqlEndpoint: string): Mina;
function Network(options: {
  networkId?: NetworkId;
  mina: string | string[];
  archive?: string | string[];
  lightnetAccountManager?: string;
}): Mina;
function Network(
  options:
    | {
        networkId?: NetworkId;
        mina: string | string[];
        archive?: string | string[];
        lightnetAccountManager?: string;
      }
    | string
): Mina {
  let minaNetworkId: NetworkId = 'testnet';
  let minaGraphqlEndpoint: string;
  let archiveEndpoint: string;
  let lightnetAccountManagerEndpoint: string;

  if (options && typeof options === 'string') {
    minaGraphqlEndpoint = options;
    Fetch.setGraphqlEndpoint(minaGraphqlEndpoint);
  } else if (options && typeof options === 'object') {
    if (options.networkId) {
      minaNetworkId = options.networkId;
    }
    if (!options.mina)
      throw new Error(
        "Network: malformed input. Please provide an object with 'mina' endpoint."
      );
    if (Array.isArray(options.mina) && options.mina.length !== 0) {
      minaGraphqlEndpoint = options.mina[0];
      Fetch.setGraphqlEndpoint(minaGraphqlEndpoint);
      Fetch.setMinaGraphqlFallbackEndpoints(options.mina.slice(1));
    } else if (typeof options.mina === 'string') {
      minaGraphqlEndpoint = options.mina;
      Fetch.setGraphqlEndpoint(minaGraphqlEndpoint);
    }

    if (options.archive !== undefined) {
      if (Array.isArray(options.archive) && options.archive.length !== 0) {
        archiveEndpoint = options.archive[0];
        Fetch.setArchiveGraphqlEndpoint(archiveEndpoint);
        Fetch.setArchiveGraphqlFallbackEndpoints(options.archive.slice(1));
      } else if (typeof options.archive === 'string') {
        archiveEndpoint = options.archive;
        Fetch.setArchiveGraphqlEndpoint(archiveEndpoint);
      }
    }

    if (
      options.lightnetAccountManager !== undefined &&
      typeof options.lightnetAccountManager === 'string'
    ) {
      lightnetAccountManagerEndpoint = options.lightnetAccountManager;
      Fetch.setLightnetAccountManagerEndpoint(lightnetAccountManagerEndpoint);
    }
  } else {
    throw new Error(
      "Network: malformed input. Please provide a string or an object with 'mina' and 'archive' endpoints."
    );
  }

  return {
    getNetworkId: () => minaNetworkId,
    /**
     * @deprecated use {@link Mina.getNetworkConstants}
     */
    accountCreationFee: () => defaultNetworkConstants.accountCreationFee,
    getNetworkConstants() {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markNetworkToBeFetched(minaGraphqlEndpoint);
        const genesisConstants =
          Fetch.getCachedGenesisConstants(minaGraphqlEndpoint);
        return genesisConstants !== undefined
          ? genesisToNetworkConstants(genesisConstants)
          : defaultNetworkConstants;
      }
      if (
        !currentTransaction.has() ||
        currentTransaction.get().fetchMode === 'cached'
      ) {
        const genesisConstants =
          Fetch.getCachedGenesisConstants(minaGraphqlEndpoint);
        if (genesisConstants !== undefined)
          return genesisToNetworkConstants(genesisConstants);
      }
      return defaultNetworkConstants;
    },
    currentSlot() {
      throw Error(
        'currentSlot() is not implemented yet for remote blockchains.'
      );
    },
    hasAccount(publicKey: PublicKey, tokenId: Field = TokenId.default) {
      if (
        !currentTransaction.has() ||
        currentTransaction.get().fetchMode === 'cached'
      ) {
        return !!Fetch.getCachedAccount(
          publicKey,
          tokenId,
          minaGraphqlEndpoint
        );
      }
      return false;
    },
    getAccount(publicKey: PublicKey, tokenId: Field = TokenId.default) {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markAccountToBeFetched(publicKey, tokenId, minaGraphqlEndpoint);
        let account = Fetch.getCachedAccount(
          publicKey,
          tokenId,
          minaGraphqlEndpoint
        );
        return account ?? dummyAccount(publicKey);
      }
      if (
        !currentTransaction.has() ||
        currentTransaction.get().fetchMode === 'cached'
      ) {
        let account = Fetch.getCachedAccount(
          publicKey,
          tokenId,
          minaGraphqlEndpoint
        );
        if (account !== undefined) return account;
      }
      throw Error(
        `${reportGetAccountError(
          publicKey.toBase58(),
          TokenId.toBase58(tokenId)
        )}\nGraphql endpoint: ${minaGraphqlEndpoint}`
      );
    },
    getNetworkState() {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markNetworkToBeFetched(minaGraphqlEndpoint);
        let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
        return network ?? defaultNetworkState();
      }
      if (
        !currentTransaction.has() ||
        currentTransaction.get().fetchMode === 'cached'
      ) {
        let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
        if (network !== undefined) return network;
      }
      throw Error(
        `getNetworkState: Could not fetch network state from graphql endpoint ${minaGraphqlEndpoint} outside of a transaction.`
      );
    },
    async sendTransaction(txn: Transaction): Promise<PendingTransaction> {
      txn.sign();

      verifyTransactionLimits(txn.transaction);

      let [response, error] = await Fetch.sendZkapp(txn.toJSON());
      let errors: any[] | undefined;
      if (response === undefined && error !== undefined) {
        console.log('Error: Failed to send transaction', error);
        errors = [error];
      } else if (response && response.errors && response.errors.length > 0) {
        console.log(
          'Error: Transaction returned with errors',
          JSON.stringify(response.errors, null, 2)
        );
        errors = response.errors;
      }

      const isSuccess = errors === undefined;
      const pendingTransaction = {
        isSuccess,
        data: response?.data,
        errors,
        transaction: txn.transaction,
        toJSON: txn.toJSON,
        toPretty: txn.toPretty,
        hash() {
          // TODO: compute this
          return response?.data?.sendZkapp?.zkapp?.hash!;
        },
      };

      const pollTransactionStatus = async (
        txId: string,
        maxAttempts: number,
        interval: number,
        attempts: number = 0
      ): Promise<IncludedTransaction | RejectedTransaction> => {
        let res: Awaited<ReturnType<typeof Fetch.checkZkappTransaction>>;
        try {
          res = await Fetch.checkZkappTransaction(txId);
          if (res.success) {
            return createIncludedOrRejectedTransaction(pendingTransaction);
          } else if (res.failureReason) {
            return createIncludedOrRejectedTransaction(pendingTransaction, [
              `Transaction failed.\nTransactionId: ${txId}\nAttempts: ${attempts}\nfailureReason(s): ${res.failureReason}`,
            ]);
          }
        } catch (error) {
          return createIncludedOrRejectedTransaction(pendingTransaction, [
            (error as Error).message,
          ]);
        }

        if (maxAttempts && attempts >= maxAttempts) {
          return createIncludedOrRejectedTransaction(pendingTransaction, [
            `Exceeded max attempts.\nTransactionId: ${txId}\nAttempts: ${attempts}\nLast received status: ${res}`,
          ]);
        }

        await new Promise((resolve) => setTimeout(resolve, interval));
        return pollTransactionStatus(txId, maxAttempts, interval, attempts + 1);
      };

      const wait = async (options?: {
        maxAttempts?: number;
        interval?: number;
      }): Promise<IncludedTransaction | RejectedTransaction> => {
        if (!isSuccess) {
          return createIncludedOrRejectedTransaction(
            pendingTransaction,
            pendingTransaction.errors
          );
        }

        // default is 45 attempts * 20s each = 15min
        // the block time on berkeley is currently longer than the average 3-4min, so its better to target a higher block time
        // fetching an update every 20s is more than enough with a current block time of 3min
        const maxAttempts = options?.maxAttempts ?? 45;
        const interval = options?.interval ?? 20000;
        const txId = response?.data?.sendZkapp?.zkapp?.hash;

        if (!txId) {
          return createIncludedOrRejectedTransaction(
            pendingTransaction,
            pendingTransaction.errors
          );
        }
        return pollTransactionStatus(txId, maxAttempts, interval);
      };

      const waitOrThrowIfError = async (options?: {
        maxAttempts?: number;
        interval?: number;
      }): Promise<IncludedTransaction | RejectedTransaction> => {
        const pendingTransaction = await wait(options);
        if (pendingTransaction.status === 'rejected') {
          throw Error(
            `Transaction failed with errors: ${JSON.stringify(
              pendingTransaction.errors,
              null,
              2
            )}`
          );
        }
        return pendingTransaction;
      };

      return {
        ...pendingTransaction,
        wait,
        waitOrThrowIfError,
      };
    },
    async transaction(sender: DeprecatedFeePayerSpec, f: () => void) {
      let tx = createTransaction(sender, f, 0, {
        fetchMode: 'test',
        isFinalRunOutsideCircuit: false,
      });
      await Fetch.fetchMissingData(minaGraphqlEndpoint, archiveEndpoint);
      let hasProofs = tx.transaction.accountUpdates.some(
        Authorization.hasLazyProof
      );
      return createTransaction(sender, f, 1, {
        fetchMode: 'cached',
        isFinalRunOutsideCircuit: !hasProofs,
      });
    },
    async fetchEvents(
      publicKey: PublicKey,
      tokenId: Field = TokenId.default,
      filterOptions: EventActionFilterOptions = {}
    ) {
      let pubKey = publicKey.toBase58();
      let token = TokenId.toBase58(tokenId);

      return Fetch.fetchEvents(
        { publicKey: pubKey, tokenId: token },
        archiveEndpoint,
        filterOptions
      );
    },
    async fetchActions(
      publicKey: PublicKey,
      actionStates?: ActionStates,
      tokenId: Field = TokenId.default
    ) {
      let pubKey = publicKey.toBase58();
      let token = TokenId.toBase58(tokenId);
      let { fromActionState, endActionState } = actionStates ?? {};
      let fromActionStateBase58 = fromActionState
        ? fromActionState.toString()
        : undefined;
      let endActionStateBase58 = endActionState
        ? endActionState.toString()
        : undefined;

      return Fetch.fetchActions(
        {
          publicKey: pubKey,
          actionStates: {
            fromActionState: fromActionStateBase58,
            endActionState: endActionStateBase58,
          },
          tokenId: token,
        },
        archiveEndpoint
      );
    },
    getActions(
      publicKey: PublicKey,
      actionStates?: ActionStates,
      tokenId: Field = TokenId.default
    ) {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markActionsToBeFetched(
          publicKey,
          tokenId,
          archiveEndpoint,
          actionStates
        );
        let actions = Fetch.getCachedActions(publicKey, tokenId);
        return actions ?? [];
      }
      if (
        !currentTransaction.has() ||
        currentTransaction.get().fetchMode === 'cached'
      ) {
        let actions = Fetch.getCachedActions(publicKey, tokenId);
        if (actions !== undefined) return actions;
      }
      throw Error(
        `getActions: Could not find actions for the public key ${publicKey}`
      );
    },
    proofsEnabled: true,
  };
}

/**
 *
 * @deprecated This is deprecated in favor of {@link Mina.Network}, which is exactly the same function.
 * The name `BerkeleyQANet` was misleading because it suggested that this is specific to a particular network.
 */
function BerkeleyQANet(graphqlEndpoint: string) {
  return Network(graphqlEndpoint);
}

/**
 * Construct a smart contract transaction. Within the callback passed to this function,
 * you can call into the methods of smart contracts.
 *
 * ```
 * let tx = await Mina.transaction(sender, () => {
 *   myZkapp.update();
 *   someOtherZkapp.someOtherMethod();
 * });
 * ```
 *
 * @return A transaction that can subsequently be submitted to the chain.
 */
function transaction(sender: FeePayerSpec, f: () => void): Promise<Transaction>;
function transaction(f: () => void): Promise<Transaction>;
/**
 * @deprecated It's deprecated to pass in the fee payer's private key. Pass in the public key instead.
 * ```
 * // good
 * Mina.transaction(publicKey, ...);
 * Mina.transaction({ sender: publicKey }, ...);
 *
 * // deprecated
 * Mina.transaction(privateKey, ...);
 * Mina.transaction({ feePayerKey: privateKey }, ...);
 * ```
 */
function transaction(
  sender: DeprecatedFeePayerSpec,
  f: () => void
): Promise<Transaction>;
function transaction(
  senderOrF: DeprecatedFeePayerSpec | (() => void),
  fOrUndefined?: () => void
): Promise<Transaction> {
  let sender: DeprecatedFeePayerSpec;
  let f: () => void;
  try {
    if (fOrUndefined !== undefined) {
      sender = senderOrF as DeprecatedFeePayerSpec;
      f = fOrUndefined;
    } else {
      sender = undefined;
      f = senderOrF as () => void;
    }
    return activeInstance.transaction(sender, f);
  } catch (error) {
    throw prettifyStacktrace(error);
  }
}

/**
 * Returns the public key of the current transaction's sender account.
 *
 * Throws an error if not inside a transaction, or the sender wasn't passed in.
 */
function sender() {
  let tx = currentTransaction();
  if (tx === undefined)
    throw Error(
      `The sender is not available outside a transaction. Make sure you only use it within \`Mina.transaction\` blocks or smart contract methods.`
    );
  let sender = currentTransaction()?.sender;
  if (sender === undefined)
    throw Error(
      `The sender is not available, because the transaction block was created without the optional \`sender\` argument.
Here's an example for how to pass in the sender and make it available:

Mina.transaction(sender, // <-- pass in sender's public key here
() => {
  // methods can use this.sender
});
`
    );
  return sender;
}

/**
 * @return The current slot number, according to the active Mina instance.
 */
function currentSlot(): UInt32 {
  return activeInstance.currentSlot();
}

/**
 * @return The account data associated to the given public key.
 */
function getAccount(publicKey: PublicKey, tokenId?: Field): Account {
  return activeInstance.getAccount(publicKey, tokenId);
}

/**
 * Checks if an account exists within the ledger.
 */
function hasAccount(publicKey: PublicKey, tokenId?: Field): boolean {
  return activeInstance.hasAccount(publicKey, tokenId);
}

/**
 * @return The current Mina network ID.
 */
function getNetworkId() {
  return activeInstance.getNetworkId();
}

/**
 * @return Data associated with the current Mina network constants.
 */
function getNetworkConstants() {
  return activeInstance.getNetworkConstants();
}

/**
 * @return Data associated with the current state of the Mina network.
 */
function getNetworkState() {
  return activeInstance.getNetworkState();
}

/**
 * @return The balance associated to the given public key.
 */
function getBalance(publicKey: PublicKey, tokenId?: Field) {
  return activeInstance.getAccount(publicKey, tokenId).balance;
}

/**
 * Returns the default account creation fee.
 * @deprecated use {@link Mina.getNetworkConstants}
 */
function accountCreationFee() {
  return activeInstance.accountCreationFee();
}

async function sendTransaction(txn: Transaction) {
  return await activeInstance.sendTransaction(txn);
}

async function sendOrThrowIfError(txn: Transaction) {
  const pendingTransaction = await sendTransaction(txn);
  if (pendingTransaction.errors) {
    throw Error(
      `Transaction failed with errors: ${JSON.stringify(
        pendingTransaction.errors,
        null,
        2
      )}`
    );
  }
  return pendingTransaction;
}

/**
 * @return A list of emitted events associated to the given public key.
 */
async function fetchEvents(
  publicKey: PublicKey,
  tokenId: Field,
  filterOptions: EventActionFilterOptions = {}
) {
  return await activeInstance.fetchEvents(publicKey, tokenId, filterOptions);
}

/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
async function fetchActions(
  publicKey: PublicKey,
  actionStates?: ActionStates,
  tokenId?: Field
) {
  return await activeInstance.fetchActions(publicKey, actionStates, tokenId);
}

/**
 * @return A list of emitted sequencing actions associated to the given public key.
 */
function getActions(
  publicKey: PublicKey,
  actionStates?: ActionStates,
  tokenId?: Field
) {
  return activeInstance.getActions(publicKey, actionStates, tokenId);
}

function getProofsEnabled() {
  return activeInstance.proofsEnabled;
}

function dummyAccount(pubkey?: PublicKey): Account {
  let dummy = Types.Account.empty();
  if (pubkey) dummy.publicKey = pubkey;
  return dummy;
}

function defaultNetworkState(): NetworkValue {
  let epochData: NetworkValue['stakingEpochData'] = {
    ledger: { hash: Field(0), totalCurrency: UInt64.zero },
    seed: Field(0),
    startCheckpoint: Field(0),
    lockCheckpoint: Field(0),
    epochLength: UInt32.zero,
  };
  return {
    snarkedLedgerHash: Field(0),
    blockchainLength: UInt32.zero,
    minWindowDensity: UInt32.zero,
    totalCurrency: UInt64.zero,
    globalSlotSinceGenesis: UInt32.zero,
    stakingEpochData: epochData,
    nextEpochData: cloneCircuitValue(epochData),
  };
}

async function verifyAccountUpdate(
  account: Account,
  accountUpdate: AccountUpdate,
  publicInput: ZkappPublicInput,
  transactionCommitments: { commitment: bigint; fullCommitment: bigint },
  proofsEnabled: boolean,
  networkId: NetworkId
): Promise<void> {
  // check that that top-level updates have mayUseToken = No
  // (equivalent check exists in the Mina node)
  if (
    accountUpdate.body.callDepth === 0 &&
    !AccountUpdate.MayUseToken.isNo(accountUpdate).toBoolean()
  ) {
    throw Error(
      'Top-level account update can not use or pass on token permissions. Make sure that\n' +
        'accountUpdate.body.mayUseToken = AccountUpdate.MayUseToken.No;'
    );
  }

  let perm = account.permissions;

  // check if addMissingSignatures failed to include a signature
  // due to a missing private key
  if (accountUpdate.authorization === dummySignature()) {
    let pk = PublicKey.toBase58(accountUpdate.body.publicKey);
    throw Error(
      `verifyAccountUpdate: Detected a missing signature for (${pk}), private key was missing.`
    );
  }
  // we are essentially only checking if the update is empty or an actual update
  function includesChange<T extends {}>(
    val: T | string | null | (string | null)[]
  ): boolean {
    if (Array.isArray(val)) {
      return !val.every((v) => v === null);
    } else {
      return val !== null;
    }
  }

  function permissionForUpdate(key: string): Types.AuthRequired {
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
  if (!proofsEnabled) isValidProof = true;

  if (accountUpdate.authorization.proof && proofsEnabled) {
    try {
      let publicInputFields = ZkappPublicInput.toFields(publicInput);

      let proof: JsonProof = {
        maxProofsVerified: 2,
        proof: accountUpdate.authorization.proof!,
        publicInput: publicInputFields.map((f) => f.toString()),
        publicOutput: [],
      };

      let verificationKey = account.zkapp?.verificationKey?.data;
      assert(
        verificationKey !== undefined,
        'Account does not have a verification key'
      );

      isValidProof = await verify(proof, verificationKey);
      if (!isValidProof) {
        throw Error(
          `Invalid proof for account update\n${JSON.stringify(update)}`
        );
      }
    } catch (error) {
      errorTrace += '\n\n' + (error as Error).stack;
      isValidProof = false;
    }
  }

  if (accountUpdate.authorization.signature) {
    // checking permissions and authorization for each account update individually
    try {
      isValidSignature = verifyAccountUpdateSignature(
        TypesBigint.AccountUpdate.fromJSON(accountUpdateJson),
        transactionCommitments,
        networkId
      );
    } catch (error) {
      errorTrace += '\n\n' + (error as Error).stack;
      isValidSignature = false;
    }
  }

  let verified = false;

  function checkPermission(p0: Types.AuthRequired, field: string) {
    let p = Types.AuthRequired.toJSON(p0);
    if (p === 'None') return;

    if (p === 'Impossible') {
      throw Error(
        `Transaction verification failed: Cannot update field '${field}' because permission for this field is '${p}'`
      );
    }

    if (p === 'Signature' || p === 'Either') {
      verified ||= isValidSignature;
    }

    if (p === 'Proof' || p === 'Either') {
      verified ||= isValidProof;
    }

    if (!verified) {
      throw Error(
        `Transaction verification failed: Cannot update field '${field}' because permission for this field is '${p}', but the required authorization was not provided or is invalid.
        ${errorTrace !== '' ? 'Error trace: ' + errorTrace : ''}\n\n`
      );
    }
  }

  // goes through the update field on a transaction
  Object.entries(update).forEach(([key, value]) => {
    if (includesChange(value)) {
      let p = permissionForUpdate(key);
      checkPermission(p, key);
    }
  });

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
    throw Error(
      `One or more proofs were invalid and no other form of authorization was provided.\n${errorTrace}`
    );
  }
}

function verifyTransactionLimits({ accountUpdates }: ZkappCommand) {
  let eventElements = { events: 0, actions: 0 };

  let authKinds = accountUpdates.map((update) => {
    eventElements.events += countEventElements(update.body.events);
    eventElements.actions += countEventElements(update.body.actions);
    let { isSigned, isProved, verificationKeyHash } =
      update.body.authorizationKind;
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
  let totalTimeRequired =
    TransactionCost.PROOF_COST * authTypes.proof +
    TransactionCost.SIGNED_PAIR_COST * authTypes.signedPair +
    TransactionCost.SIGNED_SINGLE_COST * authTypes.signedSingle;

  let isWithinCostLimit = totalTimeRequired < TransactionCost.COST_LIMIT;

  let isWithinEventsLimit =
    eventElements.events <= TransactionLimits.MAX_EVENT_ELEMENTS;
  let isWithinActionsLimit =
    eventElements.actions <= TransactionLimits.MAX_ACTION_ELEMENTS;

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
    error += `Error: The account updates in your transaction are trying to emit too much event data. The maximum allowed number of field elements in events is ${TransactionLimits.MAX_EVENT_ELEMENTS}, but you tried to emit ${eventElements.events}.\n\n`;
  }

  if (!isWithinActionsLimit) {
    error += `Error: The account updates in your transaction are trying to emit too much action data. The maximum allowed number of field elements in actions is ${TransactionLimits.MAX_ACTION_ELEMENTS}, but you tried to emit ${eventElements.actions}.\n\n`;
  }

  if (error) throw Error('Error during transaction sending:\n\n' + error);
}

function countEventElements({ data }: Events) {
  return data.reduce((acc, ev) => acc + ev.length, 0);
}

type AuthorizationKind = { isProved: boolean; isSigned: boolean };

const isPair = (a: AuthorizationKind, b: AuthorizationKind) =>
  !a.isProved && !b.isProved;

function filterPairs(xs: AuthorizationKind[]): {
  xs: { isProved: boolean; isSigned: boolean }[];
  pairs: number;
} {
  if (xs.length <= 1) return { xs, pairs: 0 };
  if (isPair(xs[0], xs[1])) {
    let rec = filterPairs(xs.slice(2));
    return { xs: rec.xs, pairs: rec.pairs + 1 };
  } else {
    let rec = filterPairs(xs.slice(1));
    return { xs: [xs[0]].concat(rec.xs), pairs: rec.pairs };
  }
}

function filterGroups(xs: AuthorizationKind[]) {
  let pairs = filterPairs(xs);
  xs = pairs.xs;

  let singleCount = 0;
  let proofCount = 0;

  xs.forEach((t) => {
    if (t.isProved) proofCount++;
    else singleCount++;
  });

  return {
    signedPair: pairs.pairs,
    signedSingle: singleCount,
    proof: proofCount,
  };
}

async function waitForFunding(address: string): Promise<void> {
  let attempts = 0;
  let maxAttempts = 30;
  let interval = 30000;
  const executePoll = async (
    resolve: () => void,
    reject: (err: Error) => void | Error
  ) => {
    let { account } = await Fetch.fetchAccount({ publicKey: address });
    attempts++;
    if (account) {
      return resolve();
    } else if (maxAttempts && attempts === maxAttempts) {
      return reject(new Error(`Exceeded max attempts`));
    } else {
      setTimeout(executePoll, interval, resolve, reject);
    }
  };
  return new Promise(executePoll);
}

/**
 * Requests the [testnet faucet](https://faucet.minaprotocol.com/api/v1/faucet) to fund a public key.
 */
async function faucet(pub: PublicKey, network: string = 'berkeley-qanet') {
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
    throw new Error(
      `Error funding account ${address}, got response status: ${response.status}, text: ${response.statusText}`
    );
  }
  await waitForFunding(address);
}

function genesisToNetworkConstants(
  genesisConstants: Fetch.GenesisConstants
): NetworkConstants {
  return {
    genesisTimestamp: UInt64.from(
      Date.parse(genesisConstants.genesisTimestamp)
    ),
    slotTime: UInt64.from(genesisConstants.slotDuration),
    accountCreationFee: UInt64.from(genesisConstants.accountCreationFee),
  };
}
