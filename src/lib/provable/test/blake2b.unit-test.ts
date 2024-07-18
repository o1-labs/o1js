import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Bytes } from '../wrapped-classes.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { blake2b as nobleBlake2b } from '@noble/hashes/blake2b';
import { bytes } from './test-utils.js';
import {
  equivalentAsync,
  equivalentProvable,
} from '../../testing/equivalent.js';
import { Random, sample } from '../../testing/random.js';
import { expect } from 'expect';


const Blake2bProgram = ZkProgram({
  name: `blake2b`,
  publicOutput: Bytes(64).provable,
  methods: {
    blake2b: {
      privateInputs: [Bytes(43).provable],
      async method(preImage: Bytes) {
        return Gadgets.BLAKE2B.hash(preImage);
      },
    },
  },
});

await Blake2bProgram.compile();

for (let { preimage, hash } of testVectors()) {
  let actual = Gadgets.BLAKE2B.hash(Bytes.fromString(preimage));
  expect(actual.toHex()).toEqual(hash);
}


function testVectors() {
  return [
    {
      preimage: 'The quick brown fox jumps over the lazy dog',
      hash: 'a8add4bdddfd93e4877d2746e62817b116364a1fa7bc148d95090bc7333b3673f82401cf7aa2e4cb1ecd90296e3f14cb5413f8ed77be73045b13914cdcd6a918'
    },
    {
      preimage: 'o1js',
      hash: 'abe5652d5c204163a4b418b33577b8ccebd5a5ed3d8cbb9781e7ea4a1bc3344c9e5e5707112d656f642927a42d34f96439f68a1ff0a2aa621a3f1fbb2521b18f',
    },
    {
      preimage: '',
      hash: '786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce'
    }

  ];
}
