/**
 * Gadgets for converting between field elements and bit slices of various lengths
 */
import { Field } from '../field.js';
import { UInt8 } from '../int.js';
import { Provable } from '../provable.js';
import { chunk } from '../util/arrays.js';

export { bytesToWord, wordToBytes, wordsToBytes, bytesToWords };

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
    return Array.from({ length: bytesPerWord }, (_, k) =>
      UInt8.from((w >> BigInt(8 * k)) & 0xffn)
    );
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
