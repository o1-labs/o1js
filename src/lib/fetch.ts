import 'isomorphic-fetch';
import { Field } from '../snarky';
import { UInt32, UInt64 } from './int';
import { ZkappStateLength } from './party';
import { PublicKey } from './signature';

export {
  getAccount,
  parseAccount,
  markAccountToBeFetched,
  fetchMissingAccounts,
  getCachedAccount,
  addCachedAccount,
  defaultGraphqlEndpoint,
  setGraphqlEndpoint,
};

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
async function getAccount(
  publicKey: string,
  graphqlEndpoint = defaultGraphqlEndpoint,
  { timeout = defaultTimeout } = {}
): Promise<
  | { account: FetchedAccount; error: undefined }
  | { account: undefined; error: FetchError }
> {
  if (graphqlEndpoint === 'none')
    throw Error(
      "Tried to fetch an account, but don't know a graphql endpoint. Try calling `setGraphqlEndpoint` first."
    );
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    let body = JSON.stringify({
      operationName: null,
      query: query(publicKey),
      variables: {},
    });
    let response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    let [value, error] = await checkResponseStatus(response);
    if (value !== undefined)
      return {
        account: (value as FetchResponse).data.account,
        error: undefined,
      };
    else return { account: undefined, error: error as FetchError };
  } catch (error) {
    clearTimeout(timer);
    return { account: undefined, error: inferError(error) };
  }
}

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
  zkappState: string[];
  receiptChainState?: string;
  balance: { total: string };
};

type Account = {
  publicKey: PublicKey;
  nonce: UInt32;
  balance: UInt64;
  zkapp: { appState: Field[] };
};

type FlexibleAccount = {
  publicKey: PublicKey | string;
  nonce: UInt32 | string | number;
  balance?: UInt64 | string | number;
  zkapp?: { appState: (Field | string | number)[] };
};

// TODO add more fields
const query = (publicKey: string) => `{
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

// TODO automate these conversions
function parseAccount(account: FetchedAccount): Account;
function parseAccount(account: Partial<FetchedAccount>): Partial<Account>;
function parseAccount({
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
    zkapp: zkappState && { appState: zkappState.map((s) => Field(s)) },
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

function inferError(error: unknown) {
  let errorMessage = JSON.stringify(error);
  if (error instanceof AbortSignal) {
    return {
      statusCode: 408,
      statusText: `Request Timeout: ${errorMessage}`,
    } as FetchError;
  } else {
    return {
      statusCode: 500,
      statusText: `Unknown Error: ${errorMessage}`,
    } as FetchError;
  }
}

// public key (base58) -> Account
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

function fetchMissingAccounts(graphqlEndpoint: string) {
  let expired = Date.now() - cacheExpiry;
  let accounts = Object.entries(accountsToFetch).filter(([key, account]) => {
    if (account.graphqlEndpoint !== graphqlEndpoint) return false;
    let cachedAccount = accountCache[key];
    return cachedAccount === undefined || cachedAccount.timestamp > expired;
  });
  return Promise.all(
    accounts.map(async ([key, { publicKey }]) => {
      let response = await getAccount(publicKey, graphqlEndpoint);
      if (response.error !== undefined) throw Error(response.error.statusText);
      let { account } = response;
      accountCache[key] = {
        account,
        graphqlEndpoint,
        timestamp: Date.now(),
      };
      delete accountsToFetch[key];
      return parseAccount(account);
    })
  );
}

function getCachedAccount(
  publicKey: PublicKey,
  graphqlEndpoint = defaultGraphqlEndpoint
) {
  let account =
    accountCache[`${publicKey.toBase58()};${graphqlEndpoint}`]?.account;
  if (account !== undefined) return parseAccount(account);
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
  let stringifiedAccount = stringifyAccount(account);
  accountCache[`${stringifiedAccount.publicKey};${graphqlEndpoint}`] = {
    account: stringifiedAccount,
    graphqlEndpoint,
    timestamp: Date.now(),
  };
}
