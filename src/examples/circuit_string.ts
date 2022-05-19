import { isReady, CircuitString, resolveCircuitStringArrayProps } from 'snarkyjs';

await isReady;
await resolveCircuitStringArrayProps()

const equal1 = CircuitString.fromString('These strings are equivalent');
const equal2 = CircuitString.fromString('These strings are equivalent');

const circuitString = CircuitString.fromString('This string completely encompasses this string');
const substring = CircuitString.fromString('this string');


if (!equal1.equals(equal2).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', equal1.toString(), '", "', equal2.toString(), '"');

if (!circuitString.substring(35, 46).equals(substring).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', circuitString.substring(35, 46).toString(), '", "', substring.toString(), '"');

if (!circuitString.contains(substring, 11).toBoolean()) throw Error('String does not contain substring')

console.log('Everything looks good!')
