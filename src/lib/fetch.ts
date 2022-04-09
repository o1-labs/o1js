import 'isomorphic-fetch';

type Config = {
  timeout: number | undefined;
};

type FetchResponse = { data: any };

type FetchError = {
  statusCode: number;
  statusText: string;
};

// Specify 5s as the default timeout
const defaultTimeout = 5000;

// TODO: 'snapp' should be replaced with 'zkapp' soon
const query = `
    query GetAccountInfo($publicKey: PublicKey!) {
      account(publicKey: $publicKey) {
        publicKey
        nonce
        snappUri
        snappState
        receiptChainHash
        delegate
        balance {
          total
        }
    }
  }`;

async function checkResponseStatus(response: Response) {
  if (response.ok) {
    return (await response.json()) as FetchResponse;
  } else {
    return {
      statusCode: response.status,
      statusText: response.statusText,
    } as FetchError;
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

/**
 * Gets account information on the specified publicKey by performing a GraphQL query
 * to the specified endpoint. This will call the 'GetAccountInfo' query which fetches
 * zkapp related account information.
 *
 * If an error is returned by the specified endpoint, an error is thrown. Otherwise,
 * the data is returned.
 *
 * @param {string} graphqlEndpoint The GraphQL endpoint to pull account information from
 * @param {string} publicKey The specified account to get account information on
 * @param {Config} config timeout An object that exposes an optional timeout parameter
 * @returns zkapp information on the specified account or an error is thrown
 */
export async function getAccount(
  graphqlEndpoint: string,
  publicKey: string,
  config?: Config
) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => {
      controller.abort();
    },
    config?.timeout ? config.timeout : defaultTimeout
  );

  try {
    let response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { publicKey },
      }),
      signal: controller.signal,
    });
    return checkResponseStatus(response);
  } catch (error) {
    clearTimeout(timer);
    return inferError(error);
  }
}
