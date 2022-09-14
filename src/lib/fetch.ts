import 'isomorphic-fetch';
import { Bool, Field, Ledger } from '../snarky.js';
import { UInt32, UInt64 } from './int.js';
import {
  TokenId,
  Permission,
  Permissions,
  ZkappStateLength,
} from './account_update.js';
import { PublicKey } from './signature.js';
import { NetworkValue } from './precondition.js';
import { Types } from '../snarky/types.js';
import * as Encoding from './encoding.js';

export {
  fetchAccount,
  fetchLastBlock,
  parseFetchedAccount,
  markAccountToBeFetched,
  markNetworkToBeFetched,
  fetchMissingData,
  getCachedAccount,
  getCachedNetwork,
  addCachedAccount,
  defaultGraphqlEndpoint,
  setGraphqlEndpoint,
  sendZkappQuery,
  sendZkapp,
};
export { Account };

let defaultGraphqlEndpoint = 'none';
function setGraphqlEndpoint(graphqlEndpoint: string) {
  defaultGraphqlEndpoint = graphqlEndpoint;
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
  | { account: Account; error: undefined }
  | { account: undefined; error: FetchError }
> {
  let publicKeyBase58 =
    accountInfo.publicKey instanceof PublicKey
      ? accountInfo.publicKey.toBase58()
      : accountInfo.publicKey;
  let response = await fetchAccountInternal(
    { publicKey: publicKeyBase58, tokenId: accountInfo.tokenId },
    graphqlEndpoint,
    {
      timeout,
    }
  );
  return response.error === undefined
    ? {
        account: parseFetchedAccount(response.account),
        error: undefined,
      }
    : { account: undefined, error: response.error };
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
  let account = (response as FetchResponse).data
    .account as FetchedAccount | null;
  if (account === null) {
    return {
      account: undefined,
      error: {
        statusCode: 404,
        statusText: `fetchAccount: Account with public key ${publicKey} does not exist.`,
      },
    };
  }
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

type AuthRequired = Types.Json.AuthRequired;
function toPermission(p: AuthRequired): Permission {
  switch (p) {
    case 'None':
      return Permission.none();
    case 'Proof':
      return Permission.proof();
    case 'Signature':
      return Permission.signature();
    case 'Either':
      return Permission.proofOrSignature();
    case 'Impossible':
      return Permission.impossible();
    default:
      throw Error('unexpected permission');
  }
}

type FetchedAccount = {
  publicKey: string;
  nonce: string;
  token: string;
  tokenSymbol: string;
  zkappUri?: string;
  zkappState: string[] | null;
  receiptChainHash?: string;
  balance: { total: string };
  permissions?: {
    editState: AuthRequired;
    send: AuthRequired;
    receive: AuthRequired;
    setDelegate: AuthRequired;
    setPermissions: AuthRequired;
    setVerificationKey: AuthRequired;
    setZkappUri: AuthRequired;
    editSequenceState: AuthRequired;
    setTokenSymbol: AuthRequired;
    incrementNonce: AuthRequired;
    setVotingFor: AuthRequired;
  };
  delegateAccount?: { publicKey: string };
  sequenceEvents?: string[] | null;
  // TODO: how to query provedState?
};

type Account = {
  publicKey: PublicKey;
  nonce: UInt32;
  balance: UInt64;
  tokenId: Field;
  tokenSymbol: string;
  appState?: Field[];
  permissions?: Permissions;
  receiptChainHash: Field;
  delegate?: PublicKey;
  sequenceState?: Field;
  provedState: Bool;
};

type FlexibleAccount = {
  publicKey: PublicKey | string;
  nonce: UInt32 | string | number;
  tokenId?: string;
  tokenSymbol?: string;
  balance?: UInt64 | string | number;
  zkapp?: { appState: (Field | string | number)[] };
};

// TODO provedState
const accountQuery = (publicKey: string, tokenId: string) => `{
  account(publicKey: "${publicKey}", token: "${tokenId}") {
    publicKey
    nonce
    zkappUri
    zkappState
    permissions {
      editState
      send
      receive
      setDelegate
      setPermissions
      setVerificationKey
      setZkappUri
      editSequenceState
      setTokenSymbol
      incrementNonce
      setVotingFor
    }
    receiptChainHash
    balance { total }
    delegateAccount { publicKey }
    sequenceEvents
    token
    tokenSymbol
  }
}
`;

// TODO automate these conversions (?)
function parseFetchedAccount(account: FetchedAccount): Account;
function parseFetchedAccount(
  account: Partial<FetchedAccount>
): Partial<Account>;
function parseFetchedAccount({
  publicKey,
  nonce,
  zkappState,
  balance,
  permissions,
  delegateAccount,
  receiptChainHash,
  sequenceEvents,
  token,
  tokenSymbol,
}: Partial<FetchedAccount>): Partial<Account> {
  return {
    publicKey:
      publicKey !== undefined ? PublicKey.fromBase58(publicKey) : undefined,
    nonce: nonce !== undefined ? UInt32.fromString(nonce) : undefined,
    balance: balance && UInt64.fromString(balance.total),
    appState: (zkappState && zkappState.map(Field)) ?? undefined,
    permissions:
      permissions &&
      (Object.fromEntries(
        Object.entries(permissions).map(([k, v]) => [k, toPermission(v)])
      ) as unknown as Permissions),
    sequenceState:
      sequenceEvents != undefined ? Field(sequenceEvents[0]) : undefined,
    receiptChainHash:
      receiptChainHash !== undefined
        ? Encoding.ReceiptChainHash.fromBase58(receiptChainHash)
        : undefined,
    delegate:
      delegateAccount && PublicKey.fromBase58(delegateAccount.publicKey),
    tokenId: token !== undefined ? Ledger.fieldOfBase58(token) : undefined,
    tokenSymbol: tokenSymbol !== undefined ? tokenSymbol : undefined,
  };
}

function stringifyAccount(account: FlexibleAccount): FetchedAccount {
  let { publicKey, nonce, balance, zkapp, tokenId, tokenSymbol } = account;
  return {
    publicKey:
      publicKey instanceof PublicKey ? publicKey.toBase58() : publicKey,
    nonce: nonce?.toString(),
    zkappState:
      zkapp?.appState.map((s) => s.toString()) ??
      Array(ZkappStateLength).fill('0'),
    balance: { total: balance?.toString() ?? '0' },
    token: tokenId ?? TokenId.toBase58(TokenId.default),
    tokenSymbol: tokenSymbol ?? '',
  };
}

let accountCache = {} as Record<
  string,
  {
    account: FetchedAccount;
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
let cacheExpiry = 10 * 60 * 1000; // 10 minutes

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
  let expired = Date.now() - cacheExpiry;
  let accounts = Object.entries(accountsToFetch).filter(([key, account]) => {
    if (account.graphqlEndpoint !== graphqlEndpoint) return false;
    let cachedAccount = accountCache[key];
    return cachedAccount === undefined || cachedAccount.timestamp < expired;
  });
  let promises = accounts.map(async ([key, { publicKey, tokenId }]) => {
    let response = await fetchAccountInternal(
      { publicKey, tokenId },
      graphqlEndpoint
    );
    if (response.error === undefined) delete accountsToFetch[key];
  });

  let network = Object.entries(networksToFetch).find(([key, network]) => {
    if (network.graphqlEndpoint !== graphqlEndpoint) return;
    let cachedNetwork = networkCache[key];
    return cachedNetwork === undefined || cachedNetwork.timestamp < expired;
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
) {
  let account =
    accountCache[
      `${publicKey.toBase58()};${TokenId.toBase58(tokenId)};${graphqlEndpoint}`
    ]?.account;
  if (account !== undefined) return parseFetchedAccount(account);
}
function getCachedNetwork(graphqlEndpoint = defaultGraphqlEndpoint) {
  return networkCache[graphqlEndpoint]?.network;
}

function addCachedAccount(
  account: {
    publicKey: string | PublicKey;
    nonce: string | number | UInt32;
    balance?: string | number | UInt64;
    zkapp?: {
      appState: (string | number | Field)[];
    };
    tokenId: string;
  },
  graphqlEndpoint = defaultGraphqlEndpoint
) {
  addCachedAccountInternal(stringifyAccount(account), graphqlEndpoint);
}

function addCachedAccountInternal(
  account: FetchedAccount,
  graphqlEndpoint: string
) {
  accountCache[`${account.publicKey};${account.token};${graphqlEndpoint}`] = {
    account,
    graphqlEndpoint,
    timestamp: Date.now(),
  };
}

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
    timestamp: UInt64.fromString(utcDate),
    blockchainLength: UInt32.fromString(blockHeight),
    minWindowDensity: UInt32.fromString(minWindowDensity),
    totalCurrency: UInt64.fromString(totalCurrency),
    // is this really `slot`?
    globalSlotSinceHardFork: UInt32.fromString(slot),
    globalSlotSinceGenesis: UInt32.fromString(slotSinceGenesis),
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
      totalCurrency: UInt64.fromString(totalCurrency),
    },
    seed: Encoding.EpochSeed.fromBase58(seed),
    startCheckpoint: Encoding.StateHash.fromBase58(startCheckpoint),
    lockCheckpoint: Encoding.StateHash.fromBase58(lockCheckpoint),
    epochLength: UInt32.fromString(epochLength),
  };
}

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

// removes the quotes on JSON keys
function removeJsonQuotes(json: string) {
  // source: https://stackoverflow.com/a/65443215
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, (match) =>
    match.replace(/"/g, '')
  );
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
