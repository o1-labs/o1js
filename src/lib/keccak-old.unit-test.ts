import { test, Random } from './testing/property.js';
import { UInt8 } from './int.js';
import { Hash } from './hashes-combined.js';
import { Provable } from './provable.js';
import { expect } from 'expect';
import assert from 'assert';
import { Bytes } from './provable-types/provable-types.js';

let RandomUInt8 = Random.map(Random.uint8, (x) => UInt8.from(x));

// Test constructor
test(Random.uint8, Random.uint8, (x, y, assert) => {
  let z = new UInt8(x);
  assert(z instanceof UInt8);
  assert(z.toBigInt() === x);
  assert(z.toString() === x.toString());

  assert((z = new UInt8(x)) instanceof UInt8 && z.toBigInt() === x);
  assert((z = new UInt8(z)) instanceof UInt8 && z.toBigInt() === x);
  assert((z = new UInt8(z.value.value)) instanceof UInt8 && z.toBigInt() === x);

  z = new UInt8(y);
  assert(z instanceof UInt8);
  assert(z.toString() === y.toString());
});

// handles all numbers up to 2^8
test(Random.nat(255), (n, assert) => {
  assert(UInt8.from(n).toString() === String(n));
});

// throws on negative numbers
test.negative(Random.int(-10, -1), (x) => UInt8.from(x));

// throws on numbers >= 2^8
test.negative(Random.uint8.invalid, (x) => UInt8.from(x));

runHashFunctionTests();
console.log('OCaml tests pass! 🎉');

// test digest->hex and hex->digest conversions
checkHashInCircuit();
console.log('hashing digest conversions matches! 🎉');

// check in-circuit
function checkHashInCircuit() {
  Provable.runAndCheck(() => {
    let data = Random.array(RandomUInt8, Random.nat(32))
      .create()()
      .map((x) => Provable.witness(UInt8, () => UInt8.from(x)));

    checkHashConversions(Bytes.from(data));
  });
}

function checkHashConversions(data: Bytes) {
  Provable.asProver(() => {
    expectDigestToEqualHex(Hash.SHA3_256.hash(data));
    expectDigestToEqualHex(Hash.SHA3_384.hash(data));
    expectDigestToEqualHex(Hash.SHA3_512.hash(data));
    expectDigestToEqualHex(Hash.Keccak256.hash(data));
  });
}

function expectDigestToEqualHex(digest: Bytes) {
  const hex = digest.toHex();
  expect(digest).toEqual(Bytes.fromHex(hex));
}

function equals(a: Bytes, b: Bytes): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) a.bytes[i].assertEquals(b.bytes[i]);
  return true;
}

/**
 * Based off the following unit tests from the OCaml implementation:
 * https://github.com/MinaProtocol/mina/blob/69d6ea4a3b7ca1690cf8f41d4598cb7484359e1d/src/lib/crypto/kimchi_backend/gadgets/keccak.ml#L646
 */
function runHashFunctionTests() {
  // Positive Tests
  testExpected({
    nist: false,
    length: 256,
    message: '30',
    expected:
      '044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116d',
  });

  testExpected({
    nist: true,
    length: 512,
    message: '30',
    expected:
      '2d44da53f305ab94b6365837b9803627ab098c41a6013694f9b468bccb9c13e95b3900365eb58924de7158a54467e984efcfdabdbcc9af9a940d49c51455b04c',
  });

  testExpected({
    nist: false,
    length: 256,
    message:
      '4920616d20746865206f776e6572206f6620746865204e465420776974682069642058206f6e2074686520457468657265756d20636861696e',
    expected:
      '63858e0487687c3eeb30796a3e9307680e1b81b860b01c88ff74545c2c314e36',
  });

  testExpected({
    nist: false,
    length: 256,
    message:
      '044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116df9e2eaaa42d9fe9e558a9b8ef1bf366f190aacaa83bad2641ee106e9041096e42d44da53f305ab94b6365837b9803627ab098c41a6013694f9b468bccb9c13e95b3900365eb58924de7158a54467e984efcfdabdbcc9af9a940d49c51455b04c63858e0487687c3eeb30796a3e9307680e1b81b860b01c88ff74545c2c314e36',
    expected:
      '560deb1d387f72dba729f0bd0231ad45998dda4b53951645322cf95c7b6261d9',
  });

  testExpected({
    nist: true,
    length: 256,
    message:
      '044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116df9e2eaaa42d9fe9e558a9b8ef1bf366f190aacaa83bad2641ee106e9041096e42d44da53f305ab94b6365837b9803627ab098c41a6013694f9b468bccb9c13e95b3900365eb58924de7158a54467e984efcfdabdbcc9af9a940d49c51455b04c63858e0487687c3eeb30796a3e9307680e1b81b860b01c88ff74545c2c314e36',
    expected:
      '1784354c4bbfa5f54e5db23041089e65a807a7b970e3cfdba95e2fbe63b1c0e4',
  });

  testExpected({
    nist: false,
    length: 256,
    message:
      '391ccf9b5de23bb86ec6b2b142adb6e9ba6bee8519e7502fb8be8959fbd2672934cc3e13b7b45bf2b8a5cb48881790a7438b4a326a0c762e31280711e6b64fcc2e3e4e631e501d398861172ea98603618b8f23b91d0208b0b992dfe7fdb298b6465adafbd45e4f88ee9dc94e06bc4232be91587f78572c169d4de4d8b95b714ea62f1fbf3c67a4',
    expected:
      '7d5655391ede9ca2945f32ad9696f464be8004389151ce444c89f688278f2e1d',
  });

  testExpected({
    nist: false,
    length: 256,
    message:
      'ff391ccf9b5de23bb86ec6b2b142adb6e9ba6bee8519e7502fb8be8959fbd2672934cc3e13b7b45bf2b8a5cb48881790a7438b4a326a0c762e31280711e6b64fcc2e3e4e631e501d398861172ea98603618b8f23b91d0208b0b992dfe7fdb298b6465adafbd45e4f88ee9dc94e06bc4232be91587f78572c169d4de4d8b95b714ea62f1fbf3c67a4',
    expected:
      '37694fd4ba137be747eb25a85b259af5563e0a7a3010d42bd15963ac631b9d3f',
  });

  testExpected({
    nist: false,
    length: 256,
    message:
      '80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
    expected:
      'bbf1f49a2cc5678aa62196d0c3108d89425b81780e1e90bcec03b4fb5f834714',
  });

  testExpected({
    nist: false,
    length: 256,
    message:
      '80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
    expected:
      'bbf1f49a2cc5678aa62196d0c3108d89425b81780e1e90bcec03b4fb5f834714',
  });

  testExpected({
    nist: false,
    length: 256,
    message: 'a2c0',
    expected:
      '9856642c690c036527b8274db1b6f58c0429a88d9f3b9298597645991f4f58f0',
  });

  testExpected({
    nist: false,
    length: 256,
    message: '0a2c',
    expected:
      '295b48ad49eff61c3abfd399c672232434d89a4ef3ca763b9dbebb60dbb32a8b',
  });

  testExpected({
    nist: false,
    length: 256,
    message: '00',
    expected:
      'bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a',
  });

  // Negative tests
  try {
    testExpected({
      nist: false,
      length: 256,
      message: 'a2c',
      expected:
        '07f02d241eeba9c909a1be75e08d9e8ac3e61d9e24fa452a6785083e1527c467',
    });
    assert(false, 'Expected to throw');
  } catch (e) {}

  try {
    testExpected({
      nist: true,
      length: 256,
      message: '0',
      expected:
        'f39f4526920bb4c096e5722d64161ea0eb6dbd0b4ff0d812f31d56fb96142084',
    });
    assert(false, 'Expected to throw');
  } catch (e) {}

  try {
    testExpected({
      nist: true,
      length: 256,
      message: '30',
      expected:
        'f9e2eaaa42d9fe9e558a9b8ef1bf366f190aacaa83bad2641ee106e9041096e4',
    });
    assert(false, 'Expected to throw');
  } catch (e) {}

  try {
    testExpected({
      nist: true,
      length: 256,
      message:
        '4920616d20746865206f776e6572206f6620746865204e465420776974682069642058206f6e2074686520457468657265756d20636861696e',
      expected:
        '63858e0487687c3eeb30796a3e9307680e1b81b860b01c88ff74545c2c314e36',
    });
    assert(false, 'Expected to throw');
  } catch (e) {}
}

function testExpected({
  message,
  expected,
  nist = false,
  length = 256,
}: {
  message: string;
  expected: string;
  nist: boolean;
  length: number;
}) {
  Provable.runAndCheck(() => {
    assert(message.length % 2 === 0);

    let fields = Bytes.fromHex(message);
    let expectedHash = Bytes.fromHex(expected);

    Provable.asProver(() => {
      if (nist) {
        let hashed: Bytes;
        switch (length) {
          case 256:
            hashed = Hash.SHA3_256.hash(fields);
            break;
          case 384:
            hashed = Hash.SHA3_384.hash(fields);
            break;
          case 512:
            hashed = Hash.SHA3_512.hash(fields);
            break;
          default:
            assert(false);
        }
        equals(hashed!, expectedHash);
      } else {
        let hashed = Hash.Keccak256.hash(fields);
        equals(hashed, expectedHash);
      }
    });
  });
}
