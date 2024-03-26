import { CircuitString, SmartContract, method, Mina, PrivateKey } from 'o1js';
import * as assert from 'assert/strict';

// circuit which tests a couple of string features
class MyContract extends SmartContract {
  @method async checkString(s: CircuitString) {
    let sWithExclamation = s.append(CircuitString.fromString('!'));
    sWithExclamation
      .equals(CircuitString.fromString('a string!'))
      .or(sWithExclamation.equals(CircuitString.fromString('some string!')))
      .assertTrue();
  }
}

let address = PrivateKey.random().toPublicKey();

console.log('compile...');
await MyContract.compile();
// should work
console.log('prove...');
let tx = await Mina.transaction(() =>
  new MyContract(address).checkString(CircuitString.fromString('a string'))
);
await tx.prove();
console.log('test 1 - ok');
// should work
tx = await Mina.transaction(() =>
  new MyContract(address).checkString(CircuitString.fromString('some string'))
);
await tx.prove();
console.log('test 2 - ok');
// should fail
let fails = await Mina.transaction(() =>
  new MyContract(address).checkString(CircuitString.fromString('different'))
)
  .then(() => false)
  .catch(() => true);
if (!fails) Error('proof was supposed to fail');
console.log('test 3 - ok');

const str = CircuitString.fromString('Your size');
const not_same_str = CircuitString.fromString('size');
assert.equal(str.equals(not_same_str).toBoolean(), false);

const equal1 = CircuitString.fromString('These strings are equivalent');
const equal2 = CircuitString.fromString('These strings are equivalent');

const circuitString = CircuitString.fromString(
  'This string completely encompasses this string'
);
const substring = CircuitString.fromString('this string');

if (!equal1.equals(equal2).toBoolean())
  throw Error('Strings are not equivalent 1');
console.log('Equivalent: "', equal1.toString(), '", "', equal2.toString(), '"');

if (!circuitString.substring(35, 46).equals(substring).toBoolean())
  throw Error('Strings are not equivalent 2');
console.log(
  'Equivalent: "',
  circuitString.substring(35, 46).toString(),
  '", "',
  substring.toString(),
  '"'
);

// if (!circuitString.contains(substring).toBoolean())
//   throw Error('String does not contain substring');

console.log(circuitString.append(substring).toString());

console.log('Everything looks good!');
