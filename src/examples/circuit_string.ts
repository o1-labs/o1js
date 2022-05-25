import { isReady, CircuitString } from 'snarkyjs';

await isReady;

const equal1 = CircuitString.fromString('These strings are equivalent');
const equal2 = CircuitString.fromString('These strings are equivalent');

const circuitString = CircuitString.fromString('This string completely encompasses this string');
const substring = CircuitString.fromString('this string');


if (!equal1.equals(equal2).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', equal1.toString(), '", "', equal2.toString(), '"');

if (!circuitString.substring(35, 46).equals(substring).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', circuitString.substring(35, 46).toString(), '", "', substring.toString(), '"');

if (!circuitString.contains(substring).toBoolean()) throw Error('String does not contain substring')

console.log(
  circuitString.length(),
  substring.length()
)

console.log(
  circuitString.append(substring).toString()
);

console.log('Everything looks good!')
