import { Field } from './field.js';
import { Provable } from './provable.js';
import { Keccak } from './keccak.js';
import { keccak_256, sha3_256, keccak_512, sha3_512 } from '@noble/hashes/sha3';
import { ZkProgram } from './proof_system.js';
import { Random } from './testing/random.js';
import { array, equivalentAsync, fieldWithRng } from './testing/equivalent.js';
import { constraintSystem, contains } from './testing/constraint-system.js';

// TODO(jackryanservia): Add test to assert fail for byte that's larger than 255
// TODO(jackryanservia): Add random length with three runs

const PREIMAGE_LENGTH = 75;
const RUNS = 1;

const uint = (length: number) => fieldWithRng(Random.biguint(length));

const Keccak256 = ZkProgram({
  name: 'keccak256',
  publicInput: Provable.Array(Field, PREIMAGE_LENGTH),
  publicOutput: Provable.Array(Field, 32),
  methods: {
    ethereum: {
      privateInputs: [],
      method(preImage) {
        return Keccak.ethereum(preImage);
      },
    },
    // No need for preNist Keccak_256 because it's identical to ethereum
    nistSha3: {
      privateInputs: [],
      method(preImage) {
        return Keccak.nistSha3(256, preImage);
      },
    },
  },
});

await Keccak256.compile();

await equivalentAsync(
  {
    from: [array(uint(8), PREIMAGE_LENGTH)],
    to: array(uint(8), 32),
  },
  { runs: RUNS }
)(
  (x) => {
    const uint8Array = new Uint8Array(x.map(Number));
    const result = keccak_256(uint8Array);
    return Array.from(result).map(BigInt);
  },
  async (x) => {
    const proof = await Keccak256.ethereum(x);
    return proof.publicOutput;
  }
);

await equivalentAsync(
  {
    from: [array(uint(8), PREIMAGE_LENGTH)],
    to: array(uint(8), 32),
  },
  { runs: RUNS }
)(
  (x) => {
    const thing = x.map(Number);
    const result = sha3_256(new Uint8Array(thing));
    return Array.from(result).map(BigInt);
  },
  async (x) => {
    const proof = await Keccak256.nistSha3(x);
    return proof.publicOutput;
  }
);

// const Keccak512 = ZkProgram({
//   name: 'keccak512',
//   publicInput: Provable.Array(Field, PREIMAGE_LENGTH),
//   publicOutput: Provable.Array(Field, 64),
//   methods: {
//     preNist: {
//       privateInputs: [],
//       method(preImage) {
//         return Keccak.preNist(512, preImage, 'Big', 'Big', true);
//       },
//     },
//     nistSha3: {
//       privateInputs: [],
//       method(preImage) {
//         return Keccak.nistSha3(512, preImage, 'Big', 'Big', true);
//       },
//     },
//   },
// });

// await Keccak512.compile();

// await equivalentAsync(
//   {
//     from: [array(uint(8), PREIMAGE_LENGTH)],
//     to: array(uint(8), 64),
//   },
//   { runs: RUNS }
// )(
//   (x) => {
//     const uint8Array = new Uint8Array(x.map(Number));
//     const result = keccak_512(uint8Array);
//     return Array.from(result).map(BigInt);
//   },
//   async (x) => {
//     const proof = await Keccak512.preNist(x);
//     return proof.publicOutput;
//   }
// );

// await equivalentAsync(
//   {
//     from: [array(uint(8), PREIMAGE_LENGTH)],
//     to: array(uint(8), 64),
//   },
//   { runs: RUNS }
// )(
//   (x) => {
//     const thing = x.map(Number);
//     const result = sha3_512(new Uint8Array(thing));
//     return Array.from(result).map(BigInt);
//   },
//   async (x) => {
//     const proof = await Keccak512.nistSha3(x);
//     return proof.publicOutput;
//   }
// );

constraintSystem.fromZkProgram(
  Keccak256,
  'ethereum',
  contains([['Generic'], ['Xor16'], ['Zero'], ['Rot64'], ['RangeCheck0']])
);
