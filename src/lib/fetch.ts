import 'isomorphic-fetch';

export { getAccount };

/**
 * Gets account information on the specified publicKey by performing a GraphQL query
 * to the specified endpoint. This will call the 'GetAccountInfo' query which fetches
 * zkapp related account information.
 *
 * If an error is returned by the specified endpoint, an error is thrown. Otherwise,
 * the data is returned.
 *
 * @param publicKey The specified account to get account information on
 * @param config An object that exposes additional options, like the graphql endpoint
 * @returns zkapp information on the specified account or an error is thrown
 */
async function getAccount(
  publicKey: string,
  {
    graphqlEndpoint = 'https://proxy.berkeley.minaexplorer.com/graphql',
    timeout = defaultTimeout,
  } = {}
): Promise<{ account: Account } | { error?: FetchError }> {
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
      return { account: (value as FetchResponse).data.account };
    return { error };
  } catch (error) {
    clearTimeout(timer);
    return { error: inferError(error) };
  }
}

type FetchResponse = { data: any };

type Account = {
  publicKey: string;
  nonce: string;
  zkappUri: string;
  zkappState: string[];
  receiptChainState: string;
  balance: { total: string };
};

type FetchError = {
  statusCode: number;
  statusText: string;
};

// Specify 5s as the default timeout
const defaultTimeout = 50000;

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
