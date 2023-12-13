import { Poseidon } from './hash.js';
import { Keccak } from './keccak.js';
import { Bytes } from './provable-types/provable-types.js';

export { Hash };

// TODO do we want this?
const Hash = {
  hash: Poseidon.hash,
  Poseidon,
  SHA3_256: {
    hash(bytes: Bytes) {
      return Keccak.nistSha3(256, bytes);
    },
  },
  SHA3_384: {
    hash(bytes: Bytes) {
      return Keccak.nistSha3(384, bytes);
    },
  },
  SHA3_512: {
    hash(bytes: Bytes) {
      return Keccak.nistSha3(512, bytes);
    },
  },
  Keccak256: {
    hash(bytes: Bytes) {
      return Keccak.preNist(256, bytes);
    },
  },
  Keccak384: {
    hash(bytes: Bytes) {
      return Keccak.preNist(384, bytes);
    },
  },
  Keccak512: {
    hash(bytes: Bytes) {
      return Keccak.preNist(512, bytes);
    },
  },
};
