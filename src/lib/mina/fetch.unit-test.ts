import { PrivateKey, TokenId } from 'o1js';
import { createActionsList } from './fetch.js';
import { mockFetchActionsResponse } from './fixtures/fetch-actions-response.js';
import { test, describe } from 'node:test';
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

describe('Fetch', async (t) => {
  describe('#createActionsList with default params', async (t) => {
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

    const actionsList = createActionsList(
      defaultAccountInfo,
      mockFetchActionsResponse.data.actions
    );

    await test('orders the actions correctly', async () => {
      expect(actionsList).toEqual([
        {
          actions: [
            [
              '20374659537065244088703638031937922870146667362923279084491778322749365537089',
              '1',
            ],
          ],
          hash: '10619825168606131449407092474314250900469658818945385329390497057469974757422',
        },
        {
          actions: [
            [
              '20503089751358270987184701275168489753952341816059774976784079526478451099801',
              '1',
            ],
          ],
          hash: '25525130517416993227046681664758665799110129890808721833148757111140891481208',
        },
        {
          actions: [
            [
              '3374074164183544078218789545772953663729921088152354292852793744356608231707',
              '0',
            ],
          ],
          hash: '290963518424616502946790040851348455652296009700336010663574777600482385855',
        },
        {
          actions: [
            [
              '12630758077588166643924428865613845067150916064939816120404808842510620524633',
              '1',
            ],
          ],
          hash: '20673199655841577810393943638910551364027795297920791498278816237738641857371',
        },
        {
          actions: [
            [
              '5643224648393140391519847064914429159616501351124129591669928700148350171602',
              '0',
            ],
          ],
          hash: '5284016523143033193387918577616839424871122381326995145988133445906503263869',
        },
        {
          actions: [
            [
              '15789351988619560045401465240113496854401074115453702466673859303925517061263',
              '0',
            ],
          ],
          hash: '16944163018367910067334012882171366051616125936127175065464614786387687317044',
        },
        {
          actions: [
            [
              '27263309408256888453299195755797013857604561285332380691270111409680109142128',
              '1',
            ],
          ],
          hash: '23662159967366296714544063539035629952291787828104373633198732070740691309118',
        },
        {
          actions: [
            [
              '3378367318331499715304980508337843233019278703665446829424824679144818589558',
              '1',
            ],
          ],
          hash: '1589729766029695153975344283092689798747741638003354620355672853210932754595',
        },
        {
          actions: [
            [
              '17137397755795687855356639427474789131368991089558570411893673365904353943290',
              '1',
            ],
          ],
          hash: '10964420428484427410756859799314206378989718180435238943573393516522086219419',
        },
      ]);
    });
  });
});
``;
