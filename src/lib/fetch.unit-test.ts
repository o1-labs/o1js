import * as Fetch from './fetch.js';
import { expect } from 'expect';
import { shutdown } from '../index.js';

console.log('testing regex helpers');

let input, output, actual, expected;
input = `{ 
  "FirstName" :"abc",  
  "Email" : "a@a.com",
  "Id" : "1",
  "Phone" : "1234567890",
  "Date" : "2 May 2016 23:59:59"
}`;

expected = `{
  FirstName : "abc",
  Email : "a@a.com",
  Id : "1",
  Phone : "1234567890",
  Date : "2 May 2016 23:59:59"
}`;

actual = Fetch.removeJsonQuotes(input);
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
  FirstName : "abc",
  Email : "a@a.com",
  Id : "1",
  Phone : "1234567890",
  Date : "2 May 2016 23:59:59"
}`;
actual = Fetch.removeJsonQuotes(input);

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
  First-Name : "abc",
  Email : "a@a.com",
  Id : "1",
  Phone : "1234567890",
  Date : "2 May 2016 23:59:59"
}`;

actual = Fetch.removeJsonQuotes(input);

expect(actual).toEqual(expected);

console.log('regex tests complete 🎉');
shutdown();
