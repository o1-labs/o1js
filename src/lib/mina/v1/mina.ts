import { Test } from '../../../bindings.js';
import { Types } from '../../../bindings/mina-transaction/v1/types.js';
import { NetworkId } from '../../../mina-signer/src/types.js';
import { PublicKey } from '../../provable/crypto/signature.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { Field } from '../../provable/wrapped.js';
import { Authorization, TokenId } from './account-update.js';
import { Account } from './account.js';
import { humanizeErrors, invalidTransactionError } from './errors.js';
import * as Fetch from './fetch.js';
import { type EventActionFilterOptions } from './graphql.js';
import { LocalBlockchain, TestPublicKey } from './local-blockchain.js';
import {
  Mina,
  activeInstance,
  currentSlot,
  defaultNetworkConstants,
  fetchActions,
  fetchEvents,
  getAccount,
  getActions,
  getBalance,
  getNetworkConstants,
  getNetworkId,
  getNetworkState,
  getProofsEnabled,
  hasAccount,
  setActiveInstance,
  type ActionStates,
  type FeePayerSpec,
  type NetworkConstants,
} from './mina-instance.js';
import { currentTransaction } from './transaction-context.js';
import {
  defaultNetworkState,
  filterGroups,
  reportGetAccountError,
  verifyTransactionLimits,
} from './transaction-validation.js';
import {
  Transaction,
  createIncludedTransaction,
  createRejectedTransaction,
  createTransaction,
  toPendingTransactionPromise,
  toTransactionPromise,
  transaction,
  type IncludedTransaction,
  type PendingTransaction,
  type PendingTransactionPromise,
  type PendingTransactionStatus,
  type RejectedTransaction,
} from './transaction.js';

export {
  ActionStates,
  FeePayerSpec,
  LocalBlockchain,
  Network,
  TestPublicKey,
  Transaction,
  activeInstance,
  currentSlot,
  currentTransaction,
  faucet,
  fetchActions,
  fetchEvents,
  // for internal testing only
  filterGroups,
  getAccount,
  getActions,
  getBalance,
  getNetworkConstants,
  getNetworkId,
  getNetworkState,
  getProofsEnabled,
  hasAccount,
  sender,
  setActiveInstance,
  transaction,
  waitForFunding,
  type IncludedTransaction,
  type NetworkConstants,
  type PendingTransaction,
  type PendingTransactionPromise,
  type PendingTransactionStatus,
  type RejectedTransaction,
};

// patch active instance so that we can still create basic transactions without giving Mina network details
setActiveInstance({
  ...activeInstance,
  transaction(sender: FeePayerSpec, f: () => Promise<void>) {
    return toTransactionPromise(() => createTransaction(sender, f, 0));
  },
});

/**
 * Represents the Mina blockchain running on a real network
 */
function Network(graphqlEndpoint: string): Mina;
function Network(options: {
  networkId?: NetworkId;
  mina: string | string[];
  archive?: string | string[];
  lightnetAccountManager?: string;
  bypassTransactionLimits?: boolean;
  minaDefaultHeaders?: HeadersInit;
  archiveDefaultHeaders?: HeadersInit;
}): Mina;
function Network(
  options:
    | {
        networkId?: NetworkId;
        mina: string | string[];
        archive?: string | string[];
        lightnetAccountManager?: string;
        bypassTransactionLimits?: boolean;
        minaDefaultHeaders?: HeadersInit;
        archiveDefaultHeaders?: HeadersInit;
      }
    | string
): Mina {
  let minaNetworkId: NetworkId = 'devnet';
  let minaGraphqlEndpoint: string;
  let archiveEndpoint: string;
  let lightnetAccountManagerEndpoint: string;
  let enforceTransactionLimits: boolean = true;

  if (options && typeof options === 'string') {
    minaGraphqlEndpoint = options;
    Fetch.setGraphqlEndpoint(minaGraphqlEndpoint);
  } else if (options && typeof options === 'object') {
    if (options.networkId) {
      minaNetworkId = options.networkId;
    }
    if (!options.mina)
      throw new Error("Network: malformed input. Please provide an object with 'mina' endpoint.");
    if (Array.isArray(options.mina) && options.mina.length !== 0) {
      minaGraphqlEndpoint = options.mina[0];
      Fetch.setGraphqlEndpoint(minaGraphqlEndpoint, options.minaDefaultHeaders);
      Fetch.setMinaGraphqlFallbackEndpoints(options.mina.slice(1));
    } else if (typeof options.mina === 'string') {
      minaGraphqlEndpoint = options.mina;
      Fetch.setGraphqlEndpoint(minaGraphqlEndpoint, options.minaDefaultHeaders);
    }

    if (options.archive !== undefined) {
      if (Array.isArray(options.archive) && options.archive.length !== 0) {
        archiveEndpoint = options.archive[0];
        Fetch.setArchiveGraphqlEndpoint(archiveEndpoint, options.archiveDefaultHeaders);
        Fetch.setArchiveGraphqlFallbackEndpoints(options.archive.slice(1));
      } else if (typeof options.archive === 'string') {
        archiveEndpoint = options.archive;
        Fetch.setArchiveGraphqlEndpoint(archiveEndpoint, options.archiveDefaultHeaders);
      }
    }

    if (
      options.lightnetAccountManager !== undefined &&
      typeof options.lightnetAccountManager === 'string'
    ) {
      lightnetAccountManagerEndpoint = options.lightnetAccountManager;
      Fetch.setLightnetAccountManagerEndpoint(lightnetAccountManagerEndpoint);
    }

    if (
      options.bypassTransactionLimits !== undefined &&
      typeof options.bypassTransactionLimits === 'boolean'
    ) {
      enforceTransactionLimits = !options.bypassTransactionLimits;
    }
  } else {
    throw new Error(
      "Network: malformed input. Please provide a string or an object with 'mina' and 'archive' endpoints."
    );
  }

  return {
    getNetworkId: () => minaNetworkId,
    getNetworkConstants() {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markNetworkToBeFetched(minaGraphqlEndpoint);
        const genesisConstants = Fetch.getCachedGenesisConstants(minaGraphqlEndpoint);
        return genesisConstants !== undefined
          ? genesisToNetworkConstants(genesisConstants)
          : defaultNetworkConstants;
      }
      if (!currentTransaction.has() || currentTransaction.get().fetchMode === 'cached') {
        const genesisConstants = Fetch.getCachedGenesisConstants(minaGraphqlEndpoint);
        if (genesisConstants !== undefined) return genesisToNetworkConstants(genesisConstants);
      }
      return defaultNetworkConstants;
    },
    /**
     * Returns the current slot number.
     *
     * For LocalBlockchain, this always works.
     * For remote networks, requires cached network state populated by:
     * - `Mina.transaction()` - automatically fetches and caches network state
     * - `fetchLastBlock()` - but note this already returns `globalSlotSinceGenesis`, making `currentSlot()` redundant
     *
     * @throws {Error} If called on a remote network without cached data. Use `fetchCurrentSlot()` instead.
     */
    currentSlot() {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markNetworkToBeFetched(minaGraphqlEndpoint);
        let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
        return network?.globalSlotSinceGenesis ?? UInt32.from(0);
      }
      if (!currentTransaction.has() || currentTransaction.get().fetchMode === 'cached') {
        let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
        if (network !== undefined) return network.globalSlotSinceGenesis;
      }
      throw Error(
        `currentSlot: Could not fetch current slot from graphql endpoint ${minaGraphqlEndpoint} outside of a transaction.\n` +
          'To query the current slot outside of a transaction, import `fetchCurrentSlot` from o1js and call it with your GraphQL endpoint.\n' +
          "You can fetch the global slot since genesis (default) or the epoch-relative slot by passing 'epoch' as the second parameter."
      );
    },
    hasAccount(publicKey: PublicKey, tokenId: Field = TokenId.default) {
      if (!currentTransaction.has() || currentTransaction.get().fetchMode === 'cached') {
        return !!Fetch.getCachedAccount(publicKey, tokenId, minaGraphqlEndpoint);
      }
      return false;
    },
    getAccount(publicKey: PublicKey, tokenId: Field = TokenId.default) {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markAccountToBeFetched(publicKey, tokenId, minaGraphqlEndpoint);
        let account = Fetch.getCachedAccount(publicKey, tokenId, minaGraphqlEndpoint);
        return account ?? dummyAccount(publicKey);
      }
      if (!currentTransaction.has() || currentTransaction.get().fetchMode === 'cached') {
        let account = Fetch.getCachedAccount(publicKey, tokenId, minaGraphqlEndpoint);
        if (account !== undefined) return account;
      }
      throw Error(
        `${reportGetAccountError(
          publicKey.toBase58(),
          TokenId.toBase58(tokenId)
        )}\nGraphql endpoint: ${minaGraphqlEndpoint}`
      );
    },
    /**
     * Returns the current network state.
     *
     * For LocalBlockchain, this always works.
     * For remote networks, requires cached network state populated by:
     * - `Mina.transaction()` - automatically fetches and caches network state
     * - `fetchLastBlock()` - explicitly fetches and caches network state
     *
     * @throws {Error} If called on a remote network without cached data.
     */
    getNetworkState() {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markNetworkToBeFetched(minaGraphqlEndpoint);
        let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
        return network ?? defaultNetworkState();
      }
      if (!currentTransaction.has() || currentTransaction.get().fetchMode === 'cached') {
        let network = Fetch.getCachedNetwork(minaGraphqlEndpoint);
        if (network !== undefined) return network;
      }
      throw Error(
        `getNetworkState: Could not fetch network state from graphql endpoint ${minaGraphqlEndpoint} outside of a transaction.`
      );
    },
    sendTransaction(txn) {
      return toPendingTransactionPromise(async () => {
        if (enforceTransactionLimits) verifyTransactionLimits(txn.transaction);

        let [response, error] = await Fetch.sendZkapp(txn.toJSON());
        let errors: string[] = [];
        if (response === undefined && error !== undefined) {
          errors = [JSON.stringify(error)];
        } else if (response && response.errors && response.errors.length > 0) {
          response?.errors.forEach((e: any) => errors.push(JSON.stringify(e)));
        }
        const updatedErrors = humanizeErrors(errors);

        const status: PendingTransactionStatus = errors.length === 0 ? 'pending' : 'rejected';
        let mlTest = await Test();
        const hash = mlTest.transactionHash.hashZkAppCommand(txn.toJSON());
        const pendingTransaction: Omit<PendingTransaction, 'wait' | 'safeWait'> = {
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

        const pollTransactionStatus = async (
          transactionHash: string,
          maxAttempts: number,
          interval: number,
          attempts: number = 0
        ): Promise<IncludedTransaction | RejectedTransaction> => {
          let res: Awaited<ReturnType<typeof Fetch.checkZkappTransaction>>;
          try {
            res = await Fetch.checkZkappTransaction(transactionHash);
            if (res.success) {
              return createIncludedTransaction(pendingTransaction, res.blockHeight);
            } else if (res.failureReason) {
              const error = invalidTransactionError(txn.transaction, res.failureReason, {
                accountCreationFee: defaultNetworkConstants.accountCreationFee.toString(),
              });
              return createRejectedTransaction(pendingTransaction, [error]);
            }
          } catch (error) {
            return createRejectedTransaction(pendingTransaction, [(error as Error).message]);
          }

          if (maxAttempts && attempts >= maxAttempts) {
            return createRejectedTransaction(pendingTransaction, [
              `Exceeded max attempts.\nTransactionId: ${transactionHash}\nAttempts: ${attempts}\nLast received status: ${res}`,
            ]);
          }

          await new Promise((resolve) => setTimeout(resolve, interval));
          return pollTransactionStatus(transactionHash, maxAttempts, interval, attempts + 1);
        };

        // default is 45 attempts * 20s each = 15min
        // the block time on berkeley is currently longer than the average 3-4min, so its better to target a higher block time
        // fetching an update every 20s is more than enough with a current block time of 3min
        const poll = async (
          maxAttempts: number = 45,
          interval: number = 20000
        ): Promise<IncludedTransaction | RejectedTransaction> => {
          return pollTransactionStatus(hash, maxAttempts, interval);
        };

        const wait = async (options?: {
          maxAttempts?: number;
          interval?: number;
        }): Promise<IncludedTransaction> => {
          const pendingTransaction = await safeWait(options);
          if (pendingTransaction.status === 'rejected') {
            throw Error(`Transaction failed with errors:\n${pendingTransaction.errors.join('\n')}`);
          }
          return pendingTransaction;
        };

        const safeWait = async (options?: {
          maxAttempts?: number;
          interval?: number;
        }): Promise<IncludedTransaction | RejectedTransaction> => {
          if (status === 'rejected') {
            return createRejectedTransaction(pendingTransaction, pendingTransaction.errors);
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
    transaction(sender: FeePayerSpec, f: () => Promise<void>) {
      return toTransactionPromise(async () => {
        // TODO we run the transaction twice to be able to fetch data in between
        let tx = await createTransaction(sender, f, 0, {
          fetchMode: 'test',
          isFinalRunOutsideCircuit: false,
        });
        await Fetch.fetchMissingData(minaGraphqlEndpoint, archiveEndpoint);
        let hasProofs = tx.transaction.accountUpdates.some(Authorization.hasLazyProof);
        return await createTransaction(sender, f, 1, {
          fetchMode: 'cached',
          isFinalRunOutsideCircuit: !hasProofs,
        });
      });
    },
    async fetchEvents(
      publicKey: PublicKey,
      tokenId: Field = TokenId.default,
      filterOptions: EventActionFilterOptions = {},
      headers?: HeadersInit
    ) {
      const pubKey = publicKey.toBase58();
      const token = TokenId.toBase58(tokenId);
      const from = filterOptions.from ? Number(filterOptions.from.toString()) : undefined;
      const to = filterOptions.to ? Number(filterOptions.to.toString()) : undefined;

      return Fetch.fetchEvents(
        { publicKey: pubKey, tokenId: token, from, to },
        archiveEndpoint,
        headers
      );
    },
    async fetchActions(
      publicKey: PublicKey,
      actionStates?: ActionStates,
      tokenId: Field = TokenId.default,
      from?: number,
      to?: number,
      headers?: HeadersInit
    ) {
      const pubKey = publicKey.toBase58();
      const token = TokenId.toBase58(tokenId);
      const { fromActionState, endActionState } = actionStates ?? {};
      const fromActionStateBase58 = fromActionState ? fromActionState.toString() : undefined;
      const endActionStateBase58 = endActionState ? endActionState.toString() : undefined;

      return Fetch.fetchActions(
        {
          publicKey: pubKey,
          actionStates: {
            fromActionState: fromActionStateBase58,
            endActionState: endActionStateBase58,
          },
          from,
          to,
          tokenId: token,
        },
        archiveEndpoint,
        headers
      );
    },
    getActions(
      publicKey: PublicKey,
      actionStates?: ActionStates,
      tokenId: Field = TokenId.default
    ) {
      if (currentTransaction()?.fetchMode === 'test') {
        Fetch.markActionsToBeFetched(publicKey, tokenId, archiveEndpoint, actionStates);
        let actions = Fetch.getCachedActions(publicKey, tokenId);
        return actions ?? [];
      }
      if (!currentTransaction.has() || currentTransaction.get().fetchMode === 'cached') {
        let actions = Fetch.getCachedActions(publicKey, tokenId);
        if (actions !== undefined) return actions;
      }
      throw Error(`getActions: Could not find actions for the public key ${publicKey.toBase58()}`);
    },
    proofsEnabled: true,
  };
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

function dummyAccount(pubkey?: PublicKey): Account {
  let dummy = Types.Account.empty();
  if (pubkey) dummy.publicKey = pubkey;
  return dummy;
}

async function waitForFunding(address: string, headers?: HeadersInit): Promise<void> {
  let attempts = 0;
  let maxAttempts = 30;
  let interval = 30000;
  const executePoll = async (resolve: () => void, reject: (err: Error) => void | Error) => {
    let { account } = await Fetch.fetchAccount({ publicKey: address }, undefined, { headers });
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
async function faucet(pub: PublicKey, network: string = 'devnet', headers?: HeadersInit) {
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
  await waitForFunding(address, headers);
}

function genesisToNetworkConstants(genesisConstants: Fetch.GenesisConstants): NetworkConstants {
  return {
    genesisTimestamp: UInt64.from(Date.parse(genesisConstants.genesisTimestamp)),
    slotTime: UInt64.from(genesisConstants.slotDuration),
    accountCreationFee: UInt64.from(genesisConstants.accountCreationFee),
  };
}
