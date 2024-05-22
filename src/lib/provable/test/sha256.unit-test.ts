import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Bytes } from '../wrapped-classes.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { bytes } from './test-utils.js';
import {
  equivalentAsync,
  equivalentProvable,
} from '../../testing/equivalent.js';
import { Random, sample } from '../../testing/random.js';
import { describe, test } from 'node:test';
import { expect } from 'expect';
import { concatBytes } from '@noble/hashes/utils';
import { SHA256 } from '../gadgets/sha256.js';

sample(Random.nat(400), 5).forEach((preimageLength) => {
  let inputBytes = bytes(preimageLength);
  let outputBytes = bytes(256 / 8);

  equivalentProvable({ from: [inputBytes], to: outputBytes, verbose: true })(
    (x) => nobleSha256(x),
    (x) => Gadgets.SHA256.hash(x),
    `sha256 preimage length ${preimageLength}`
  );
});

const Sha256Program = ZkProgram({
  name: `sha256`,
  publicOutput: Bytes(32).provable,
  methods: {
    sha256: {
      privateInputs: [Bytes(192).provable],
      async method(preImage: Bytes) {
        return Gadgets.SHA256.hash(preImage);
      },
    },
  },
});

const RUNS = 2;

await Sha256Program.compile();

await equivalentAsync(
  {
    from: [bytes(192)],
    to: bytes(32),
  },
  { runs: RUNS }
)(nobleSha256, async (x) => {
  const proof = await Sha256Program.sha256(x);
  await Sha256Program.verify(proof);
  return proof.publicOutput;
});

for (let { preimage, hash } of testVectors()) {
  let actual = Gadgets.SHA256.hash(Bytes.fromString(preimage));
  expect(actual.toHex()).toEqual(hash);
}

function testVectors() {
  return [
    {
      preimage: 'abc',
      hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    },
    {
      preimage: 'a'.repeat(1000000),
      hash: 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    },
    {
      preimage: '',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      preimage:
        'de188941a3375d3a8a061e67576e926dc71a7fa3f0cceb97452b4d3227965f9ea8cc75076d9fb9c5417aa5cb30fc22198b34982dbb629e',
      hash: '70b6ee0dd06c26d51177d5bb1de954d6d50aa9f7b771b4401415d43da40605ad',
    },
  ];
}

describe('SHA256 Sliding Window Tests', () => {
  // Define iteration limit to make tests quicker
  const MAX_ITERATION = false;
  const TEST_SIZE = MAX_ITERATION ? 256 : 20;

  let BYTES_768 = new Uint8Array(256 * 3);
  // Fill with random data
  for (let i = 0; i < (256 * 3) / 32; i++)
    BYTES_768.set(
      nobleSha256.create().update(new Uint8Array(i)).digest(),
      i * 32
    );

  test(`Partial: SHA256`, async () => {
    const sha256Digest = nobleSha256.create().update(BYTES_768).digest();
    for (let i = 0; i < TEST_SIZE; i++) {
      let b1 = BYTES_768.subarray(0, i);
      for (let j = 0; j < TEST_SIZE; j++) {
        let b2 = BYTES_768.subarray(i, i + j);
        let b3 = BYTES_768.subarray(i + j);
        expect(concatBytes(b1, b2, b3)).toEqual(BYTES_768);
        expect(
          SHA256.update(Bytes.from(b1))
            .update(Bytes.from(b2))
            .update(Bytes.from(b3))
            .digest()
            .toBytes()
        ).toEqual(sha256Digest);
      }
    }
  });

  // Same as before, but creates copy of each slice, which changes dataoffset of typed array
  // Catched bug in blake2
  test(`Partial (copy): SHA256 partial`, () => {
    const sha256Digest = nobleSha256.create().update(BYTES_768).digest();
    for (let i = 0; i < TEST_SIZE; i++) {
      let b1 = BYTES_768.subarray(0, i).slice();
      for (let j = 0; j < TEST_SIZE; j++) {
        let b2 = BYTES_768.subarray(i, i + j).slice();
        let b3 = BYTES_768.subarray(i + j).slice();
        expect(concatBytes(b1, b2, b3)).toEqual(BYTES_768);
        expect(
          SHA256.update(Bytes.from(b1))
            .update(Bytes.from(b2))
            .update(Bytes.from(b3))
            .digest()
            .toBytes()
        ).toEqual(sha256Digest);
      }
    }
  });
});
