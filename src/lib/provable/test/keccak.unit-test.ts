import { Keccak } from '../crypto/keccak.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import {
  equivalentProvable,
  equivalent,
  equivalentAsync,
} from '../../testing/equivalent.js';
import {
  keccak_224,
  keccak_256,
  keccak_384,
  keccak_512,
  sha3_224,
  sha3_256,
  sha3_384,
  sha3_512,
} from '@noble/hashes/sha3';
import { Bytes } from '../wrapped-classes.js';
import { bytes } from './test-utils.js';
import { UInt8 } from '../int.js';
import { test, Random, sample } from '../../testing/property.js';
import { expect } from 'expect';

const RUNS = 1;

const testImplementations = {
  sha3: {
    224: sha3_224,
    256: sha3_256,
    384: sha3_384,
    512: sha3_512,
  },
  preNist: {
    224: keccak_224,
    256: keccak_256,
    384: keccak_384,
    512: keccak_512,
  },
};

const lengths = [256, 384, 512] as const;

// EQUIVALENCE TESTS AGAINST REF IMPLEMENTATION

// checks outside circuit
// TODO: fix witness generation slowness

for (let length of lengths) {
  let [preimageLength] = sample(Random.nat(100), 1);
  console.log(`Testing ${length} with preimage length ${preimageLength}`);
  let inputBytes = bytes(preimageLength);
  let outputBytes = bytes(length / 8);

  equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
    testImplementations.sha3[length],
    (x) => Keccak.nistSha3(length, x),
    `sha3 ${length}`
  );

  equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
    testImplementations.preNist[length],
    (x) => Keccak.preNist(length, x),
    `keccak ${length}`
  );

  // bytes to hex roundtrip
  equivalent({ from: [inputBytes], to: inputBytes })(
    (x) => x,
    (x) => Bytes.fromHex(x.toHex()),
    `Bytes toHex`
  );
}

// EQUIVALENCE TESTS AGAINST TEST VECTORS (at the bottom)

for (let { nist, length, message, expected } of testVectors()) {
  let Hash = nist ? Keccak.nistSha3 : Keccak.preNist;
  let actual = Hash(length, Bytes.fromHex(message));
  expect(actual).toEqual(Bytes.fromHex(expected));
}

// MISC QUICK TESTS

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

// PROOF TESTS

// Choose a test length at random
const digestLength = lengths[Math.floor(Math.random() * 3)];

// Digest length in bytes
const digestLengthBytes = digestLength / 8;

const preImageLength = 32;

// No need to test Ethereum because it's just a special case of preNist
const KeccakProgram = ZkProgram({
  name: `keccak-test-${digestLength}`,
  publicInput: Bytes(preImageLength),
  publicOutput: Bytes(digestLengthBytes),
  methods: {
    nistSha3: {
      privateInputs: [],
      async method(preImage: Bytes) {
        return {
          publicOutput: Keccak.nistSha3(digestLength, preImage),
        };
      },
    },
    preNist: {
      privateInputs: [],
      async method(preImage: Bytes) {
        return {
          publicOutput: Keccak.preNist(digestLength, preImage),
        };
      },
    },
  },
});

await KeccakProgram.compile();

// SHA-3
await equivalentAsync(
  {
    from: [bytes(preImageLength)],
    to: bytes(digestLengthBytes),
  },
  { runs: RUNS }
)(testImplementations.sha3[digestLength], async (x) => {
  const { proof } = await KeccakProgram.nistSha3(x);
  await KeccakProgram.verify(proof);
  return proof.publicOutput;
});

// PreNIST Keccak
await equivalentAsync(
  {
    from: [bytes(preImageLength)],
    to: bytes(digestLengthBytes),
  },
  { runs: RUNS }
)(testImplementations.preNist[digestLength], async (x) => {
  const { proof } = await KeccakProgram.preNist(x);
  await KeccakProgram.verify(proof);
  return proof.publicOutput;
});

// TEST VECTORS

function testVectors(): {
  nist: boolean;
  length: 256 | 384 | 512;
  message: string;
  expected: string;
}[] {
  return [
    {
      nist: false,
      length: 256,
      message: '30',
      expected:
        '044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116d',
    },
    {
      nist: true,
      length: 512,
      message: '30',
      expected:
        '2d44da53f305ab94b6365837b9803627ab098c41a6013694f9b468bccb9c13e95b3900365eb58924de7158a54467e984efcfdabdbcc9af9a940d49c51455b04c',
    },
    {
      nist: false,
      length: 256,
      message:
        '4920616d20746865206f776e6572206f6620746865204e465420776974682069642058206f6e2074686520457468657265756d20636861696e',
      expected:
        '63858e0487687c3eeb30796a3e9307680e1b81b860b01c88ff74545c2c314e36',
    },
    {
      nist: false,
      length: 256,
      message:
        '044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116df9e2eaaa42d9fe9e558a9b8ef1bf366f190aacaa83bad2641ee106e9041096e42d44da53f305ab94b6365837b9803627ab098c41a6013694f9b468bccb9c13e95b3900365eb58924de7158a54467e984efcfdabdbcc9af9a940d49c51455b04c63858e0487687c3eeb30796a3e9307680e1b81b860b01c88ff74545c2c314e36',
      expected:
        '560deb1d387f72dba729f0bd0231ad45998dda4b53951645322cf95c7b6261d9',
    },
    {
      nist: true,
      length: 256,
      message:
        '044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116df9e2eaaa42d9fe9e558a9b8ef1bf366f190aacaa83bad2641ee106e9041096e42d44da53f305ab94b6365837b9803627ab098c41a6013694f9b468bccb9c13e95b3900365eb58924de7158a54467e984efcfdabdbcc9af9a940d49c51455b04c63858e0487687c3eeb30796a3e9307680e1b81b860b01c88ff74545c2c314e36',
      expected:
        '1784354c4bbfa5f54e5db23041089e65a807a7b970e3cfdba95e2fbe63b1c0e4',
    },
    {
      nist: false,
      length: 256,
      message:
        '391ccf9b5de23bb86ec6b2b142adb6e9ba6bee8519e7502fb8be8959fbd2672934cc3e13b7b45bf2b8a5cb48881790a7438b4a326a0c762e31280711e6b64fcc2e3e4e631e501d398861172ea98603618b8f23b91d0208b0b992dfe7fdb298b6465adafbd45e4f88ee9dc94e06bc4232be91587f78572c169d4de4d8b95b714ea62f1fbf3c67a4',
      expected:
        '7d5655391ede9ca2945f32ad9696f464be8004389151ce444c89f688278f2e1d',
    },
    {
      nist: false,
      length: 256,
      message:
        'ff391ccf9b5de23bb86ec6b2b142adb6e9ba6bee8519e7502fb8be8959fbd2672934cc3e13b7b45bf2b8a5cb48881790a7438b4a326a0c762e31280711e6b64fcc2e3e4e631e501d398861172ea98603618b8f23b91d0208b0b992dfe7fdb298b6465adafbd45e4f88ee9dc94e06bc4232be91587f78572c169d4de4d8b95b714ea62f1fbf3c67a4',
      expected:
        '37694fd4ba137be747eb25a85b259af5563e0a7a3010d42bd15963ac631b9d3f',
    },
    {
      nist: false,
      length: 256,
      message:
        '80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
      expected:
        'bbf1f49a2cc5678aa62196d0c3108d89425b81780e1e90bcec03b4fb5f834714',
    },
    {
      nist: false,
      length: 256,
      message:
        '80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
      expected:
        'bbf1f49a2cc5678aa62196d0c3108d89425b81780e1e90bcec03b4fb5f834714',
    },
    {
      nist: false,
      length: 256,
      message: 'a2c0',
      expected:
        '9856642c690c036527b8274db1b6f58c0429a88d9f3b9298597645991f4f58f0',
    },
    {
      nist: false,
      length: 256,
      message: '0a2c',
      expected:
        '295b48ad49eff61c3abfd399c672232434d89a4ef3ca763b9dbebb60dbb32a8b',
    },
    {
      nist: false,
      length: 256,
      message: '00',
      expected:
        'bc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a',
    },
  ];
}
