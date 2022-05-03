import 'isomorphic-fetch';
import { Field } from '../snarky';
import { UInt32, UInt64 } from './int';
import { ZkappStateLength } from './party';
import { PublicKey } from './signature';

export {
  fetchAccount,
  parseFetchedAccount,
  markAccountToBeFetched,
  fetchMissingAccounts,
  getCachedAccount,
  addCachedAccount,
  defaultGraphqlEndpoint,
  setGraphqlEndpoint,
  sendZkappQuery,
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
  publicKey: string | PublicKey,
  graphqlEndpoint = defaultGraphqlEndpoint,
  { timeout = defaultTimeout } = {}
): Promise<
  | { account: Account; error: undefined }
  | { account: undefined; error: FetchError }
> {
  let publicKeyBase58 =
    publicKey instanceof PublicKey ? publicKey.toBase58() : publicKey;
  let response = await fetchAccountInternal(publicKeyBase58, graphqlEndpoint, {
    timeout,
  });
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
  publicKey: string,
  graphqlEndpoint = defaultGraphqlEndpoint,
  config?: FetchConfig
) {
  let [response, error] = await makeGraphqlRequest(
    accountQuery(publicKey),
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
        statusText: 'Account does not exist.',
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

type FetchedAccount = {
  publicKey: string;
  nonce: string;
  zkappUri?: string;
  zkappState: string[] | null;
  receiptChainState?: string;
  balance: { total: string };
};

type Account = {
  publicKey: PublicKey;
  nonce: UInt32;
  balance: UInt64;
  zkapp?: { appState: Field[] };
};

type FlexibleAccount = {
  publicKey: PublicKey | string;
  nonce: UInt32 | string | number;
  balance?: UInt64 | string | number;
  zkapp?: { appState: (Field | string | number)[] };
};

// TODO add more fields
const accountQuery = (publicKey: string) => `{
  account(publicKey: "${publicKey}") {
    publicKey
    nonce
    zkappUri
    zkappState
    receiptChainHash
    balance { total }
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
}: Partial<FetchedAccount>): Partial<Account> {
  return {
    publicKey:
      publicKey !== undefined ? PublicKey.fromBase58(publicKey) : undefined,
    nonce: nonce !== undefined ? UInt32.fromString(nonce) : undefined,
    balance: balance && UInt64.fromString(balance.total),
    zkapp: (zkappState && { appState: zkappState.map(Field) }) ?? undefined,
  };
}

function stringifyAccount(account: FlexibleAccount): FetchedAccount {
  let { publicKey, nonce, balance, zkapp } = account;
  return {
    publicKey:
      publicKey instanceof PublicKey ? publicKey.toBase58() : publicKey,
    nonce: nonce?.toString(),
    zkappState:
      zkapp?.appState.map((s) => s.toString()) ??
      Array(ZkappStateLength).fill('0'),
    balance: { total: balance?.toString() ?? '0' },
  };
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

let accountCache = {} as Record<
  string,
  {
    account: FetchedAccount;
    graphqlEndpoint: string;
    timestamp: number;
  }
>;
let accountsToFetch = {} as Record<
  string,
  { publicKey: string; graphqlEndpoint: string }
>;
let cacheExpiry = 10 * 60 * 1000; // 10 minutes

function markAccountToBeFetched(publicKey: PublicKey, graphqlEndpoint: string) {
  let publicKeyBase58 = publicKey.toBase58();
  accountsToFetch[`${publicKeyBase58};${graphqlEndpoint}`] = {
    publicKey: publicKeyBase58,
    graphqlEndpoint,
  };
}

async function fetchMissingAccounts(graphqlEndpoint: string) {
  let expired = Date.now() - cacheExpiry;
  let accounts = Object.entries(accountsToFetch).filter(([key, account]) => {
    if (account.graphqlEndpoint !== graphqlEndpoint) return false;
    let cachedAccount = accountCache[key];
    return cachedAccount === undefined || cachedAccount.timestamp > expired;
  });
  await Promise.all(
    accounts.map(async ([key, { publicKey }]) => {
      console.log(publicKey);
      let response = await fetchAccountInternal(publicKey, graphqlEndpoint);
      if (response.error === undefined) delete accountsToFetch[key];
    })
  );
}

function getCachedAccount(
  publicKey: PublicKey,
  graphqlEndpoint = defaultGraphqlEndpoint
) {
  let account =
    accountCache[`${publicKey.toBase58()};${graphqlEndpoint}`]?.account;
  if (account !== undefined) return parseFetchedAccount(account);
}

function addCachedAccount(
  account: {
    publicKey: string | PublicKey;
    nonce: string | number | UInt32;
    balance?: string | number | UInt64;
    zkapp?: {
      appState: (string | number | Field)[];
    };
  },
  graphqlEndpoint = defaultGraphqlEndpoint
) {
  addCachedAccountInternal(stringifyAccount(account), graphqlEndpoint);
}

function addCachedAccountInternal(
  account: FetchedAccount,
  graphqlEndpoint: string
) {
  accountCache[`${account.publicKey};${graphqlEndpoint}`] = {
    account,
    graphqlEndpoint,
    timestamp: Date.now(),
  };
}

function sendZkappQuery(json: string) {
  return `mutation {
  sendZkapp(input: {
    parties: ${removeJsonQuotes(json)}
  }) { zkapp
    {
      parties {
        memo
      }
    }
  }
}`;
}

// removes the quotes on JSON keys
function removeJsonQuotes(json: string) {
  // source: https://stackoverflow.com/a/65443215
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/^[\t ]*"[^:\n\r]+(?<!\\)":/gm, (match) =>
    match.replace(/"/g, '')
  );
}

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
    return [undefined, inferError(error)];
  }
}
