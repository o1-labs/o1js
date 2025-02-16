import { Field } from '../field.js';
import { Gadgets } from '../gadgets/gadgets.js';
import { assert } from '../../util/errors.js';
import { FlexibleBytes } from '../bytes.js';
import { UInt8 } from '../int.js';
import { Bytes } from '../wrapped-classes.js';
import { bytesToWords, wordsToBytes } from '../gadgets/bit-slices.js';

export { Keccak };

const Keccak = {
  /**
   * Implementation of [NIST SHA-3](https://csrc.nist.gov/pubs/fips/202/final) Hash Function.
   * Supports output lengths of 256, 384, or 512 bits.
   *
   * Applies the SHA-3 hash function to a list of big-endian byte-sized {@link Field} elements, flexible to handle varying output lengths (256, 384, 512 bits) as specified.
   *
   * The function accepts {@link Bytes} as the input message, which is a type that represents a static-length list of byte-sized field elements (range-checked using {@link Gadgets.rangeCheck8}).
   * Alternatively, you can pass plain `number[]` of `Uint8Array` to perform a hash outside provable code.
   *
   * Produces an output of {@link Bytes} that conforms to the chosen bit length.
   * Both input and output bytes are big-endian.
   *
   * @param len - Desired output length in bits. Valid options: 256, 384, 512.
   * @param message - Big-endian {@link Bytes} representing the message to hash.
   *
   * ```ts
   * let preimage = Bytes.fromString("hello world");
   * let digest256 = Keccak.nistSha3(256, preimage);
   * let digest384 = Keccak.nistSha3(384, preimage);
   * let digest512 = Keccak.nistSha3(512, preimage);
   * ```
   *
   */
  nistSha3(len: 256 | 384 | 512, message: FlexibleBytes) {
    return nistSha3(len, Bytes.from(message));
  },
  /**
   * Ethereum-Compatible Keccak-256 Hash Function.
   * This is a specialized variant of {@link Keccak.preNist} configured for a 256-bit output length.
   *
   * Primarily used in Ethereum for hashing transactions, messages, and other types of payloads.
   *
   * The function accepts {@link Bytes} as the input message, which is a type that represents a static-length list of byte-sized field elements (range-checked using {@link Gadgets.rangeCheck8}).
   * Alternatively, you can pass plain `number[]` of `Uint8Array` to perform a hash outside provable code.
   *
   * Produces an output of {@link Bytes} of length 32. Both input and output bytes are big-endian.
   *
   * @param message - Big-endian {@link Bytes} representing the message to hash.
   *
   * ```ts
   * let preimage = Bytes.fromString("hello world");
   * let digest = Keccak.ethereum(preimage);
   * ```
   */
  ethereum(message: FlexibleBytes) {
    return ethereum(Bytes.from(message));
  },
  /**
   * Implementation of [pre-NIST Keccak](https://keccak.team/keccak.html) hash function.
   * Supports output lengths of 256, 384, or 512 bits.
   *
   * Keccak won the SHA-3 competition and was slightly altered before being standardized as SHA-3 by NIST in 2015.
   * This variant was used in Ethereum before the NIST standardization, by specifying `len` as 256 bits you can obtain the same hash function as used by Ethereum {@link Keccak.ethereum}.
   *
   * The function applies the pre-NIST Keccak hash function to a list of byte-sized {@link Field} elements and is flexible to handle varying output lengths (256, 384, 512 bits) as specified.
   *
   * {@link Keccak.preNist} accepts {@link Bytes} as the input message, which is a type that represents a static-length list of byte-sized field elements (range-checked using {@link Gadgets.rangeCheck8}).
   * Alternatively, you can pass plain `number[]` of `Uint8Array` to perform a hash outside provable code.
   *
   * Produces an output of {@link Bytes} that conforms to the chosen bit length.
   * Both input and output bytes are big-endian.
   *
   * @param len - Desired output length in bits. Valid options: 256, 384, 512.
   * @param message - Big-endian {@link Bytes} representing the message to hash.
   *
   * ```ts
   * let preimage = Bytes.fromString("hello world");
   * let digest256 = Keccak.preNist(256, preimage);
   * let digest384 = Keccak.preNist(384, preimage);
   * let digest512= Keccak.preNist(512, preimage);
   * ```
   *
   */
  preNist(len: 256 | 384 | 512, message: FlexibleBytes) {
    return preNist(len, Bytes.from(message));
  },
};

// KECCAK CONSTANTS

// Length of the square matrix side of Keccak states
const KECCAK_DIM = 5;

// Value `l` in Keccak, ranges from 0 to 6 and determines the lane width
const KECCAK_ELL = 6;

// Width of a lane of the state, meaning the length of each word in bits (64)
const KECCAK_WORD = 2 ** KECCAK_ELL;

// Number of bytes that fit in a word (8)
const BYTES_PER_WORD = KECCAK_WORD / 8;

// Length of the state in words, 5x5 = 25
const KECCAK_STATE_LENGTH_WORDS = KECCAK_DIM ** 2;

// Length of the state in bits, meaning the 5x5 matrix of words in bits (1600)
const KECCAK_STATE_LENGTH = KECCAK_STATE_LENGTH_WORDS * KECCAK_WORD;

// Length of the state in bytes, meaning the 5x5 matrix of words in bytes (200)
const KECCAK_STATE_LENGTH_BYTES = KECCAK_STATE_LENGTH / 8;

// Creates the 5x5 table of rotation offset for Keccak modulo 64
//  | i \ j |  0 |  1 |  2 |  3 |  4 |
//  | ----- | -- | -- | -- | -- | -- |
//  | 0     |  0 | 36 |  3 | 41 | 18 |
//  | 1     |  1 | 44 | 10 | 45 |  2 |
//  | 2     | 62 |  6 | 43 | 15 | 61 |
//  | 3     | 28 | 55 | 25 | 21 | 56 |
//  | 4     | 27 | 20 | 39 |  8 | 14 |
const ROT_TABLE = [
  [0, 36, 3, 41, 18],
  [1, 44, 10, 45, 2],
  [62, 6, 43, 15, 61],
  [28, 55, 25, 21, 56],
  [27, 20, 39, 8, 14],
];

// Round constants for Keccak
// From https://keccak.team/files/Keccak-reference-3.0.pdf
const ROUND_CONSTANTS = [
  0x0000000000000001n,
  0x0000000000008082n,
  0x800000000000808an,
  0x8000000080008000n,
  0x000000000000808bn,
  0x0000000080000001n,
  0x8000000080008081n,
  0x8000000000008009n,
  0x000000000000008an,
  0x0000000000000088n,
  0x0000000080008009n,
  0x000000008000000an,
  0x000000008000808bn,
  0x800000000000008bn,
  0x8000000000008089n,
  0x8000000000008003n,
  0x8000000000008002n,
  0x8000000000000080n,
  0x000000000000800an,
  0x800000008000000an,
  0x8000000080008081n,
  0x8000000000008080n,
  0x0000000080000001n,
  0x8000000080008008n,
];

// KECCAK HASH FUNCTION

// Computes the number of required extra bytes to pad a message of length bytes
function bytesToPad(rate: number, length: number): number {
  return rate - (length % rate);
}

// Pads a message M as:
// M || pad[x](|M|)
// The padded message will start with the message argument followed by the padding rule (below) to fulfill a length that is a multiple of rate (in bytes).
// If nist is true, then the padding rule is 0x06 ..0*..1.
// If nist is false, then the padding rule is 10*1.
function pad(message: UInt8[], rate: number, nist: boolean): UInt8[] {
  // Find out desired length of the padding in bytes
  // If message is already rate bits, need to pad full rate again
  const extraBytes = bytesToPad(rate, message.length);

  // 0x06 0x00 ... 0x00 0x80 or 0x86
  const first = nist ? 0x06n : 0x01n;
  const last = 0x80n;

  // Create the padding vector
  const pad = Array<UInt8>(extraBytes).fill(UInt8.from(0));
  pad[0] = UInt8.from(first);
  pad[extraBytes - 1] = pad[extraBytes - 1].add(last);

  // Return the padded message
  return [...message, ...pad];
}

// ROUND TRANSFORMATION

// First algorithm in the compression step of Keccak for 64-bit words.
// C[i] = A[i,0] xor A[i,1] xor A[i,2] xor A[i,3] xor A[i,4]
// D[i] = C[i-1] xor ROT(C[i+1], 1)
// E[i,j] = A[i,j] xor D[i]
// In the Keccak reference, it corresponds to the `theta` algorithm.
// We use the first index of the state array as the i coordinate and the second index as the j coordinate.
const theta = (state: Field[][]): Field[][] => {
  const stateA = state;

  // XOR the elements of each row together
  // for all i in {0..4}: C[i] = A[i,0] xor A[i,1] xor A[i,2] xor A[i,3] xor A[i,4]
  const stateC = stateA.map((row) => row.reduce(xor));

  // for all i in {0..4}: D[i] = C[i-1] xor ROT(C[i+1], 1)
  const stateD = Array.from({ length: KECCAK_DIM }, (_, i) =>
    xor(
      stateC[(i + KECCAK_DIM - 1) % KECCAK_DIM],
      Gadgets.rotate64(stateC[(i + 1) % KECCAK_DIM], 1, 'left')
    )
  );

  // for all i in {0..4} and j in {0..4}: E[i,j] = A[i,j] xor D[i]
  const stateE = stateA.map((row, index) => row.map((elem) => xor(elem, stateD[index])));

  return stateE;
};

// Second and third steps in the compression step of Keccak for 64-bit words.
// pi: A[i,j] = ROT(E[i,j], r[i,j])
// rho: A[i,j] = A'[j, 2i+3j mod KECCAK_DIM]
// piRho: B[j,2i+3j] = ROT(E[i,j], r[i,j])
// which is equivalent to the `rho` algorithm followed by the `pi` algorithm in the Keccak reference as follows:
// rho:
// A[0,0] = a[0,0]
// | i |  =  | 1 |
// | j |  =  | 0 |
// for t = 0 to 23 do
//   A[i,j] = ROT(a[i,j], (t+1)(t+2)/2 mod 64)))
//   | i |  =  | 0  1 |   | i |
//   |   |  =  |      | * |   |
//   | j |  =  | 2  3 |   | j |
// end for
// pi:
// for i = 0 to 4 do
//   for j = 0 to 4 do
//     | I |  =  | 0  1 |   | i |
//     |   |  =  |      | * |   |
//     | J |  =  | 2  3 |   | j |
//     A[I,J] = a[i,j]
//   end for
// end for
// We use the first index of the state array as the i coordinate and the second index as the j coordinate.
function piRho(state: Field[][]): Field[][] {
  const stateE = state;
  const stateB = State.zeros();

  // for all i in {0..4} and j in {0..4}: B[j,2i+3j] = ROT(E[i,j], r[i,j])
  for (let i = 0; i < KECCAK_DIM; i++) {
    for (let j = 0; j < KECCAK_DIM; j++) {
      stateB[j][(2 * i + 3 * j) % KECCAK_DIM] = Gadgets.rotate64(
        stateE[i][j],
        ROT_TABLE[i][j],
        'left'
      );
    }
  }

  return stateB;
}

// Fourth step of the compression function of Keccak for 64-bit words.
// F[i,j] = B[i,j] xor ((not B[i+1,j]) and B[i+2,j])
// It corresponds to the chi algorithm in the Keccak reference.
// for j = 0 to 4 do
//   for i = 0 to 4 do
//     A[i,j] = a[i,j] xor ((not a[i+1,j]) and a[i+2,j])
//   end for
// end for
function chi(state: Field[][]): Field[][] {
  const stateB = state;
  const stateF = State.zeros();

  // for all i in {0..4} and j in {0..4}: F[i,j] = B[i,j] xor ((not B[i+1,j]) and B[i+2,j])
  for (let i = 0; i < KECCAK_DIM; i++) {
    for (let j = 0; j < KECCAK_DIM; j++) {
      stateF[i][j] = xor(
        stateB[i][j],
        Gadgets.and(
          // We can use unchecked NOT because the length of the input is constrained to be 64 bits thanks to the fact that it is the output of a previous Xor64
          Gadgets.not(stateB[(i + 1) % KECCAK_DIM][j], KECCAK_WORD, false),
          stateB[(i + 2) % KECCAK_DIM][j],
          KECCAK_WORD
        )
      );
    }
  }

  return stateF;
}

// Fifth step of the permutation function of Keccak for 64-bit words.
// It takes the word located at the position (0,0) of the state and XORs it with the round constant.
function iota(state: Field[][], rc: bigint): Field[][] {
  const stateG = state;

  stateG[0][0] = xor(stateG[0][0], Field.from(rc));

  return stateG;
}

// One round of the Keccak permutation function.
// iota o chi o pi o rho o theta
function round(state: Field[][], rc: bigint): Field[][] {
  const stateA = state;
  const stateE = theta(stateA);
  const stateB = piRho(stateE);
  const stateF = chi(stateB);
  const stateD = iota(stateF, rc);
  return stateD;
}

// Keccak permutation function with a constant number of rounds
function permutation(state: Field[][], rcs: bigint[]): Field[][] {
  return rcs.reduce((state, rc) => round(state, rc), state);
}

// KECCAK SPONGE

// Absorb padded message into a keccak state with given rate and capacity
function absorb(paddedMessage: Field[], capacity: number, rate: number, rc: bigint[]): State {
  assert(
    rate + capacity === KECCAK_STATE_LENGTH_WORDS,
    `invalid rate or capacity (rate + capacity should be ${KECCAK_STATE_LENGTH_WORDS})`
  );
  assert(
    paddedMessage.length % rate === 0,
    'invalid padded message length (should be multiple of rate)'
  );

  let state = State.zeros();

  // array of capacity zero words
  const zeros = Array(capacity).fill(Field.from(0));

  for (let idx = 0; idx < paddedMessage.length; idx += rate) {
    // split into blocks of rate words
    const block = paddedMessage.slice(idx, idx + rate);
    // pad the block with 0s to up to KECCAK_STATE_LENGTH_WORDS words
    const paddedBlock = block.concat(zeros);
    // convert the padded block to a Keccak state
    const blockState = State.fromWords(paddedBlock);
    // xor the state with the padded block
    const stateXor = State.xor(state, blockState);
    // apply the permutation function to the xored state
    state = permutation(stateXor, rc);
  }
  return state;
}

// Squeeze state until it has a desired length in words
function squeeze(state: State, length: number, rate: number): Field[] {
  // number of squeezes
  const squeezes = Math.floor(length / rate) + 1;
  assert(squeezes === 1, 'squeezes should be 1');

  // Obtain the hash selecting the first `length` words of the output array
  const words = State.toWords(state);
  const hashed = words.slice(0, length);
  return hashed;
}

// Keccak sponge function for 200 bytes of state width
function sponge(paddedMessage: Field[], length: number, capacity: number, rate: number): Field[] {
  // check that the padded message is a multiple of rate
  assert(paddedMessage.length % rate === 0, 'Invalid padded message length');

  // absorb
  const state = absorb(paddedMessage, capacity, rate, ROUND_CONSTANTS);

  // squeeze
  const hashed = squeeze(state, length, rate);
  return hashed;
}

// Keccak hash function with input message passed as list of Field bytes.
// The message will be parsed as follows:
// - the first byte of the message will be the least significant byte of the first word of the state (A[0][0])
// - the 10*1 pad will take place after the message, until reaching the bit length rate.
// - then, {0} pad will take place to finish the 200 bytes of the state.
function hash(message: Bytes, length: number, capacity: number, nistVersion: boolean): UInt8[] {
  // Throw errors if used improperly
  assert(capacity > 0, 'capacity must be positive');
  assert(
    capacity < KECCAK_STATE_LENGTH_BYTES,
    `capacity must be less than ${KECCAK_STATE_LENGTH_BYTES}`
  );
  assert(length > 0, 'length must be positive');

  // convert capacity and length to word units
  assert(capacity % BYTES_PER_WORD === 0, 'length must be a multiple of 8');
  capacity /= BYTES_PER_WORD;
  assert(length % BYTES_PER_WORD === 0, 'length must be a multiple of 8');
  length /= BYTES_PER_WORD;

  const rate = KECCAK_STATE_LENGTH_WORDS - capacity;

  // apply padding, convert to words, and hash
  const paddedBytes = pad(message.bytes, rate * BYTES_PER_WORD, nistVersion);
  const padded = bytesToWords(paddedBytes);

  const hash = sponge(padded, length, capacity, rate);
  const hashBytes = wordsToBytes(hash);

  return hashBytes;
}

// Gadget for NIST SHA-3 function for output lengths 256/384/512.
function nistSha3(len: 256 | 384 | 512, message: Bytes): Bytes {
  let bytes = hash(message, len / 8, len / 4, true);
  return BytesOfBitlength[len].from(bytes);
}

// Gadget for pre-NIST SHA-3 function for output lengths 256/384/512.
// Note that when calling with output length 256 this is equivalent to the ethereum function
function preNist(len: 256 | 384 | 512, message: Bytes): Bytes {
  let bytes = hash(message, len / 8, len / 4, false);
  return BytesOfBitlength[len].from(bytes);
}

// Gadget for Keccak hash function for the parameters used in Ethereum.
function ethereum(message: Bytes): Bytes {
  return preNist(256, message);
}

// FUNCTIONS ON KECCAK STATE

type State = Field[][];
const State = {
  /**
   * Create a state of all zeros
   */
  zeros(): State {
    return Array.from(Array(KECCAK_DIM), (_) => Array(KECCAK_DIM).fill(Field.from(0)));
  },

  /**
   * Flatten state to words
   */
  toWords(state: State): Field[] {
    const words = Array<Field>(KECCAK_STATE_LENGTH_WORDS);
    for (let j = 0; j < KECCAK_DIM; j++) {
      for (let i = 0; i < KECCAK_DIM; i++) {
        words[KECCAK_DIM * j + i] = state[i][j];
      }
    }
    return words;
  },

  /**
   * Compose words to state
   */
  fromWords(words: Field[]): State {
    const state = State.zeros();
    for (let j = 0; j < KECCAK_DIM; j++) {
      for (let i = 0; i < KECCAK_DIM; i++) {
        state[i][j] = words[KECCAK_DIM * j + i];
      }
    }
    return state;
  },

  /**
   * XOR two states together and return the result
   */
  xor(a: State, b: State): State {
    assert(
      a.length === KECCAK_DIM && a[0].length === KECCAK_DIM,
      `invalid \`a\` dimensions (should be ${KECCAK_DIM})`
    );
    assert(
      b.length === KECCAK_DIM && b[0].length === KECCAK_DIM,
      `invalid \`b\` dimensions (should be ${KECCAK_DIM})`
    );

    // Calls xor() on each pair (i,j) of the states input1 and input2 and outputs the output Fields as a new matrix
    return a.map((row, i) => row.map((x, j) => xor(x, b[i][j])));
  },
};

// AUXILIARY TYPES

class Bytes32 extends Bytes(32) {}
class Bytes48 extends Bytes(48) {}
class Bytes64 extends Bytes(64) {}

const BytesOfBitlength = {
  256: Bytes32,
  384: Bytes48,
  512: Bytes64,
};

// xor which avoids doing anything on 0 inputs
// (but doesn't range-check the other input in that case)
function xor(x: Field, y: Field): Field {
  if (x.isConstant() && x.toBigInt() === 0n) return y;
  if (y.isConstant() && y.toBigInt() === 0n) return x;
  return Gadgets.xor(x, y, 64);
}
