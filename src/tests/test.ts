import { Field } from '../index.js';
// we can build snarkyjs and run tests without type checking
let wrongType: string = Field.random().toBigInt();
console.log(wrongType);
