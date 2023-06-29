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
  assert(new UInt8(n).toString() === String(n));
});

// throws on negative numbers
test.negative(Random.int(-10, -1), (x) => new UInt8(x));

// throws on numbers >= 2^8
test.negative(Random.uint8.invalid, (x) => new UInt8(x));

// test digest->hex and hex->digest conversions
checkHashInCircuit();
checkHashOutCircuit();
console.log('hashing digest conversions matches! 🎉');

// check in-circuit
function checkHashInCircuit() {
  Provable.runAndCheck(() => {
    let d0 = Provable.witness(UInt8, () => new UInt8(RandomUInt8.create()()));
    let d1 = Provable.witness(UInt8, () => new UInt8(RandomUInt8.create()()));
    let d2 = Provable.witness(UInt8, () => new UInt8(RandomUInt8.create()()));
    let d3 = Provable.witness(UInt8, () => new UInt8(RandomUInt8.create()()));
    let d4 = Provable.witness(UInt8, () => new UInt8(RandomUInt8.create()()));

    let data = [d0, d1, d2, d3, d4];
    checkHashConversions(data, true);
  });
}

// check out-of-circuit
function checkHashOutCircuit() {
  let r = Random.array(RandomUInt8, Random.nat(20)).create()();
  checkHashConversions(r, false);
}

function checkHashConversions(data: UInt8[], provable: boolean) {
  let digest = Hash.SHA224.hash(data);
  expectDigestToEqualHex(digest, provable);

  digest = Hash.SHA256.hash(data);
  expectDigestToEqualHex(digest, provable);

  digest = Hash.SHA384.hash(data);
  expectDigestToEqualHex(digest, provable);

  digest = Hash.SHA512.hash(data);
  expectDigestToEqualHex(digest, provable);

  digest = Hash.Keccak256.hash(data);
  expectDigestToEqualHex(digest, provable);
}

function expectDigestToEqualHex(digest: UInt8[], provable: boolean) {
  if (provable) {
    Provable.asProver(() => {
      const hex = UInt8.toHex(digest);
      expect(equals(digest, UInt8.fromHex(hex), provable)).toBe(true);
    });
  } else {
    const hex = UInt8.toHex(digest);
    expect(equals(digest, UInt8.fromHex(hex), provable)).toBe(true);
  }
}

function equals(a: UInt8[], b: UInt8[], provable: boolean): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++)
    if (provable) {
      a[i].assertEquals(b[i]);
    } else {
      if (a[i].value.toConstant() === b[i].value.toConstant()) return false;
    }

  return true;
}
