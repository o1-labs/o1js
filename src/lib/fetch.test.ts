
// import * as Fetch from './fetch.js';

// TODO: Import './fetch.ts'. Can't get Jest to play nicely
// This is a C&P from fetch.ts
function removeJsonQuotes(json: string) {
  let cleaned = JSON.stringify(JSON.parse(json), null, 2);
  return cleaned.replace(/\"(\S+)\"\s*:/gm, "$1 :");
}

// function removeJsonQuotes(json: string) {
//   let cleaned = JSON.stringify(JSON.parse(json), null, 2);
//   return cleaned.replace(/\"([\w-]+)\"\s*:/gm, "$1 :");
// }

describe('fetch helper functions', () => {

  it('removes quotes from JSON keys', () => {

    const input = `{ 
  "FirstName" :"abc",  
  "Email" : "a@a.com",
  "Id" : "1",
  "Phone" : "1234567890",
  "Date" : "2 May 2016 23:59:59"
}`;

    const expected = `{
  FirstName : "abc",
  Email : "a@a.com",
  Id : "1",
  Phone : "1234567890",
  Date : "2 May 2016 23:59:59"
}`;
    const actual = removeJsonQuotes(input);

    expect(actual).toEqual(expected);
  });


  it('doesn\'t care about spacing around colon', () => {

    const input = `{ 
  "FirstName":"abc",  
  "Email" : "a@a.com",
  "Id" :      "1",
  "Phone" :"1234567890",
  "Date":
    "2 May 2016 23:59:59"
}`;

    const expected = `{
  FirstName : "abc",
  Email : "a@a.com",
  Id : "1",
  Phone : "1234567890",
  Date : "2 May 2016 23:59:59"
}`;
    const actual = removeJsonQuotes(input);

    expect(actual).toEqual(expected);
  });

  it('parses keys with dashes', () => {

    const input = `{ 
  "First-Name":"abc",  
  "Email" : "a@a.com",
  "Id" :      "1",
  "Phone" :"1234567890",
  "Date":
    "2 May 2016 23:59:59"
}`;

    const expected = `{
  First-Name : "abc",
  Email : "a@a.com",
  Id : "1",
  Phone : "1234567890",
  Date : "2 May 2016 23:59:59"
}`;

    const actual = removeJsonQuotes(input);

    expect(actual).toEqual(expected);
  });

});
