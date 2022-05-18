import { Circuit, isReady, CircuitString, resolveCircuitStringArrayProps } from 'snarkyjs';

await isReady;
await resolveCircuitStringArrayProps()

const equal1 = CircuitString.fromString('These strings are equivalent');
const equal2 = CircuitString.fromString('These strings are equivalent');

const circuitString = CircuitString.fromString('This string completely encompasses this string');
const substring = CircuitString.fromString('this string');


console.log('Outside of a checked computation or prover, nothing matters');

// true
if (!equal1.equals(equal2).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', equal1.toString(), '", "', equal2.toString(), '"');

// false
// if (!equal1.equals(circuitString).toBoolean()) throw Error('Strings are not equivalent');
// console.log('Equivalent: "', equal1.toString(), '", "', circuitString.toString(), '"');

// true
if (!circuitString.substring(35, 46).equals(substring).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', circuitString.substring(35, 46).toString(), '", "', substring.toString(), '"');

// false
// if (!substring.substring(1, 4).equals(circuitString).toBoolean()) throw Error('Strings are not equivalent');
// console.log('Equivalent: "', substring.substring(1, 4).toString(), '", "', circuitString.toString(), '"');

// true
if (!circuitString.contains(substring, 11).toBoolean()) throw Error('String does not contain substring')

// false
// if (!substring.contains(circuitString).toBoolean()) throw Error('String does not contain substring')

console.log("\n\n\n");
console.log('In a checked computation, things matter');

Circuit.runAndCheck(() => {
  // true
  if (!equal1.equals(equal2).toBoolean()) throw Error('Strings are not equivalent');
  console.log('Equivalent: "', equal1.toString(), '", "', equal2.toString(), '"');

  // false
  try {
    if (!equal1.equals(circuitString).toBoolean()) throw Error('Strings are not equivalent');
    console.log('SHOULD NOT REACH HERE');
  } catch {
    console.log('Caught expected failure: ', equal1.toString(), '", "', circuitString.toString(), '"');
  }

  // true
  if (!circuitString.substring(35, 46).equals(substring).toBoolean()) throw Error('Strings are not equivalent');
  console.log('Equivalent: "', circuitString.substring(35, 46).toString(), '", "', substring.toString(), '"');

  // false
  try {
    if (!substring.substring(1, 4).equals(circuitString).toBoolean()) throw Error('Strings are not equivalent');
    console.log('SHOULD NOT REACH HERE');
  } catch {
    console.log('Caught expected failure: ', substring.substring(1, 4).toString(), circuitString.toString());
  }

  // true
  if (!circuitString.contains(substring, 11).toBoolean()) throw Error('String does not contain substring')
  console.log(circuitString.toString(), ' contains ', substring.toString(), '!')

  // false
  try {
    if (!substring.contains(circuitString).toBoolean()) throw Error('String does not contain substring')
    console.log('SHOULD NOT REACH HERE');
  } catch {
    console.log('Caught expected failure: ', substring.toString(), circuitString.toString());
  }

  if (!substring.append(substring).equals(CircuitString.fromString('this stringthis string')).toBoolean()) throw Error('Append does not work')
  console.log('Append: ', substring.toString(), substring.toString(), substring.append(substring).toString());
});

console.log('Everything looks good!')
