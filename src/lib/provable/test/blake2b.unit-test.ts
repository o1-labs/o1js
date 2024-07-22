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

for (let { digest_length ,preimage, hash } of testVectors()) {
  let actual = Gadgets.BLAKE2B.hash(Bytes.fromString(preimage), digest_length);
  expect(actual.toHex()).toEqual(hash);
}


function testVectors() {
  return [
    {
      digest_length: 32,
      preimage: 'The quick brown fox jumps over the lazy dog',
      hash: '01718cec35cd3d796dd00020e0bfecb473ad23457d063b75eff29c0ffa2e58a9'
    },
    {
      digest_length: 32,
      preimage: 'o1js',
      hash: '2b8198c64ceccbf2863835a07be336da04479cf0bd460565526e916367b77988',
    },
    {
      digest_length: 32,
      preimage: '',
      hash: '0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8'
    },
    {
      digest_length: 32,
      preimage: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
      hash: 'fa30f36c826e6bf4531e79e01f12e7f773e7ab62bd1ffd38cf0e950eaf5c0434'
    },
    {
      digest_length: 32,
      preimage: '4a656665',
      hash: 'b009ba3a88866add8b55de6cc8c040370a09022dc3f80afce090d81b0d8eded4',
    },
    {
      digest_length: 32,
      preimage: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      hash: '5c3c8bdd63c262d014180d9d54d797946c921fa65f02703c33bca7062e1829c1'
    },
    {
      digest_length: 64,
      preimage: 'The quick brown fox jumps over the lazy dog',
      hash: 'a8add4bdddfd93e4877d2746e62817b116364a1fa7bc148d95090bc7333b3673f82401cf7aa2e4cb1ecd90296e3f14cb5413f8ed77be73045b13914cdcd6a918'
    },
    {
      digest_length: 64,
      preimage: 'o1js',
      hash: 'abe5652d5c204163a4b418b33577b8ccebd5a5ed3d8cbb9781e7ea4a1bc3344c9e5e5707112d656f642927a42d34f96439f68a1ff0a2aa621a3f1fbb2521b18f',
    },
    {
      digest_length: 64,
      preimage: '',
      hash: '786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce'
    },
    {
      digest_length: 64,
      preimage: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
      hash: 'df2dc4b30ffd789f70735464374974de018318e5fc1343ae23d38ecfc3cba32ce81db8f831d86da2d047dd76fd295a268a99ff7c890239b2cdc207357b723c92'
    },
    {
      digest_length: 64,
      preimage: '4a656665',
      hash: 'f56d7da03e8a385777bef77834ded67cbafba64c6fc32887e6bdcc36774b6fe398ddd1bb6b77d4529cfd709ca9973e4a5d2635f9a6d3abaea7e0a44655ac7a9b',
    },
    {
      digest_length: 64,
      preimage: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      hash: '0d5cf4c5c6e55752eb16eeda9052158fe59c964f9e9cef77c68580a65d40904f5c3639101d48a95001568a21ae6cfe0b0b405fb3d4f77255f308ec0eb07bc35a'
    }
  ];
}
