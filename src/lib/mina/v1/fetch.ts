import 'isomorphic-fetch';
import { Field } from '../../provable/wrapped.js';
import { UInt32, UInt64 } from '../../provable/int.js';
import { Actions, TokenId } from './account-update.js';
import { PublicKey, PrivateKey } from '../../provable/crypto/signature.js';
import { NetworkValue } from './precondition.js';
import { Types } from '../../../bindings/mina-transaction/types.js';
import { ActionStates } from './mina.js';
import { LedgerHash, EpochSeed, StateHash } from './base58-encodings.js';
import { Account, fillPartialAccount, parseFetchedAccount, PartialAccount } from './account.js';
import {
  type LastBlockQueryResponse,
  type GenesisConstantsResponse,
  type LastBlockQueryFailureCheckResponse,
  type FetchedAction,
  type FetchedBlock,
  type TransactionStatus,
  type TransactionStatusQueryResponse,
  type EventQueryResponse,
  type ActionQueryResponse,
  type EventActionFilterOptions,
  type SendZkAppResponse,
  type FetchedAccountResponse,
  type CurrentSlotResponse,
  sendZkappQuery,
  lastBlockQuery,
  lastBlockQueryFailureCheck,
  transactionStatusQuery,
  getEventsQuery,
  getActionsQuery,
  genesisConstantsQuery,
  accountQuery,
  currentSlotQuery,
} from './graphql.js';

export {
  fetchAccount,
  fetchLastBlock,
  fetchGenesisConstants,
  fetchCurrentSlot,
  checkZkappTransaction,
  parseFetchedAccount,
  markAccountToBeFetched,
  markNetworkToBeFetched,
  markActionsToBeFetched,
  fetchMissingData,
  fetchTransactionStatus,
  getCachedAccount,
  getCachedNetwork,
  getCachedActions,
  getCachedGenesisConstants,
  addCachedAccount,
  networkConfig,
  setMinaDefaultHeaders,
  setArchiveDefaultHeaders,
  setGraphqlEndpoint,
  setGraphqlEndpoints,
  setMinaGraphqlFallbackEndpoints,
  setArchiveGraphqlEndpoint,
  setArchiveGraphqlFallbackEndpoints,
  setLightnetAccountManagerEndpoint,
  sendZkapp,
  fetchEvents,
  fetchActions,
  makeGraphqlRequest,
  Lightnet,
  type GenesisConstants,
  type ActionStatesStringified,
};

type NetworkConfig = {
  minaEndpoint: string;
  minaFallbackEndpoints: string[];
  archiveEndpoint: string;
  archiveFallbackEndpoints: string[];
  lightnetAccountManagerEndpoint: string;
  minaDefaultHeaders: HeadersInit;
  archiveDefaultHeaders: HeadersInit;
};

type ActionsQueryInputs = {
  publicKey: string;
  actionStates: ActionStatesStringified;
  tokenId?: string;
};

let networkConfig = {
  minaEndpoint: '',
  minaFallbackEndpoints: [] as string[],
  archiveEndpoint: '',
  archiveFallbackEndpoints: [] as string[],
  lightnetAccountManagerEndpoint: '',
  minaDefaultHeaders: {},
  archiveDefaultHeaders: {},
} satisfies NetworkConfig;

function checkForValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sets up the default headers to be used for all Mina node GraphQL requests, example usage:
 * ```typescript
 * setMinaDefaultHeaders({ Authorization: 'Bearer example-token' });
 * ```
 *
 * It can be overridden by passing headers to the individual fetch functions, example usage:
 * ```typescript
 * setMinaDefaultHeaders({ Authorization: 'Bearer default-token' });
 * await fetchAccount({publicKey}, minaEndpoint, { headers: { Authorization: 'Bearer override-token' } });
 * ```
 * @param headers Arbitrary sized headers to be used for all Mina node GraphQL requests.
 */
function setMinaDefaultHeaders(headers: HeadersInit) {
  networkConfig.minaDefaultHeaders = headers;
}

/**
 * Sets up the default headers to be used for all Archive node GraphQL requests, example usage:
 * ```typescript
 * setArchiveDefaultHeaders({ Authorization: 'Bearer example-token' });
 * ```
 *
 * It can be overridden by passing headers to the individual fetch functions, example usage:
 * ```typescript
 * setArchiveDefaultHeaders({ Authorization: 'Bearer default-token' });
 * await fetchEvents({publicKey}, archiveEndpoint, { headers: { Authorization: 'Bearer override-token' } });
 * ```
 * @param headers Arbitrary sized headers to be used for all Mina Archive node GraphQL requests.
 */
function setArchiveDefaultHeaders(headers: HeadersInit) {
  networkConfig.archiveDefaultHeaders = headers;
}

function setGraphqlEndpoints([graphqlEndpoint, ...fallbackEndpoints]: string[]) {
  setGraphqlEndpoint(graphqlEndpoint);
  setMinaGraphqlFallbackEndpoints(fallbackEndpoints);
}
function setGraphqlEndpoint(graphqlEndpoint: string, minaDefaultHeaders?: HeadersInit) {
  if (!checkForValidUrl(graphqlEndpoint)) {
    throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoint}. Please specify a valid URL.`);
  }
  networkConfig.minaEndpoint = graphqlEndpoint;
  if (minaDefaultHeaders) setMinaDefaultHeaders(minaDefaultHeaders);
}
function setMinaGraphqlFallbackEndpoints(graphqlEndpoints: string[]) {
  if (graphqlEndpoints.some((endpoint) => !checkForValidUrl(endpoint))) {
    throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoints}. Please specify a valid URL.`);
  }
  networkConfig.minaFallbackEndpoints = graphqlEndpoints;
}

/**
 * Sets up a GraphQL endpoint to be used for fetching information from an Archive Node.
 *
 */
function setArchiveGraphqlEndpoint(graphqlEndpoint: string, archiveDefaultHeaders?: HeadersInit) {
  if (!checkForValidUrl(graphqlEndpoint)) {
    throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoint}. Please specify a valid URL.`);
  }
  networkConfig.archiveEndpoint = graphqlEndpoint;
  if (archiveDefaultHeaders) setArchiveDefaultHeaders(archiveDefaultHeaders);
}
function setArchiveGraphqlFallbackEndpoints(graphqlEndpoints: string[]) {
  if (graphqlEndpoints.some((endpoint) => !checkForValidUrl(endpoint))) {
    throw new Error(`Invalid GraphQL endpoint: ${graphqlEndpoints}. Please specify a valid URL.`);
  }
  networkConfig.archiveFallbackEndpoints = graphqlEndpoints;
}

/**
 * Sets up the lightnet account manager endpoint to be used for accounts acquisition and releasing.
 *
 * @param endpoint Account manager endpoint.
 */
function setLightnetAccountManagerEndpoint(endpoint: string) {
  if (!checkForValidUrl(endpoint)) {
    throw new Error(`Invalid account manager endpoint: ${endpoint}. Please specify a valid URL.`);
  }
  networkConfig.lightnetAccountManagerEndpoint = endpoint;
}

/**
 * Gets account information on the specified publicKey by performing a GraphQL query
 * to the specified endpoint. This will call the 'GetAccountInfo' query which fetches
 * zkapp related account information.
 *
 * If an error is returned by the specified endpoint, an error is thrown. Otherwise,
 * the data is returned.
 *
 * @param accountInfo The public key and token id of the account to fetch
 * @param accountInfo.publicKey The specified publicKey to get account information on
 * @param accountInfo.tokenId The specified tokenId to get account information on
 * @param graphqlEndpoint The graphql endpoint to fetch from
 * @param config An object that exposes an additional timeout and header options
 * @returns zkapp information on the specified account or an error is thrown
 */
async function fetchAccount(
  accountInfo: { publicKey: string | PublicKey; tokenId?: string | Field },
  graphqlEndpoint = networkConfig.minaEndpoint,
  { timeout = defaultTimeout, headers }: FetchConfig = {}
): Promise<
  { account: Types.Account; error: undefined } | { account: undefined; error: FetchError }
> {
  let publicKeyBase58 =
    accountInfo.publicKey instanceof PublicKey
      ? accountInfo.publicKey.toBase58()
      : accountInfo.publicKey;
  let tokenIdBase58 =
    typeof accountInfo.tokenId === 'string' || !accountInfo.tokenId
      ? accountInfo.tokenId
      : TokenId.toBase58(accountInfo.tokenId);

  return await fetchAccountInternal(
    { publicKey: publicKeyBase58, tokenId: tokenIdBase58 },
    graphqlEndpoint,
    {
      timeout,
      headers: { ...networkConfig.minaDefaultHeaders, ...headers },
    }
  );
}

// internal version of fetchAccount which does the same, but returns the original JSON version
// of the account, to save some back-and-forth conversions when caching accounts
async function fetchAccountInternal(
  accountInfo: { publicKey: string; tokenId?: string },
  graphqlEndpoint = networkConfig.minaEndpoint,
  config?: FetchConfig
) {
  const { publicKey, tokenId } = accountInfo;
  let [response, error] = await makeGraphqlRequest<FetchedAccountResponse>(
    accountQuery(publicKey, tokenId ?? TokenId.toBase58(TokenId.default)),
    graphqlEndpoint,
    networkConfig.minaFallbackEndpoints,
    config
  );
  if (error !== undefined) return { account: undefined, error };
  let fetchedAccount = response?.data?.account;
  if (!fetchedAccount) {
    return {
      account: undefined,
      error: {
        statusCode: 404,
        statusText: `fetchAccount: Account with public key ${publicKey} does not exist.`,
      },
    };
  }
  let account = parseFetchedAccount(fetchedAccount);
  // account successfully fetched - add to cache before returning
  addCachedAccountInternal(account, graphqlEndpoint);
  return {
    account,
    error: undefined,
  };
}

type FetchConfig = { timeout?: number; headers?: HeadersInit };
type FetchResponse<TDataResponse = any> = { data: TDataResponse; errors?: any };
type FetchError = {
  statusCode: number;
  statusText: string;
};
type ActionStatesStringified = {
  [K in keyof ActionStates]: string;
};
// Specify 5min as the default timeout
const defaultTimeout = 5 * 60 * 1000;

let accountCache = {} as Record<
  string,
  {
    account: Account;
    graphqlEndpoint: string;
    timestamp: number;
  }
>;
let networkCache = {} as Record<
  string,
  {
    network: NetworkValue;
    graphqlEndpoint: string;
    timestamp: number;
  }
>;
let actionsCache = {} as Record<
  string,
  {
    actions: { hash: string; actions: string[][] }[];
    graphqlEndpoint: string;
    timestamp: number;
  }
>;
let accountsToFetch = {} as Record<
  string,
  { publicKey: string; tokenId: string; graphqlEndpoint: string }
>;
let networksToFetch = {} as Record<string, { graphqlEndpoint: string }>;
let actionsToFetch = {} as Record<
  string,
  {
    publicKey: string;
    tokenId: string;
    actionStates: ActionStatesStringified;
    graphqlEndpoint: string;
  }
>;
type GenesisConstants = {
  genesisTimestamp: string;
  coinbase: number;
  accountCreationFee: number;
  epochDuration: number;
  k: number;
  slotDuration: number;
  slotsPerEpoch: number;
};
let genesisConstantsCache = {} as Record<string, GenesisConstants>;

const emptyKey = PublicKey.empty().toBase58();

function markAccountToBeFetched(publicKey: PublicKey, tokenId: Field, graphqlEndpoint: string) {
  let publicKeyBase58 = publicKey.toBase58();
  if (publicKeyBase58 === emptyKey) return;
  let tokenBase58 = TokenId.toBase58(tokenId);
  accountsToFetch[`${publicKeyBase58};${tokenBase58};${graphqlEndpoint}`] = {
    publicKey: publicKeyBase58,
    tokenId: tokenBase58,
    graphqlEndpoint,
  };
}
function markNetworkToBeFetched(graphqlEndpoint: string) {
  networksToFetch[graphqlEndpoint] = { graphqlEndpoint };
}
function markActionsToBeFetched(
  publicKey: PublicKey,
  tokenId: Field,
  graphqlEndpoint: string,
  actionStates: ActionStates = {}
) {
  let publicKeyBase58 = publicKey.toBase58();
  let tokenBase58 = TokenId.toBase58(tokenId);
  let { fromActionState, endActionState } = actionStates;
  let fromActionStateBase58 = fromActionState ? fromActionState.toString() : undefined;
  let endActionStateBase58 = endActionState ? endActionState.toString() : undefined;

  actionsToFetch[`${publicKeyBase58};${tokenBase58};${graphqlEndpoint}`] = {
    publicKey: publicKeyBase58,
    tokenId: tokenBase58,
    actionStates: {
      fromActionState: fromActionStateBase58,
      endActionState: endActionStateBase58,
    },
    graphqlEndpoint,
  };
}

async function fetchMissingData(graphqlEndpoint: string, archiveEndpoint?: string) {
  let promises = Object.entries(accountsToFetch).map(async ([key, { publicKey, tokenId }]) => {
    let response = await fetchAccountInternal({ publicKey, tokenId }, graphqlEndpoint);
    if (response.error === undefined) delete accountsToFetch[key];
  });
  let actionPromises = Object.entries(actionsToFetch).map(
    async ([key, { publicKey, actionStates, tokenId }]) => {
      let response = await fetchActions({ publicKey, actionStates, tokenId }, archiveEndpoint);
      if (!('error' in response) || response.error === undefined) delete actionsToFetch[key];
    }
  );
  promises.push(...actionPromises);
  let network = Object.entries(networksToFetch).find(([, network]) => {
    return network.graphqlEndpoint === graphqlEndpoint;
  });
  if (network !== undefined) {
    promises.push(
      (async () => {
        try {
          await fetchLastBlock(graphqlEndpoint);
          await fetchGenesisConstants(graphqlEndpoint);
          delete networksToFetch[network[0]];
        } catch {}
      })()
    );
  }
  await Promise.all(promises);
}

function getCachedAccount(
  publicKey: PublicKey,
  tokenId: Field,
  graphqlEndpoint = networkConfig.minaEndpoint
): Account | undefined {
  return accountCache[accountCacheKey(publicKey, tokenId, graphqlEndpoint)]?.account;
}

function getCachedNetwork(graphqlEndpoint = networkConfig.minaEndpoint) {
  return networkCache[graphqlEndpoint]?.network;
}

function getCachedActions(
  publicKey: PublicKey,
  tokenId: Field,
  graphqlEndpoint = networkConfig.archiveEndpoint
) {
  return actionsCache[accountCacheKey(publicKey, tokenId, graphqlEndpoint)]?.actions;
}

function getCachedGenesisConstants(graphqlEndpoint = networkConfig.minaEndpoint): GenesisConstants {
  return genesisConstantsCache[graphqlEndpoint];
}

/**
 * Adds an account to the local cache, indexed by a GraphQL endpoint.
 */
function addCachedAccount(
  partialAccount: PartialAccount,
  graphqlEndpoint = networkConfig.minaEndpoint
) {
  let account = fillPartialAccount(partialAccount);
  addCachedAccountInternal(account, graphqlEndpoint);
}

function addCachedAccountInternal(account: Account, graphqlEndpoint: string) {
  accountCache[accountCacheKey(account.publicKey, account.tokenId, graphqlEndpoint)] = {
    account,
    graphqlEndpoint,
    timestamp: Date.now(),
  };
}

function addCachedActions(
  { publicKey, tokenId }: { publicKey: string; tokenId: string },
  actions: { hash: string; actions: string[][] }[],
  graphqlEndpoint: string
) {
  actionsCache[`${publicKey};${tokenId};${graphqlEndpoint}`] = {
    actions,
    graphqlEndpoint,
    timestamp: Date.now(),
  };
}

function accountCacheKey(publicKey: PublicKey, tokenId: Field, graphqlEndpoint: string) {
  return `${publicKey.toBase58()};${TokenId.toBase58(tokenId)};${graphqlEndpoint}`;
}

/**
 * Fetches the last block on the Mina network.
 */
async function fetchLastBlock(graphqlEndpoint = networkConfig.minaEndpoint, headers?: HeadersInit) {
  let [resp, error] = await makeGraphqlRequest<LastBlockQueryResponse>(
    lastBlockQuery,
    graphqlEndpoint,
    networkConfig.minaFallbackEndpoints,
    { headers: { ...networkConfig.minaDefaultHeaders, ...headers } }
  );
  if (error) throw Error(error.statusText);
  let lastBlock = resp?.data?.bestChain?.[0];
  if (lastBlock === undefined) {
    throw Error('Failed to fetch latest network state.');
  }
  let network = parseFetchedBlock(lastBlock);
  networkCache[graphqlEndpoint] = {
    network,
    graphqlEndpoint,
    timestamp: Date.now(),
  };
  return network;
}

/**
 * Fetches the current slot number of the Mina network.
 * @param graphqlEndpoint GraphQL endpoint to fetch from
 * @param headers optional headers to pass to the fetch request
 * @returns The current slot number
 */
async function fetchCurrentSlot(
  graphqlEndpoint = networkConfig.minaEndpoint,
  headers?: HeadersInit
) {
  let [resp, error] = await makeGraphqlRequest<CurrentSlotResponse>(
    currentSlotQuery,
    graphqlEndpoint,
    networkConfig.minaFallbackEndpoints,
    { headers: { ...networkConfig.minaDefaultHeaders, ...headers } }
  );
  if (error) throw Error(`Error making GraphQL request: ${error.statusText}`);
  let bestChain = resp?.data?.bestChain;
  if (!bestChain || bestChain.length === 0) {
    throw Error('Failed to fetch the current slot. The response data is undefined.');
  }
  return bestChain[0].protocolState.consensusState.slot;
}

async function fetchLatestBlockZkappStatus(
  blockLength: number,
  graphqlEndpoint = networkConfig.minaEndpoint
) {
  let [resp, error] = await makeGraphqlRequest<LastBlockQueryFailureCheckResponse>(
    lastBlockQueryFailureCheck(blockLength),
    graphqlEndpoint,
    networkConfig.minaFallbackEndpoints,
    { headers: networkConfig.minaDefaultHeaders }
  );
  if (error) throw Error(`Error making GraphQL request: ${error.statusText}`);
  let bestChain = resp?.data;
  if (bestChain === undefined) {
    throw Error(
      'Failed to fetch the latest zkApp transaction status. The response data is undefined.'
    );
  }
  return bestChain;
}

async function checkZkappTransaction(transactionHash: string, blockLength = 20) {
  let bestChainBlocks = await fetchLatestBlockZkappStatus(blockLength);
  for (let block of bestChainBlocks.bestChain) {
    for (let zkappCommand of block.transactions.zkappCommands) {
      if (zkappCommand.hash === transactionHash) {
        if (zkappCommand.failureReason !== null) {
          let failureReason = zkappCommand.failureReason.reverse().map((failure) => {
            return [failure.failures.map((failureItem) => failureItem)];
          });
          return {
            success: false,
            failureReason,
          };
        } else {
          return {
            success: true,
            failureReason: null,
          };
        }
      }
    }
  }
  return {
    success: false,
    failureReason: null,
  };
}

function parseFetchedBlock({
  protocolState: {
    blockchainState: { snarkedLedgerHash },
    consensusState: {
      blockHeight,
      minWindowDensity,
      totalCurrency,
      slotSinceGenesis,
      nextEpochData,
      stakingEpochData,
    },
  },
}: FetchedBlock): NetworkValue {
  return {
    snarkedLedgerHash: LedgerHash.fromBase58(snarkedLedgerHash),
    // TODO: use date or utcDate?
    blockchainLength: UInt32.from(blockHeight),
    minWindowDensity: UInt32.from(minWindowDensity),
    totalCurrency: UInt64.from(totalCurrency),
    globalSlotSinceGenesis: UInt32.from(slotSinceGenesis),
    nextEpochData: parseEpochData(nextEpochData),
    stakingEpochData: parseEpochData(stakingEpochData),
  };
}

function parseEpochData({
  ledger: { hash, totalCurrency },
  seed,
  startCheckpoint,
  lockCheckpoint,
  epochLength,
}: FetchedBlock['protocolState']['consensusState']['nextEpochData']): NetworkValue['nextEpochData'] {
  return {
    ledger: {
      hash: LedgerHash.fromBase58(hash),
      totalCurrency: UInt64.from(totalCurrency),
    },
    seed: EpochSeed.fromBase58(seed),
    startCheckpoint: StateHash.fromBase58(startCheckpoint),
    lockCheckpoint: StateHash.fromBase58(lockCheckpoint),
    epochLength: UInt32.from(epochLength),
  };
}

/**
 * Fetches the status of a transaction.
 */
async function fetchTransactionStatus(
  txId: string,
  graphqlEndpoint = networkConfig.minaEndpoint,
  headers?: HeadersInit
): Promise<TransactionStatus> {
  let [resp, error] = await makeGraphqlRequest<TransactionStatusQueryResponse>(
    transactionStatusQuery(txId),
    graphqlEndpoint,
    networkConfig.minaFallbackEndpoints,
    { headers: { ...networkConfig.minaDefaultHeaders, ...headers } }
  );
  if (error) throw Error(error.statusText);
  let txStatus = resp?.data?.transactionStatus;
  if (txStatus === undefined || txStatus === null) {
    throw Error(`Failed to fetch transaction status. TransactionId: ${txId}`);
  }
  return txStatus as TransactionStatus;
}

/**
 * Sends a zkApp command (transaction) to the specified GraphQL endpoint.
 */
function sendZkapp(
  json: string,
  graphqlEndpoint = networkConfig.minaEndpoint,
  { timeout = defaultTimeout, headers }: FetchConfig = {}
) {
  return makeGraphqlRequest<SendZkAppResponse>(
    sendZkappQuery(json),
    graphqlEndpoint,
    networkConfig.minaFallbackEndpoints,
    {
      timeout,
      headers: { ...networkConfig.minaDefaultHeaders, ...headers },
    }
  );
}

/**
 * Asynchronously fetches event data for an account from the Mina Archive Node GraphQL API.
 * @param accountInfo - The account information object.
 * @param accountInfo.publicKey - The account public key.
 * @param [accountInfo.tokenId] - The optional token ID for the account.
 * @param [graphqlEndpoint=networkConfig.archiveEndpoint] - The GraphQL endpoint to query. Defaults to the Archive Node GraphQL API.
 * @param [filterOptions={}] - The optional filter options object.
 * @param headers - Optional headers to pass to the fetch request
 * @returns A promise that resolves to an array of objects containing event data, block information and transaction information for the account.
 * @throws If the GraphQL request fails or the response is invalid.
 * @example
 * ```ts
 * const accountInfo = { publicKey: 'B62qiwmXrWn7Cok5VhhB3KvCwyZ7NHHstFGbiU5n7m8s2RqqNW1p1wF' };
 * const events = await fetchEvents(accountInfo);
 * console.log(events);
 * ```
 */
async function fetchEvents(
  accountInfo: { publicKey: string; tokenId?: string },
  graphqlEndpoint = networkConfig.archiveEndpoint,
  filterOptions: EventActionFilterOptions = {},
  headers?: HeadersInit
) {
  if (!graphqlEndpoint)
    throw Error(
      'fetchEvents: Specified GraphQL endpoint is undefined. When using events, you must set the archive node endpoint in Mina.Network(). Please ensure your Mina.Network() configuration includes an archive node endpoint.'
    );
  const { publicKey, tokenId } = accountInfo;
  let [response, error] = await makeGraphqlRequest<EventQueryResponse>(
    getEventsQuery(publicKey, tokenId ?? TokenId.toBase58(TokenId.default), filterOptions),
    graphqlEndpoint,
    networkConfig.archiveFallbackEndpoints,
    { headers: { ...networkConfig.archiveDefaultHeaders, ...headers } }
  );
  if (error) throw Error(error.statusText);
  let fetchedEvents = response?.data.events;
  if (fetchedEvents === undefined) {
    throw Error(`Failed to fetch events data. Account: ${publicKey} Token: ${tokenId}`);
  }

  return fetchedEvents.map((event) => {
    let events = event.eventData.map(({ data, transactionInfo }) => {
      return {
        data,
        transactionInfo,
      };
    });

    return {
      events,
      blockHeight: UInt32.from(event.blockInfo.height),
      blockHash: event.blockInfo.stateHash,
      parentBlockHash: event.blockInfo.parentHash,
      globalSlot: UInt32.from(event.blockInfo.globalSlotSinceGenesis),
      chainStatus: event.blockInfo.chainStatus,
    };
  });
}

/**
 * Fetches account actions for a specified public key and token ID by performing a GraphQL query.
 *
 * @param accountInfo - An {@link ActionsQueryInputs} containing the public key, and optional query parameters for the actions query
 * @param graphqlEndpoint - The GraphQL endpoint to fetch from. Defaults to the configured Mina endpoint.
 * @param headers - Optional headers to pass to the fetch request
 *
 * @returns A promise that resolves to an object containing the final actions hash for the account, and a list of actions
 * @throws Will throw an error if the GraphQL endpoint is invalid or if the fetch request fails.
 *
 * @example
 * ```ts
 * const accountInfo = { publicKey: 'B62qiwmXrWn7Cok5VhhB3KvCwyZ7NHHstFGbiU5n7m8s2RqqNW1p1wF' };
 * const actionsList = await fetchAccount(accountInfo);
 * console.log(actionsList);
 * ```
 */
async function fetchActions(
  accountInfo: ActionsQueryInputs,
  graphqlEndpoint = networkConfig.archiveEndpoint,
  headers?: HeadersInit
): Promise<
  | {
      actions: string[][];
      hash: string;
    }[]
  | { error: FetchError }
> {
  if (!graphqlEndpoint)
    throw Error(
      'fetchActions: Specified GraphQL endpoint is undefined. When using actions, you must set the archive node endpoint in Mina.Network(). Please ensure your Mina.Network() configuration includes an archive node endpoint.'
    );
  const { publicKey, actionStates, tokenId = TokenId.toBase58(TokenId.default) } = accountInfo;

  let [response, error] = await makeGraphqlRequest<ActionQueryResponse>(
    getActionsQuery(publicKey, actionStates, tokenId),
    graphqlEndpoint,
    networkConfig.archiveFallbackEndpoints,
    { headers: { ...networkConfig.archiveDefaultHeaders, ...headers } }
  );
  // As of 2025-01-07, minascan is running a version of the node which supports `sequenceNumber` and `zkappAccountUpdateIds` fields
  // We could consider removing this fallback since no other nodes are widely used
  if (error) {
    const originalError = error;
    [response, error] = await makeGraphqlRequest<ActionQueryResponse>(
      getActionsQuery(
        publicKey,
        actionStates,
        tokenId,
        /* _filterOptions= */ undefined,
        /* _excludeTransactionInfo= */ true
      ),
      graphqlEndpoint,
      networkConfig.archiveFallbackEndpoints,
      { headers: { ...networkConfig.archiveDefaultHeaders, ...headers } }
    );
    if (error)
      throw Error(
        `ORIGINAL ERROR: ${originalError.statusText} \n\nRETRY ERROR: ${error.statusText}`
      );
  }
  let fetchedActions = response?.data.actions;
  if (fetchedActions === undefined) {
    return {
      error: {
        statusCode: 404,
        statusText: `fetchActions: Account with public key ${publicKey} with tokenId ${tokenId} does not exist.`,
      },
    };
  }

  const actionsList = createActionsList(accountInfo, fetchedActions);
  addCachedActions({ publicKey, tokenId }, actionsList, graphqlEndpoint);

  return actionsList;
}

/**
 * Given a graphQL response from #getActionsQuery, process the actions into a canonical actions list
 */
export function createActionsList(
  accountInfo: ActionsQueryInputs,
  fetchedActions: FetchedAction[]
) {
  const _fetchedActions = fetchedActions;
  const { publicKey, actionStates } = accountInfo;

  let actionsList: { actions: string[][]; hash: string }[] = [];
  // correct for archive node sending one block too many
  if (
    fetchedActions.length !== 0 &&
    fetchedActions[0].actionState.actionStateOne === actionStates.fromActionState
  ) {
    fetchedActions = fetchedActions.slice(1);
  }

  fetchedActions.forEach((actionBlock) => {
    let { actionData } = actionBlock;
    let latestActionState = Field(actionBlock.actionState.actionStateTwo);
    let actionState = actionBlock.actionState.actionStateOne;

    if (actionData.length === 0)
      throw Error(
        `No action data was found for the account ${publicKey} with the latest action state ${actionState}`
      );

    // DEPRECATED: In case the archive node is running an out-of-date version, best guess is to sort by the account update id
    // As of 2025-01-07, minascan is running a version of the node which supports `sequenceNumber` and `zkappAccountUpdateIds` fields
    // We could consider removing this fallback since no other nodes are widely used
    if (!actionData[0].transactionInfo) {
      actionData = actionData.sort((a1, a2) => {
        return Number(a1.accountUpdateId) - Number(a2.accountUpdateId);
      });
    } else {
      // sort actions within one block by transaction sequence number and account update sequence
      actionData = actionData.sort((a1, a2) => {
        const a1TxSequence = a1.transactionInfo!.sequenceNumber;
        const a2TxSequence = a2.transactionInfo!.sequenceNumber;
        if (a1TxSequence === a2TxSequence) {
          const a1AuSequence = a1.transactionInfo!.zkappAccountUpdateIds.indexOf(
            Number(a1.accountUpdateId)
          );
          const a2AuSequence = a2.transactionInfo!.zkappAccountUpdateIds.indexOf(
            Number(a2.accountUpdateId)
          );
          return a1AuSequence - a2AuSequence;
        } else {
          return a1TxSequence - a2TxSequence;
        }
      });
    }

    // split actions by account update
    let actionsByAccountUpdate: string[][][] = [];
    let currentAccountUpdateId = 'none';
    let currentActions: string[][];
    actionData.forEach(({ accountUpdateId, data }) => {
      if (accountUpdateId === currentAccountUpdateId) {
        currentActions.push(data);
      } else {
        currentAccountUpdateId = accountUpdateId;
        currentActions = [data];
        actionsByAccountUpdate.push(currentActions);
      }
    });

    // re-hash actions
    for (let actions of actionsByAccountUpdate) {
      latestActionState = updateActionState(actions, latestActionState);
      actionsList.push({ actions, hash: latestActionState.toString() });
    }

    const finalActionState = latestActionState.toString();
    const expectedActionState = actionState;

    if (finalActionState !== expectedActionState) {
      throw new Error(
        `Failed to derive correct actions hash for ${publicKey}.
        Derived hash: ${finalActionState}, expected hash: ${expectedActionState}).
        All action hashes derived: ${JSON.stringify(actionsList, null, 2)}
        Please try a different Archive Node API endpoint.
        `
      );
    }
  });
  return actionsList;
}

/**
 * Fetches genesis constants.
 */
async function fetchGenesisConstants(
  graphqlEndpoint = networkConfig.minaEndpoint,
  headers?: HeadersInit
): Promise<GenesisConstants> {
  let [resp, error] = await makeGraphqlRequest<GenesisConstantsResponse>(
    genesisConstantsQuery,
    graphqlEndpoint,
    networkConfig.minaFallbackEndpoints,
    { headers: { ...networkConfig.minaDefaultHeaders, ...headers } }
  );
  if (error) throw Error(error.statusText);
  const genesisConstants = resp?.data?.genesisConstants;
  const consensusConfiguration = resp?.data?.daemonStatus?.consensusConfiguration;
  if (genesisConstants === undefined || consensusConfiguration === undefined) {
    throw Error('Failed to fetch genesis constants.');
  }
  const data = {
    genesisTimestamp: genesisConstants.genesisTimestamp,
    coinbase: Number(genesisConstants.coinbase),
    accountCreationFee: Number(genesisConstants.accountCreationFee),
    epochDuration: Number(consensusConfiguration.epochDuration),
    k: Number(consensusConfiguration.k),
    slotDuration: Number(consensusConfiguration.slotDuration),
    slotsPerEpoch: Number(consensusConfiguration.slotsPerEpoch),
  };
  genesisConstantsCache[graphqlEndpoint] = data;
  return data as GenesisConstants;
}

namespace Lightnet {
  /**
   * Gets random key pair (public and private keys) from account manager
   * that operates with accounts configured in target network Genesis Ledger.
   *
   * If an error is returned by the specified endpoint, an error is thrown. Otherwise,
   * the data is returned.
   *
   * @param options.isRegularAccount Whether to acquire key pair of regular or zkApp account (one with already configured verification key)
   * @param options.lightnetAccountManagerEndpoint Account manager endpoint to fetch from
   * @returns Key pair
   */
  export async function acquireKeyPair(
    options: {
      isRegularAccount?: boolean;
      lightnetAccountManagerEndpoint?: string;
    } = {}
  ): Promise<{
    publicKey: PublicKey;
    privateKey: PrivateKey;
  }> {
    const {
      isRegularAccount = true,
      lightnetAccountManagerEndpoint = networkConfig.lightnetAccountManagerEndpoint,
    } = options;
    const response = await fetch(
      `${lightnetAccountManagerEndpoint}/acquire-account?isRegularAccount=${isRegularAccount}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data) {
        return {
          publicKey: PublicKey.fromBase58(data.pk),
          privateKey: PrivateKey.fromBase58(data.sk),
        };
      }
    }

    throw new Error('Failed to acquire the key pair');
  }

  /**
   * Releases previously acquired key pair by public key.
   *
   * @param options.publicKey Public key of previously acquired key pair to release
   * @param options.lightnetAccountManagerEndpoint Account manager endpoint to fetch from
   * @returns Response message from the account manager as string or null if the request failed
   */
  export async function releaseKeyPair(options: {
    publicKey: string;
    lightnetAccountManagerEndpoint?: string;
  }): Promise<string | null> {
    const {
      publicKey,
      lightnetAccountManagerEndpoint = networkConfig.lightnetAccountManagerEndpoint,
    } = options;
    const response = await fetch(`${lightnetAccountManagerEndpoint}/release-account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pk: publicKey,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data) {
        return data.message as string;
      }
    }

    return null;
  }

  /**
   * Gets previously acquired key pairs list.
   *
   * @param options.lightnetAccountManagerEndpoint Account manager endpoint to fetch from
   * @returns Key pairs list or null if the request failed
   */
  export async function listAcquiredKeyPairs(options: {
    lightnetAccountManagerEndpoint?: string;
  }): Promise<Array<{
    publicKey: PublicKey;
    privateKey: PrivateKey;
  }> | null> {
    const { lightnetAccountManagerEndpoint = networkConfig.lightnetAccountManagerEndpoint } =
      options;
    const response = await fetch(`${lightnetAccountManagerEndpoint}/list-acquired-accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data) {
        return data.map((account: any) => ({
          publicKey: PublicKey.fromBase58(account.pk),
          privateKey: PrivateKey.fromBase58(account.sk),
        }));
      }
    }

    return null;
  }
}

function updateActionState(actions: string[][], actionState: Field) {
  let actionHash = Actions.fromJSON(actions).hash;
  return Actions.updateSequenceState(actionState, actionHash);
}

// TODO it seems we're not actually catching most errors here
async function makeGraphqlRequest<TDataResponse = any>(
  query: string,
  graphqlEndpoint = networkConfig.minaEndpoint,
  fallbackEndpoints: string[],
  { timeout = defaultTimeout, headers } = {} as FetchConfig
) {
  if (graphqlEndpoint === 'none')
    throw Error(
      "Should have made a graphql request, but don't know to which endpoint. Try calling `setGraphqlEndpoint` first."
    );
  let timeouts: NodeJS.Timeout[] = [];
  const clearTimeouts = () => {
    timeouts.forEach((t) => clearTimeout(t));
    timeouts = [];
  };

  const makeRequest = async (url: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    timeouts.push(timer);
    let body = JSON.stringify({ operationName: null, query, variables: {} });
    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body,
        signal: controller.signal,
      });
      return checkResponseStatus<TDataResponse>(response);
    } finally {
      clearTimeouts();
    }
  };
  // try to fetch from endpoints in pairs
  let timeoutErrors: { url1: string; url2: string; error: any }[] = [];
  let urls = [graphqlEndpoint, ...fallbackEndpoints];
  for (let i = 0; i < urls.length; i += 2) {
    let url1 = urls[i];
    let url2 = urls[i + 1];
    if (url2 === undefined) {
      try {
        return await makeRequest(url1);
      } catch (error) {
        return [undefined, inferError(error)] as [undefined, FetchError];
      }
    }
    try {
      return await Promise.race([makeRequest(url1), makeRequest(url2)]);
    } catch (unknownError) {
      let error = inferError(unknownError);
      if (error.statusCode === 408) {
        // If the request timed out, try the next 2 endpoints
        timeoutErrors.push({ url1, url2, error });
      } else {
        // If the request failed for some other reason (e.g. o1js error), return the error
        return [undefined, error] as [undefined, FetchError];
      }
    }
  }
  const statusText = timeoutErrors
    .map(({ url1, url2, error }) => `Request to ${url1} and ${url2} timed out. Error: ${error}`)
    .join('\n');
  return [undefined, { statusCode: 408, statusText }] as [undefined, FetchError];
}

async function checkResponseStatus<TDataResponse>(
  response: Response
): Promise<[FetchResponse<TDataResponse>, undefined] | [undefined, FetchError]> {
  if (response.ok) {
    let jsonResponse = await response.json();
    if (jsonResponse.errors && jsonResponse.errors.length > 0) {
      return [
        undefined,
        {
          statusCode: response.status,
          statusText: jsonResponse.errors.map((error: any) => error.message).join('\n'),
        } as FetchError,
      ];
    } else if (jsonResponse.data === undefined) {
      return [
        undefined,
        {
          statusCode: response.status,
          statusText: `GraphQL response data is undefined`,
        } as FetchError,
      ];
    }
    return [jsonResponse as FetchResponse<TDataResponse>, undefined];
  } else {
    return [
      undefined,
      {
        statusCode: response.status,
        statusText: response.statusText,
      } as FetchError,
    ];
  }
}

function inferError(error: unknown): FetchError {
  let errorMessage = JSON.stringify(error);
  if (error instanceof AbortSignal) {
    return { statusCode: 408, statusText: `Request Timeout: ${errorMessage}` };
  } else {
    return {
      statusCode: 500,
      statusText: `Unknown Error: ${errorMessage}`,
    };
  }
}
