import { isReady, ZKString } from 'snarkyjs';

await isReady;

// 2 strings are equal

const zkstr1 = ZKString.fromString('These strings are equivalent');
const zkstr2 = ZKString.fromString('These strings are equivalent');

if (!zkstr1.equals(zkstr2).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', zkstr1.toString(), '", "', zkstr2.toString(), '"');

// string matches substring

const zkstr3 = ZKString.fromString('This string completely encompasses this string');
const zkstr4 = ZKString.fromString('this string');
const substr = zkstr3.substring(35, 46)

if (!substr.equals(zkstr4).toBoolean()) throw Error('Strings are not equivalent');
console.log('Equivalent: "', substr.toString(), '", "', zkstr4.toString(), '"');

console.log('Everything looks good!')
