import { Keccak } from './keccak.js';
import { ZkProgram } from './proof_system.js';
import { Random, sample } from './testing/random.js';
import { equivalent, equivalentAsync, spec } from './testing/equivalent.js';
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
import { Bytes } from './provable-types/provable-types.js';

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

// checks outside circuit
// TODO: fix witness generation slowness

const bytes = (length: number) => {
  const Bytes_ = Bytes(length);
  return spec<Uint8Array, Bytes>({
    rng: Random.map(Random.bytes(length), (x) => Uint8Array.from(x)),
    there: Bytes_.from,
    back: (x) => x.toBytes(),
    provable: Bytes_.provable,
  });
};

for (let length of lengths) {
  let [preimageLength] = sample(Random.nat(100), 1);
  console.log(`Testing ${length} with preimage length ${preimageLength}`);
  let inputBytes = bytes(preimageLength);
  let outputBytes = bytes(length / 8);

  equivalent({ from: [inputBytes], to: outputBytes, verbose: true })(
    testImplementations.sha3[length],
    (x) => Keccak.nistSha3(length, x),
    `sha3 ${length}`
  );

  equivalent({ from: [inputBytes], to: outputBytes, verbose: true })(
    testImplementations.preNist[length],
    (x) => Keccak.preNist(length, x),
    `keccak ${length}`
  );
}

// Choose a test length at random
const digestLength = lengths[Math.floor(Math.random() * 3)];

// Digest length in bytes
const digestLengthBytes = digestLength / 8;

const preImageLength = 32;

// No need to test Ethereum because it's just a special case of preNist
const KeccakProgram = ZkProgram({
  name: `keccak-test-${digestLength}`,
  publicInput: Bytes(preImageLength).provable,
  publicOutput: Bytes(digestLengthBytes).provable,
  methods: {
    nistSha3: {
      privateInputs: [],
      method(preImage: Bytes) {
        return Keccak.nistSha3(digestLength, preImage);
      },
    },
    preNist: {
      privateInputs: [],
      method(preImage: Bytes) {
        return Keccak.preNist(digestLength, preImage);
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
  const proof = await KeccakProgram.nistSha3(x);
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
  const proof = await KeccakProgram.preNist(x);
  await KeccakProgram.verify(proof);
  return proof.publicOutput;
});
