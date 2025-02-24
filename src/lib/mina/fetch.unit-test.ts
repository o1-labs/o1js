import { PrivateKey, TokenId } from 'o1js';
import {
  createActionsList,
  fetchAccount,
  fetchActions,
  fetchEvents,
  setArchiveDefaultHeaders,
  setArchiveGraphqlEndpoint,
  setGraphqlEndpoint,
  setMinaDefaultHeaders,
} from './fetch.js';
import { mockFetchActionsResponse as fetchResponseWithTxInfo } from './fixtures/fetch-actions-response-with-transaction-info.js';
import { mockFetchActionsResponse as fetchResponseNoTxInfo } from './fixtures/fetch-actions-response-without-transaction-info.js';
import { test, describe, beforeEach, afterEach } from 'node:test';
import { removeJsonQuotes } from './graphql.js';
import { expect } from 'expect';

console.log('testing regex helpers');

let input, actual, expected;

input = `{
  "array": [
    {"data": "string with \\"escaped quotes\\": 1"}, { "otherdata": "otherstrin\\"g"}]
}`;

expected = `{
  array: [
    {
      data: "string with \\"escaped quotes\\": 1"
    },
    {
      otherdata: "otherstrin\\"g"
    }
  ]
}`;

actual = removeJsonQuotes(input);
expect(actual).toEqual(expected);

input = `{
  "array": [
    {
      "data"     : "x"
    },
    {
      "data":             1},{
      "data": {
               "otherData":   "x"     
      }
    }
  ]
}`;

expected = `{
  array: [
    {
      data: "x"
    },
    {
      data: 1
    },
    {
      data: {
        otherData: "x"
      }
    }
  ]
}`;

actual = removeJsonQuotes(input);
expect(actual).toEqual(expected);

input = `{ 
  "FirstName" :"abc",  
  "Email" : "a@a.com",
  "Id" : "1",
  "Phone" : "1234567890",
  "Date" : "2 May 2016 23:59:59"
}`;

expected = `{
  FirstName: "abc",
  Email: "a@a.com",
  Id: "1",
  Phone: "1234567890",
  Date: "2 May 2016 23:59:59"
}`;

actual = removeJsonQuotes(input);
expect(actual).toEqual(expected);

input = `{ 
"FirstName":"abc",  
"Email" : "a@a.com",
"Id" :      "1",
"Phone" :"1234567890",
"Date":
  "2 May 2016 23:59:59"
}`;

expected = `{
  FirstName: "abc",
  Email: "a@a.com",
  Id: "1",
  Phone: "1234567890",
  Date: "2 May 2016 23:59:59"
}`;
actual = removeJsonQuotes(input);

expect(actual).toEqual(expected);

input = `{ 
  "First-Name":"abc",  
  "Email" : "a@a.com",
  "Id" :      "1",
  "Phone" :"1234567890",
  "Date":
    "2 May 2016 23:59:59"
}`;

expected = `{
  First-Name: "abc",
  Email: "a@a.com",
  Id: "1",
  Phone: "1234567890",
  Date: "2 May 2016 23:59:59"
}`;

actual = removeJsonQuotes(input);

expect(actual).toEqual(expected);

console.log('regex tests complete 🎉');

describe('Fetch', () => {
  describe('#createActionsList with default params', () => {
    const defaultPublicKey = PrivateKey.random().toPublicKey().toBase58();
    const defaultActionStates = {
      fromActionState: undefined,
      endActionState: undefined,
    };
    const defaultAccountInfo = {
      publicKey: defaultPublicKey,
      actionStates: defaultActionStates,
      tokenId: TokenId.default.toString(),
    };

    describe('with a payload that is missing transaction info', () => {
      const actionsList = createActionsList(defaultAccountInfo, fetchResponseNoTxInfo.data.actions);

      test('orders the actions correctly', () => {
        const correctActionsHashes = [
          '10619825168606131449407092474314250900469658818945385329390497057469974757422',
          '25525130517416993227046681664758665799110129890808721833148757111140891481208',
          '290963518424616502946790040851348455652296009700336010663574777600482385855',
          '20673199655841577810393943638910551364027795297920791498278816237738641857371',
          '5284016523143033193387918577616839424871122381326995145988133445906503263869',
          '16944163018367910067334012882171366051616125936127175065464614786387687317044',
          '23662159967366296714544063539035629952291787828104373633198732070740691309118',
          '1589729766029695153975344283092689798747741638003354620355672853210932754595',
          '10964420428484427410756859799314206378989718180435238943573393516522086219419',
        ];
        expect(actionsList.map(({ hash }) => hash)).toEqual(correctActionsHashes);
      });
    });

    describe('with a payload that includes transaction info', () => {
      const actionsList = createActionsList(
        defaultAccountInfo,
        fetchResponseWithTxInfo.data.actions
      );

      test('orders the actions correctly', () => {
        const correctActionsHashes = [
          '23562173419146814432140831830018386191372262558717813981702672868292521523493',
          '17091049856171838105194364005412166905307014398334933913160405653259432088216',
          '17232885850087529233459756382038742870248640044940153006158312935267918515979',
          '12636308717155378495657553296284990333618148856424346334743675423201692801125',
          '17082487567758469425757467457967473265642001333824907522427890208991758759731',
          '14226491442770650712364681911870921131508915865197379983185088742764625929348',
          '13552033292375176242184292341671233419412691991179711376625259275814019808194',
        ];
        expect(actionsList.map(({ hash }) => hash)).toEqual(correctActionsHashes);
      });
    });
  });

  const minaEndpoint = 'https://mina.dummy/graphql';
  const archiveEndpoint = 'https://archive.dummy/graphql';

  describe('Testing fetch headers', () => {
    let originalFetch: typeof global.fetch;
    let lastFetchOptions: any = null;

    beforeEach(() => {
      originalFetch = global.fetch;
      lastFetchOptions = undefined;
      global.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        lastFetchOptions = init;
        let url: string;
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.toString();
        } else {
          url = input.url;
        }

        if (url.includes('archive.dummy')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                events: [],
              },
            }),
          } as Response);
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {},
            }),
          } as Response);
        }
      }) as typeof fetch;

      setGraphqlEndpoint(minaEndpoint);
      setArchiveGraphqlEndpoint(archiveEndpoint);
      setMinaDefaultHeaders({ Authorization: 'Bearer mina-default-token' });
      setArchiveDefaultHeaders({
        Authorization: 'Bearer archive-default-token',
      });
    });

    afterEach(() => {
      global.fetch = originalFetch;
      lastFetchOptions = null;
    });

    test('Mina default headers with per request headers', async () => {
      const perRequestHeaders = { 'X-Custom': 'custom-value' };
      await fetchAccount(
        { publicKey: PrivateKey.random().toPublicKey().toBase58() },
        minaEndpoint,
        {
          headers: perRequestHeaders,
        }
      );

      expect(lastFetchOptions.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mina-default-token',
        'X-Custom': 'custom-value',
      });
    });

    test('Per request headers overrides default headers', async () => {
      const perRequestHeaders = {
        Authorization: 'Bearer override-token',
        'X-Test': 'value',
      };
      await fetchAccount(
        { publicKey: PrivateKey.random().toPublicKey().toBase58() },
        minaEndpoint,
        {
          headers: perRequestHeaders,
        }
      );

      expect(lastFetchOptions.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer override-token',
        'X-Test': 'value',
      });
    });

    test('Archive default headers with per request headers', async () => {
      const perRequestHeaders = { 'X-Another': 'another-value' };
      await fetchEvents(
        { publicKey: PrivateKey.random().toPublicKey().toBase58() },
        archiveEndpoint,
        {},
        perRequestHeaders
      );

      expect(lastFetchOptions.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer archive-default-token',
        'X-Another': 'another-value',
      });
    });

    test('Only default and base headers are used', async () => {
      setMinaDefaultHeaders({
        'X-Default': 'default-header',
        Authorization: 'Bearer mina-default-token',
      });
      await fetchAccount(
        { publicKey: PrivateKey.random().toPublicKey().toBase58() },
        minaEndpoint,
        {}
      );

      expect(lastFetchOptions.headers).toMatchObject({
        'Content-Type': 'application/json',
        'X-Default': 'default-header',
        Authorization: 'Bearer mina-default-token',
      });
    });

    test('Default and per request headers are used for fetchActions', async () => {
      setMinaDefaultHeaders({
        Authorization: 'Bearer archive-default-token',
      });

      const perRequestHeaders = {
        'X-Default': 'default-header',
      };
      await fetchActions(
        {
          publicKey: PrivateKey.random().toPublicKey().toBase58(),
          actionStates: {
            fromActionState: '',
            endActionState: '',
          },
        },
        minaEndpoint,
        perRequestHeaders
      );

      expect(lastFetchOptions.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer archive-default-token',
        'X-Default': 'default-header',
      });
    });

    test('Only base headers are used', async () => {
      await fetchAccount(
        { publicKey: PrivateKey.random().toPublicKey().toBase58() },
        minaEndpoint,
        {}
      );

      expect(lastFetchOptions.headers).toMatchObject({
        'Content-Type': 'application/json',
      });
    });
  });
});
