import { test, Random } from './testing/property.js';
import { UInt8 } from './int.js';
import { Hash } from './hash.js';
import { Provable } from './provable.js';
import { expect } from 'expect';

let RandomUInt8 = Random.map(Random.uint8, (x) => UInt8.from(x));

// Test constructor
test(Random.uint8, Random.uint8, (x, y, assert) => {
  let z = new UInt8(x);
  assert(z instanceof UInt8);
  assert(z.toBigInt() === x);
  assert(z.toString() === x.toString());
  assert(z.isConstant());

  assert((z = new UInt8(x)) instanceof UInt8 && z.toBigInt() === x);
  assert((z = new UInt8(z)) instanceof UInt8 && z.toBigInt() === x);
  assert((z = new UInt8(z.value)) instanceof UInt8 && z.toBigInt() === x);

  z = new UInt8(y);
  assert(z instanceof UInt8);
  assert(z.toString() === y.toString());
  assert(z.toJSON() === y.toString());
});

// handles all numbers up to 2^8
test(Random.nat(255), (n, assert) => {
  assert(UInt8.from(n).toString() === String(n));
});

// throws on negative numbers
test.negative(Random.int(-10, -1), (x) => UInt8.from(x));

// throws on numbers >= 2^8
test.negative(Random.uint8.invalid, (x) => UInt8.from(x));

// test digest->hex and hex->digest conversions
checkHashInCircuit();
console.log('hashing digest conversions matches! 🎉');

// check in-circuit
function checkHashInCircuit() {
  Provable.runAndCheck(() => {
    let data = Random.array(RandomUInt8, Random.nat(32))
      .create()()
      .map((x) => Provable.witness(UInt8, () => UInt8.from(x)));

    checkHashConversions(data);
  });
}

function checkHashConversions(data: UInt8[]) {
  Provable.asProver(() => {
    expectDigestToEqualHex(Hash.SHA224.hash(data));
    expectDigestToEqualHex(Hash.SHA256.hash(data));
    expectDigestToEqualHex(Hash.SHA384.hash(data));
    expectDigestToEqualHex(Hash.SHA512.hash(data));
    expectDigestToEqualHex(Hash.Keccak256.hash(data));
  });
}

function expectDigestToEqualHex(digest: UInt8[]) {
  const hex = Hash.toHex(digest);
  expect(equals(digest, Hash.fromHex(hex))).toBe(true);
}

function equals(a: UInt8[], b: UInt8[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) a[i].assertEquals(b[i]);

  return true;
}
