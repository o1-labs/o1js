/**
 * Gadgets for converting between field elements and bit slices of various lengths
 */
import { bigIntToBits } from '../../../bindings/crypto/bigint-helpers.js';
import { Field } from '../field.js';
import { UInt8 } from '../int.js';
import { exists } from '../core/exists.js';
import { Provable } from '../provable.js';
import { chunk } from '../../util/arrays.js';
import { assert } from './common.js';
import type { Field3 } from './foreign-field.js';
import { l } from './range-check.js';

export { bytesToWord, wordToBytes, wordsToBytes, bytesToWords, sliceField3 };

// conversion between bytes and multi-byte words

/**
 * Convert an array of UInt8 to a Field element. Expects little endian representation.
 */
function bytesToWord(wordBytes: UInt8[]): Field {
  return wordBytes.reduce((acc, byte, idx) => {
    const shift = 1n << BigInt(8 * idx);
    return acc.add(byte.value.mul(shift));
  }, Field.from(0));
}

/**
 * Convert a Field element to an array of UInt8. Expects little endian representation.
 * @param bytesPerWord number of bytes per word
 */
function wordToBytes(word: Field, bytesPerWord = 8): UInt8[] {
  let bytes = Provable.witness(Provable.Array(UInt8, bytesPerWord), () => {
    let w = word.toBigInt();
    return Array.from({ length: bytesPerWord }, (_, k) => UInt8.from((w >> BigInt(8 * k)) & 0xffn));
  });

  // check decomposition
  bytesToWord(bytes).assertEquals(word);

  return bytes;
}

/**
 * Convert an array of Field elements to an array of UInt8. Expects little endian representation.
 * @param bytesPerWord number of bytes per word
 */
function wordsToBytes(words: Field[], bytesPerWord = 8): UInt8[] {
  return words.flatMap((w) => wordToBytes(w, bytesPerWord));
}
/**
 * Convert an array of UInt8 to an array of Field elements. Expects little endian representation.
 * @param bytesPerWord number of bytes per word
 */
function bytesToWords(bytes: UInt8[], bytesPerWord = 8): Field[] {
  return chunk(bytes, bytesPerWord).map(bytesToWord);
}

// conversion between 3-limb foreign fields and arbitrary bit slices

/**
 * Provable method for slicing a 3x88-bit bigint into smaller bit chunks of length `chunkSize`
 *
 * This serves as a range check that the input is in [0, 2^maxBits)
 */
function sliceField3(
  [x0, x1, x2]: Field3,
  { maxBits, chunkSize }: { maxBits: number; chunkSize: number }
) {
  let l_ = Number(l);
  assert(maxBits <= 3 * l_, `expected max bits <= 3*${l_}, got ${maxBits}`);

  // first limb
  let result0 = sliceField(x0, Math.min(l_, maxBits), chunkSize);
  if (maxBits <= l_) return result0.chunks;
  maxBits -= l_;

  // second limb
  let result1 = sliceField(x1, Math.min(l_, maxBits), chunkSize, result0);
  if (maxBits <= l_) return result0.chunks.concat(result1.chunks);
  maxBits -= l_;

  // third limb
  let result2 = sliceField(x2, maxBits, chunkSize, result1);
  return result0.chunks.concat(result1.chunks, result2.chunks);
}

/**
 * Provable method for slicing a field element into smaller bit chunks of length `chunkSize`.
 *
 * This serves as a range check that the input is in [0, 2^maxBits)
 *
 * If `chunkSize` does not divide `maxBits`, the last chunk will be smaller.
 * We return the number of free bits in the last chunk, and optionally accept such a result from a previous call,
 * so that this function can be used to slice up a bigint of multiple limbs into homogeneous chunks.
 *
 * TODO: atm this uses expensive boolean checks for each bit.
 * For larger chunks, we should use more efficient range checks.
 */
function sliceField(
  x: Field,
  maxBits: number,
  chunkSize: number,
  leftover?: { chunks: Field[]; leftoverSize: number }
) {
  let bits = exists(maxBits, () => {
    let bits = bigIntToBits(x.toBigInt());
    // normalize length
    if (bits.length > maxBits) bits = bits.slice(0, maxBits);
    if (bits.length < maxBits) bits = bits.concat(Array(maxBits - bits.length).fill(false));
    return bits.map(BigInt);
  });

  let chunks = [];
  let sum = Field.from(0n);

  // if there's a leftover chunk from a previous sliceField() call, we complete it
  if (leftover !== undefined) {
    let { chunks: previous, leftoverSize: size } = leftover;
    let remainingChunk = Field.from(0n);
    for (let i = 0; i < size; i++) {
      let bit = bits[i];
      bit.assertBool();
      remainingChunk = remainingChunk.add(bit.mul(1n << BigInt(i)));
    }
    sum = remainingChunk = remainingChunk.seal();
    let chunk = previous[previous.length - 1];
    previous[previous.length - 1] = chunk.add(remainingChunk.mul(1n << BigInt(chunkSize - size)));
  }

  let i = leftover?.leftoverSize ?? 0;
  for (; i < maxBits; i += chunkSize) {
    // prove that chunk has `chunkSize` bits
    // TODO: this inner sum should be replaced with a more efficient range check when possible
    let chunk = Field.from(0n);
    let size = Math.min(maxBits - i, chunkSize); // last chunk might be smaller
    for (let j = 0; j < size; j++) {
      let bit = bits[i + j];
      bit.assertBool();
      chunk = chunk.add(bit.mul(1n << BigInt(j)));
    }
    chunk = chunk.seal();
    // prove that chunks add up to x
    sum = sum.add(chunk.mul(1n << BigInt(i)));
    chunks.push(chunk);
  }
  sum.assertEquals(x);

  let leftoverSize = i - maxBits;
  return { chunks, leftoverSize } as const;
}
