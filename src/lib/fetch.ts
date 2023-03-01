import 'isomorphic-fetch';
import { Field } from '../snarky.js';
import { UInt32, UInt64 } from './int.js';
import { TokenId } from './account_update.js';
import { PublicKey } from './signature.js';
import { NetworkValue } from './precondition.js';
import { Types } from '../provable/types.js';
import * as Encoding from './encoding.js';
import {
  Account,
  accountQuery,
  FetchedAccount,
  fillPartialAccount,
  parseFetchedAccount,
  PartialAccount,
} from './mina/account.js';

export {
  fetchAccount,
  fetchLastBlock,
  parseFetchedAccount,
  markAccountToBeFetched,
  markNetworkToBeFetched,
  fetchMissingData,
  fetchTransactionStatus,
  TransactionStatus,
  EventActionFilterOptions,
  getCachedAccount,
  getCachedNetwork,
  addCachedAccount,
  defaultGraphqlEndpoint,
  archiveGraphqlEndpoint,
  setGraphqlEndpoint,
  setArchiveGraphqlEndpoint,
  sendZkappQuery,
  sendZkapp,
  removeJsonQuotes,
  fetchEvents,
};

let defaultGraphqlEndpoint = 'none';
let archiveGraphqlEndpoint = 'none';
/**
 * Specifies the default GraphQL endpoint.
 */
function setGraphqlEndpoint(graphqlEndpoint: string) {
  defaultGraphqlEndpoint = graphqlEndpoint;
}

function setArchiveGraphqlEndpoint(graphqlEndpoint: string) {
  archiveGraphqlEndpoint = graphqlEndpoint;
}

/**
 * Gets account information on the specified publicKey by performing a GraphQL query
 * to the specified endpoint. This will call the 'GetAccountInfo' query which fetches
 * zkapp related account information.
 *
 * If an error is returned by the specified endpoint, an error is thrown. Otherwise,
 * the data is returned.
 *
 * @param publicKey The specified account to get account information on
 * @param graphqlEndpoint The graphql endpoint to fetch from
 * @param config An object that exposes an additional timeout option
 * @returns zkapp information on the specified account or an error is thrown
 */
async function fetchAccount(
  accountInfo: { publicKey: string | PublicKey; tokenId?: string },
  graphqlEndpoint = defaultGraphqlEndpoint,
  { timeout = defaultTimeout } = {}
): Promise<
  | { account: Types.Account; error: undefined }
  | { account: undefined; error: FetchError }
> {
  let publicKeyBase58 =
    accountInfo.publicKey instanceof PublicKey
      ? accountInfo.publicKey.toBase58()
      : accountInfo.publicKey;
  return await fetchAccountInternal(
    { publicKey: publicKeyBase58, tokenId: accountInfo.tokenId },
    graphqlEndpoint,
    {
      timeout,
    }
  );
}

// internal version of fetchAccount which does the same, but returns the original JSON version
// of the account, to save some back-and-forth conversions when caching accounts
async function fetchAccountInternal(
  accountInfo: { publicKey: string; tokenId?: string },
  graphqlEndpoint = defaultGraphqlEndpoint,
  config?: FetchConfig
) {
  const { publicKey, tokenId } = accountInfo;
  let [response, error] = await makeGraphqlRequest(
    accountQuery(publicKey, tokenId ?? TokenId.toBase58(TokenId.default)),
    graphqlEndpoint,
    config
  );
  if (error !== undefined) return { account: undefined, error };
  let fetchedAccount = (response as FetchResponse).data
    .account as FetchedAccount | null;
  if (fetchedAccount === null) {
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

type FetchConfig = { timeout?: number };
type FetchResponse = { data: any };
type FetchError = {
  statusCode: number;
  statusText: string;
};
// Specify 30s as the default timeout
const defaultTimeout = 30000;

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
let accountsToFetch = {} as Record<
  string,
  { publicKey: string; tokenId: string; graphqlEndpoint: string }
>;
let networksToFetch = {} as Record<string, { graphqlEndpoint: string }>;

function markAccountToBeFetched(
  publicKey: PublicKey,
  tokenId: Field,
  graphqlEndpoint: string
) {
  let publicKeyBase58 = publicKey.toBase58();
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

async function fetchMissingData(graphqlEndpoint: string) {
  let promises = Object.entries(accountsToFetch).map(
    async ([key, { publicKey, tokenId }]) => {
      let response = await fetchAccountInternal(
        { publicKey, tokenId },
        graphqlEndpoint
      );
      if (response.error === undefined) delete accountsToFetch[key];
    }
  );
  let network = Object.entries(networksToFetch).find(([, network]) => {
    return network.graphqlEndpoint === graphqlEndpoint;
  });
  if (network !== undefined) {
    promises.push(
      (async () => {
        try {
          await fetchLastBlock(graphqlEndpoint);
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
  graphqlEndpoint = defaultGraphqlEndpoint
): Account | undefined {
  return accountCache[accountCacheKey(publicKey, tokenId, graphqlEndpoint)]
    ?.account;
}

function getCachedNetwork(graphqlEndpoint = defaultGraphqlEndpoint) {
  return networkCache[graphqlEndpoint]?.network;
}

/**
 * Adds an account to the local cache, indexed by a GraphQL endpoint.
 */
function addCachedAccount(
  partialAccount: PartialAccount,
  graphqlEndpoint = defaultGraphqlEndpoint
) {
  let account = fillPartialAccount(partialAccount);
  addCachedAccountInternal(account, graphqlEndpoint);
}

function addCachedAccountInternal(account: Account, graphqlEndpoint: string) {
  accountCache[
    accountCacheKey(account.publicKey, account.tokenId, graphqlEndpoint)
  ] = {
    account,
    graphqlEndpoint,
    timestamp: Date.now(),
  };
}

function accountCacheKey(
  publicKey: PublicKey,
  tokenId: Field,
  graphqlEndpoint: string
) {
  return `${publicKey.toBase58()};${TokenId.toBase58(
    tokenId
  )};${graphqlEndpoint}`;
}

/**
 * Fetches the last block on the Mina network.
 */
async function fetchLastBlock(graphqlEndpoint = defaultGraphqlEndpoint) {
  let [resp, error] = await makeGraphqlRequest(lastBlockQuery, graphqlEndpoint);
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

const lastBlockQuery = `{
  bestChain(maxLength: 1) {
    protocolState {
      blockchainState {
        snarkedLedgerHash
        stagedLedgerHash
        date
        utcDate
        stagedLedgerProofEmitted
      }
      previousStateHash
      consensusState {
        blockHeight
        slotSinceGenesis
        slot
        nextEpochData {
          ledger {hash totalCurrency}
          seed
          startCheckpoint
          lockCheckpoint
          epochLength
        }
        stakingEpochData {
          ledger {hash totalCurrency}
          seed
          startCheckpoint
          lockCheckpoint
          epochLength
        }
        epochCount
        minWindowDensity
        totalCurrency
        epoch
      }
    }
  }
}`;

type FetchedBlock = {
  protocolState: {
    blockchainState: {
      snarkedLedgerHash: string; // hash-like encoding
      stagedLedgerHash: string; // hash-like encoding
      date: string; // String(Date.now())
      utcDate: string; // String(Date.now())
      stagedLedgerProofEmitted: boolean; // bool
    };
    previousStateHash: string; // hash-like encoding
    consensusState: {
      blockHeight: string; // String(number)
      slotSinceGenesis: string; // String(number)
      slot: string; // String(number)
      nextEpochData: {
        ledger: {
          hash: string; // hash-like encoding
          totalCurrency: string; // String(number)
        };
        seed: string; // hash-like encoding
        startCheckpoint: string; // hash-like encoding
        lockCheckpoint: string; // hash-like encoding
        epochLength: string; // String(number)
      };
      stakingEpochData: {
        ledger: {
          hash: string; // hash-like encoding
          totalCurrency: string; // String(number)
        };
        seed: string; // hash-like encoding
        startCheckpoint: string; // hash-like encoding
        lockCheckpoint: string; // hash-like encoding
        epochLength: string; // String(number)
      };
      epochCount: string; // String(number)
      minWindowDensity: string; // String(number)
      totalCurrency: string; // String(number)
      epoch: string; // String(number)
    };
  };
};

function parseFetchedBlock({
  protocolState: {
    blockchainState: { snarkedLedgerHash, utcDate },
    consensusState: {
      blockHeight,
      minWindowDensity,
      totalCurrency,
      slot,
      slotSinceGenesis,
      nextEpochData,
      stakingEpochData,
    },
  },
}: FetchedBlock): NetworkValue {
  return {
    snarkedLedgerHash: Encoding.LedgerHash.fromBase58(snarkedLedgerHash),
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
      hash: Encoding.LedgerHash.fromBase58(hash),
      totalCurrency: UInt64.from(totalCurrency),
    },
    seed: Encoding.EpochSeed.fromBase58(seed),
    startCheckpoint: Encoding.StateHash.fromBase58(startCheckpoint),
    lockCheckpoint: Encoding.StateHash.fromBase58(lockCheckpoint),
    epochLength: UInt32.from(epochLength),
  };
}

const transactionStatusQuery = (txId: string) => `query {
  transactionStatus(zkappTransaction:"${txId}")
}`;

/**
 * Fetches the status of a transaction.
 */
async function fetchTransactionStatus(
  txId: string,
  graphqlEndpoint = defaultGraphqlEndpoint
): Promise<TransactionStatus> {
  let [resp, error] = await makeGraphqlRequest(
    transactionStatusQuery(txId),
    graphqlEndpoint
  );
  if (error) throw Error(error.statusText);
  let txStatus = resp?.data?.transactionStatus;
  if (txStatus === undefined || txStatus === null) {
    throw Error(`Failed to fetch transaction status. TransactionId: ${txId}`);
  }
  return txStatus as TransactionStatus;
}

/**
 * INCLUDED: A transaction that is on the longest chain
 *
 * PENDING: A transaction either in the transition frontier or in transaction pool but is not on the longest chain
 *
 * UNKNOWN: The transaction has either been snarked, reached finality through consensus or has been dropped
 *
 */
type TransactionStatus = 'INCLUDED' | 'PENDING' | 'UNKNOWN';

/**
 * Sends a zkApp command (transaction) to the specified GraphQL endpoint.
 */
function sendZkapp(
  json: string,
  graphqlEndpoint = defaultGraphqlEndpoint,
  { timeout = defaultTimeout } = {}
) {
  return makeGraphqlRequest(sendZkappQuery(json), graphqlEndpoint, {
    timeout,
  });
}

// TODO: Decide an appropriate response structure.
function sendZkappQuery(json: string) {
  return `mutation {
  sendZkapp(input: {
    zkappCommand: ${removeJsonQuotes(json)}
  }) {
    zkapp {
      hash
      id
      failureReason {
        failures
        index
      }
      zkappCommand {
        memo
        feePayer {
          body {
            publicKey
          }
        }
        accountUpdates {
          body {
            publicKey
            useFullCommitment
            incrementNonce
          }
        }
      }
    }
  }
}
`;
}

const getEventsQuery = (
  publicKey: string,
  tokenId: string,
  filterOptions?: EventActionFilterOptions
) => {
  const { to, from } = filterOptions ?? {};
  let input = `address: "${publicKey}", tokenId: "${tokenId}"`;
  if (to !== undefined) {
    input += `, to: ${to}`;
  }
  if (from !== undefined) {
    input += `, from: ${from}`;
  }
  return `{
  events(input: { ${input} }) {
    blockInfo {
      distanceFromMaxBlockHeight
      height
    }
    eventData {
      index
      data
    }
  }
}
`;
};

type EventActionFilterOptions = {
  to?: UInt32;
  from?: UInt32;
};
/**
 * Fetches the events for an account.
 */
async function fetchEvents(
  accountInfo: { publicKey: string; tokenId?: string },
  graphqlEndpoint = archiveGraphqlEndpoint,
  filterOptions: EventActionFilterOptions = {}
): Promise<any> {
  const { publicKey, tokenId } = accountInfo;
  let [response, error] = await makeGraphqlRequest(
    getEventsQuery(
      publicKey,
      tokenId ?? TokenId.toBase58(TokenId.default),
      filterOptions
    ),
    graphqlEndpoint
  );
  if (error) throw Error(error.statusText);
  let fetchedEvents = response?.data.events;
  if (fetchedEvents === undefined) {
    throw Error(
      `Failed to fetch events data. Account: ${publicKey} Token: ${tokenId}`
    );
  }

  // TODO: Is this what we want to do? Should we just return the events?
  // If we have multiple blocks returned at the best tip (e.g. distanceFromMaxBlockHeight === 0),
  // then filter out the blocks at the best tip. This is because we cannot guarantee that every block
  // at the best tip will have the correct event data or guarantee that the specific block data will not
  // fork in anyway. If this happens, we delay fetching event data until another block has been added to the network.
  let numberOfBestTipBlocks = 0;
  for (let i = 0; i < fetchedEvents.length; i++) {
    if (fetchedEvents[i].blockInfo.distanceFromMaxBlockHeight === 0) {
      numberOfBestTipBlocks++;
    }
    if (numberOfBestTipBlocks > 1) {
      fetchedEvents = fetchedEvents.filter((event: any) => {
        return event.blockInfo.distanceFromMaxBlockHeight !== 0;
      });
      break;
    }
  }

  return fetchedEvents.map((event: any) => {
    const events = event.eventData.map(
      (eventData: { index: string; data: string[] }) => {
        return [eventData.index].concat(eventData.data);
      }
    );
    return {
      events,
      height: event.blockInfo.height,
    };
  });
}

// removes the quotes on JSON keys
function removeJsonQuotes(json: string) {
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/\"(\S+)\"\s*:/gm, '$1:');
}

// TODO it seems we're not actually catching most errors here
async function makeGraphqlRequest(
  query: string,
  graphqlEndpoint = defaultGraphqlEndpoint,
  { timeout = defaultTimeout } = {} as FetchConfig
) {
  if (graphqlEndpoint === 'none')
    throw Error(
      "Should have made a graphql request, but don't know to which endpoint. Try calling `setGraphqlEndpoint` first."
    );
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    let body = JSON.stringify({ operationName: null, query, variables: {} });
    let response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    return await checkResponseStatus(response);
  } catch (error) {
    clearTimeout(timer);
    return [undefined, inferError(error)] as [undefined, FetchError];
  }
}

async function checkResponseStatus(
  response: Response
): Promise<[FetchResponse, undefined] | [undefined, FetchError]> {
  if (response.ok) {
    return [(await response.json()) as FetchResponse, undefined];
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
