import { UInt32 } from '../../../lib/provable/int.js';
import { getActionsQuery, getEventsQuery } from './graphql.js';
import { parse, print } from 'graphql';

import { test, describe } from 'node:test';
import { expect } from 'expect';

function normalizeGraphql(query: string) {
  return print(parse(query));
}

describe('GraphQL Queries', () => {
  const publicKey = 'testPublicKey';
  const tokenId = 'testTokenId';
  test('getEventsQuery without filter options', () => {
    const expectedQuery = `{
        events(input: { address: "testPublicKey", tokenId: "testTokenId" }) {
            blockInfo {
                distanceFromMaxBlockHeight
                height
                globalSlotSinceGenesis
                stateHash
                parentHash
                chainStatus
            }
            eventData {
                transactionInfo {
                    hash
                    memo
                    status
                }
                data
            }
        }
    }`;
    expect(
      normalizeGraphql(
        getEventsQuery({
          publicKey,
          tokenId,
        })
      )
    ).toBe(normalizeGraphql(expectedQuery));
  });

  test('getEventsQuery with to and from', () => {
    const from = 5;
    const to = 10;
    const expectedQuery = `{
      events(input: { address: "testPublicKey", tokenId: "testTokenId", to: 10, from: 5 }) {
        blockInfo {
            distanceFromMaxBlockHeight
            height
            globalSlotSinceGenesis
            stateHash
            parentHash
            chainStatus
        }
        eventData {
            transactionInfo {
                hash
                memo
                status
            }
            data
        }
    }
}`;
    expect(
      normalizeGraphql(
        getEventsQuery({
          publicKey,
          tokenId,
          from,
          to,
        })
      )
    ).toBe(normalizeGraphql(expectedQuery));
  });

  test('getActionsQuery without filter options', () => {
    const expectedQuery = `{
        actions(input: { address: "testPublicKey", tokenId: "testTokenId" }) {
            blockInfo {
                distanceFromMaxBlockHeight
            }
            actionState {
                actionStateOne
                actionStateTwo
            }
            actionData {
                accountUpdateId
                data
                transactionInfo {
                    sequenceNumber
                    zkappAccountUpdateIds
                }
            }
        }
    }`;
    expect(
      normalizeGraphql(
        getActionsQuery({
          publicKey,
        })
      )
    ).toBe(normalizeGraphql(expectedQuery));
  });

  test('getActionsQuery with action state filter', () => {
    const filterOptions = { fromActionState: 'A', endActionState: 'B' };
    const expectedQuery = `{
      actions(input: { address: "testPublicKey", tokenId: "testTokenId", fromActionState: "A", endActionState: "B" }) {
        blockInfo {
            distanceFromMaxBlockHeight
        }
        actionState {
            actionStateOne
            actionStateTwo
        }
        actionData {
            accountUpdateId
            data
            transactionInfo {
                sequenceNumber
                zkappAccountUpdateIds
            }
        }
    }
}`;
    expect(
      normalizeGraphql(
        getActionsQuery({
          publicKey,
          actionStates: filterOptions,
        })
      )
    ).toBe(normalizeGraphql(expectedQuery));
  });

  test('getActionsQuery with to and from', () => {
    const from = 5;
    const to = 10;
    const expectedQuery = `{
      actions(input: { address: "testPublicKey", tokenId: "testTokenId", to: 10, from: 5 }) {
        blockInfo {
            distanceFromMaxBlockHeight
        }
        actionState {
            actionStateOne
            actionStateTwo
        }
        actionData {
            accountUpdateId
            data
            transactionInfo {
                sequenceNumber
                zkappAccountUpdateIds
            }
        }
    }
}`;
    expect(
      normalizeGraphql(
        getActionsQuery({
          publicKey,
          actionStates: {},
          from,
          to,
          tokenId,
        })
      )
    ).toBe(normalizeGraphql(expectedQuery));
  });
});
