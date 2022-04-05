import fetch, { AbortError } from 'isomorphic-fetch';

// Specify 5s as the default timeout
const defaultTimeout = 5000;

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

function checkResponseStatus(res) {
  if (res.ok) {
    return res.json();
  } else {
    throw new Error(`${res.status}: (${res.statusText})`);
  }
}

function reportError(error) {
  if (error instanceof AbortError) {
    throw new Error(`Request timeout: ${JSON.stringify(error)}`);
  } else {
    throw new Error(`Unknown error: ${JSON.stringify(error)}`);
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
 * @param {{timeout: number}} config timeout An object that exposes an optional timeout parameter
 * @returns zkapp information on the specified account or an error is thrown
 */
export async function getAccount(graphqlEndpoint, publicKey, config) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => {
      controller.abort();
    },
    config?.timeout ? config.timeout : defaultTimeout
  );

  let response;
  try {
    response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { publicKey },
      }),
      signal: controller.signal,
    });
  } catch (error) {
    reportError(error);
  } finally {
    clearTimeout(timer);
  }
  return checkResponseStatus(response);
}
