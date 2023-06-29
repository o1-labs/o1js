import { test, Random } from './testing/property.js';
import { UInt8 } from './int.js';
import { Hash } from './hash.js';
import { Provable } from './provable.js';
import { expect } from 'expect';

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
  assert(new UInt8(n).toString() === String(n));
});

// throws on negative numbers
test.negative(Random.int(-10, -1), (x) => new UInt8(x));

// throws on numbers >= 2^8
test.negative(Random.uint8.invalid, (x) => new UInt8(x));

// test digest->hex and hex->digest conversions
checkHashConversions();
console.log('hashing digest conversions matches! 🎉');

function checkHashConversions() {
  for (let i = 0; i < 2; i++) {
    const data = Random.array(Random.uint8, Random.nat(20))
      .create()()
      .map((x) => new UInt8(x));

    Provable.runAndCheck(() => {
      let digest = Hash.SHA224.hash(data);
      expectDigestToEqualHex(digest);

      digest = Hash.SHA256.hash(data);
      expectDigestToEqualHex(digest);

      digest = Hash.SHA384.hash(data);
      expectDigestToEqualHex(digest);

      digest = Hash.SHA512.hash(data);
      expectDigestToEqualHex(digest);

      digest = Hash.Keccack256.hash(data);
      expectDigestToEqualHex(digest);
    });
  }
}

function expectDigestToEqualHex(digest: UInt8[]) {
  Provable.asProver(() => {
    const hex = UInt8.toHex(digest);
    expect(equals(digest, UInt8.fromHex(hex))).toBe(true);
  });
}

function equals(a: UInt8[], b: UInt8[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++)
    if (a[i].value.toConstant() === b[i].value.toConstant()) return false;

  return true;
}
