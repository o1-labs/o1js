import * as Fetch from './fetch.js';
import { expect } from 'expect';

console.log('testing fetch regex helper');

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
