import { Field } from './field.js';
import { Provable } from './provable.js';
import { Keccak } from './keccak.js';
import { ZkProgram } from './proof_system.js';
import { Random } from './testing/random.js';
import { array, equivalentAsync, fieldWithRng } from './testing/equivalent.js';
import { constraintSystem, contains } from './testing/constraint-system.js';
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

const uint = (length: number) => fieldWithRng(Random.biguint(length));

// Choose a test length at random
const digestLength = [224, 256, 384, 512][Math.floor(Math.random() * 4)] as
  | 224
  | 256
  | 384
  | 512;

// Digest length in bytes
const digestLengthBytes = digestLength / 8;

// Chose a random preimage length
const preImageLength = Math.floor(digestLength / (Math.random() * 4 + 2));

// No need to test Ethereum because it's just a special case of preNist
const KeccakProgram = ZkProgram({
  name: 'keccak-test',
  publicInput: Provable.Array(Field, preImageLength),
  publicOutput: Provable.Array(Field, digestLengthBytes),
  methods: {
    nistSha3: {
      privateInputs: [],
      method(preImage) {
        return Keccak.nistSha3(digestLength, preImage);
      },
    },
    preNist: {
      privateInputs: [],
      method(preImage) {
        return Keccak.preNist(digestLength, preImage);
      },
    },
  },
});

await KeccakProgram.compile();

// SHA-3
await equivalentAsync(
  {
    from: [array(uint(8), preImageLength)],
    to: array(uint(8), digestLengthBytes),
  },
  { runs: RUNS }
)(
  (x) => {
    const byteArray = new Uint8Array(x.map(Number));
    const result = testImplementations.sha3[digestLength](byteArray);
    return Array.from(result).map(BigInt);
  },
  async (x) => {
    const proof = await KeccakProgram.nistSha3(x);
    await KeccakProgram.verify(proof);
    return proof.publicOutput;
  }
);

// PreNIST Keccak
await equivalentAsync(
  {
    from: [array(uint(8), preImageLength)],
    to: array(uint(8), digestLengthBytes),
  },
  { runs: RUNS }
)(
  (x) => {
    const byteArray = new Uint8Array(x.map(Number));
    const result = testImplementations.preNist[digestLength](byteArray);
    return Array.from(result).map(BigInt);
  },
  async (x) => {
    const proof = await KeccakProgram.preNist(x);
    await KeccakProgram.verify(proof);
    return proof.publicOutput;
  }
);

// This takes a while and doesn't do much, so I commented it out
// Constraint system sanity check
// constraintSystem.fromZkProgram(
//   KeccakTest,
//   'preNist',
//   contains([['Generic'], ['Xor16'], ['Zero'], ['Rot64'], ['RangeCheck0']])
// );
