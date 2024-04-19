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
