import { Gadgets } from '../gadgets/gadgets.js';
import { Poseidon } from './poseidon.js';
import { Keccak } from './keccak.js';
import { Bytes } from '../wrapped-classes.js';

export { Hash };

/**
 * A collection of hash functions which can be used in provable code.
 */
const Hash = {
  /**
   * Hashes the given field elements using [Poseidon](https://eprint.iacr.org/2019/458.pdf). Alias for `Poseidon.hash()`.
   *
   * ```ts
   * let hash = Hash.hash([a, b, c]);
   * ```
   *
   * **Important:** This is by far the most efficient hash function o1js has available in provable code.
   * Use it by default, if no compatibility concerns require you to use a different hash function.
   *
   * The Poseidon implementation operates over the native [Pallas base field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/)
   * and uses parameters generated specifically for the [Mina](https://minaprotocol.com) blockchain.
   *
   * We use a `rate` of 2, which means that 2 field elements are hashed per permutation.
   * A permutation causes 11 rows in the constraint system.
   *
   * You can find the full set of Poseidon parameters [here](https://github.com/o1-labs/o1js-bindings/blob/main/crypto/constants.ts).
   */
  hash: Poseidon.hash,

  /**
   * The [Poseidon](https://eprint.iacr.org/2019/458.pdf) hash function.
   *
   * See {@link Hash.hash} for details and usage examples.
   */
  Poseidon,

  /**
   * The SHA2 hash function with an output length of 256 bits.
   */
  SHA2_256: {
    /**
     * Hashes the given bytes using SHA2-256.
     *
     * This is an alias for `Gadgets.SHA256.hash(bytes)`.\
     * See {@link Gadgets.SHA256.hash} for details and usage examples.
     */
    hash: Gadgets.SHA256.hash,
  },

  /**
   * The SHA2 hash function with an output length of 224 | 256 | 384 | 512 bits.
   */
  SHA2: {
    /**
     * Hashes the given bytes using SHA2.
     *
     * This is an alias for `Gadgets.SHA2.hash(length,bytes)`.\
     * See {@link Gadgets.SHA2.hash} for details and usage examples.
     */
    hash: Gadgets.SHA2.hash,
  },

  /**
   * The SHA3 hash function with an output length of 256 bits.
   */
  SHA3_256: {
    /**
     * Hashes the given bytes using SHA3-256.
     *
     * This is an alias for `Keccak.nistSha3(256, bytes)`.\
     * See {@link Keccak.nistSha3} for details and usage examples.
     */
    hash(bytes: Bytes) {
      return Keccak.nistSha3(256, bytes);
    },
  },

  /**
   * The SHA3 hash function with an output length of 384 bits.
   */
  SHA3_384: {
    /**
     * Hashes the given bytes using SHA3-384.
     *
     * This is an alias for `Keccak.nistSha3(384, bytes)`.\
     * See {@link Keccak.nistSha3} for details and usage examples.
     */
    hash(bytes: Bytes) {
      return Keccak.nistSha3(384, bytes);
    },
  },

  /**
   * The SHA3 hash function with an output length of 512 bits.
   */
  SHA3_512: {
    /**
     * Hashes the given bytes using SHA3-512.
     *
     * This is an alias for `Keccak.nistSha3(512, bytes)`.\
     * See {@link Keccak.nistSha3} for details and usage examples.
     */
    hash(bytes: Bytes) {
      return Keccak.nistSha3(512, bytes);
    },
  },

  /**
   * The pre-NIST Keccak hash function with an output length of 256 bits.
   */
  Keccak256: {
    /**
     * Hashes the given bytes using Keccak-256.
     *
     * This is an alias for `Keccak.preNist(256, bytes)`.\
     * See {@link Keccak.preNist} for details and usage examples.
     */
    hash(bytes: Bytes) {
      return Keccak.preNist(256, bytes);
    },
  },

  /**
   * The pre-NIST Keccak hash function with an output length of 384 bits.
   */
  Keccak384: {
    /**
     * Hashes the given bytes using Keccak-384.
     *
     * This is an alias for `Keccak.preNist(384, bytes)`.\
     * See {@link Keccak.preNist} for details and usage examples.
     */
    hash(bytes: Bytes) {
      return Keccak.preNist(384, bytes);
    },
  },

  /**
   * The pre-NIST Keccak hash function with an output length of 512 bits.
   */
  Keccak512: {
    /**
     * Hashes the given bytes using Keccak-512.
     *
     * This is an alias for `Keccak.preNist(512, bytes)`.\
     * See {@link Keccak.preNist} for details and usage examples.
     */
    hash(bytes: Bytes) {
      return Keccak.preNist(512, bytes);
    },
  },

  BLAKE2B: {
    hash(bytes: Bytes) {
      return Gadgets.BLAKE2B.hash(bytes);
    },
  },
};
