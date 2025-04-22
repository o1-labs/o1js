import { bytesToBigInt, changeBase } from '../crypto/bigint-helpers.js';
import { Field } from '../../lib/provable/wrapped.js';

export {
  stringToFields,
  stringFromFields,
  bytesToFields,
  bytesFromFields,
  Bijective,
};

// functions for encoding data as field elements

// these methods are not for in-snark computation -- from the snark POV,
// encryption operates on an array of field elements.
// we also assume here that all fields are constant!

// caveat: this is suitable for encoding arbitrary bytes as fields, but not the other way round
// to encode fields as bytes in a recoverable way, you need different methods
/**
 * Encodes a JavaScript string into a list of {@link Field} elements.
 *
 * This function is not a valid in-snark computation.
 */
function stringToFields(message: string) {
  let bytes = new TextEncoder().encode(message);
  return bytesToFields(bytes);
}

/**
 * Decodes a list of {@link Field} elements into a JavaScript string.
 *
 * This function is not a valid in-snark computation.
 */
function stringFromFields(fields: Field[]) {
  let bytes = bytesFromFields(fields);
  return new TextDecoder().decode(bytes);
}

const STOP = 0x01;

/**
 * Encodes a {@link Uint8Array} into {@link Field} elements.
 */
function bytesToFields(bytes: Uint8Array) {
  // we encode 248 bits (31 bytes) at a time into one field element
  let fields = [];
  let currentBigInt = 0n;
  let bitPosition = 0n;
  for (let byte of bytes) {
    currentBigInt += BigInt(byte) << bitPosition;
    bitPosition += 8n;
    if (bitPosition === 248n) {
      fields.push(Field(currentBigInt.toString()));
      currentBigInt = 0n;
      bitPosition = 0n;
    }
  }
  // encode the final chunk, with an added STOP byte to make the mapping invertible
  currentBigInt += BigInt(STOP) << bitPosition;
  fields.push(Field(currentBigInt.toString()));
  return fields;
}
/**
 * Decodes a list of {@link Field} elements into a {@link Uint8Array}.
 */
function bytesFromFields(fields: Field[]) {
  // find STOP byte in last chunk to determine length of byte array
  let lastChunk = fields.pop();
  if (lastChunk === undefined) return new Uint8Array();
  let lastChunkBytes = bytesOfConstantField(lastChunk);
  let i = lastChunkBytes.lastIndexOf(STOP, 30);
  if (i === -1) throw Error('Error (bytesFromFields): Invalid encoding.');
  let bytes = new Uint8Array(fields.length * 31 + i);
  bytes.set(lastChunkBytes.subarray(0, i), fields.length * 31);
  // convert the remaining fields
  i = 0;
  for (let field of fields) {
    bytes.set(bytesOfConstantField(field).subarray(0, 31), i);
    i += 31;
  }
  fields.push(lastChunk);
  return bytes;
}

// bijective fields <--> bytes mapping
// this is suitable for converting *arbitrary* fields AND bytes back and forth
// the interpretation of the fields/bytes array is as digits of a single big integer
// which implies the small caveat that trailing zeroes in the field/bytes array get ignored
// another caveat: the algorithm is O(n^(1 + t)) with t > 0; ~1MB of field elements take about 1-2s to convert

// this needs the exact field size
let p = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001n;
let q = 0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001n;
let bytesPerBigInt = 32;
let bytesBase = 256n ** BigInt(bytesPerBigInt);

const Bijective = {
  Fp: {
    toBytes: (fields: Field[]) => toBytesBijective(fields, p),
    fromBytes: (bytes: Uint8Array) => toFieldsBijective(bytes, p),

    toString(fields: Field[]) {
      return new TextDecoder().decode(toBytesBijective(fields, p));
    },
    fromString(message: string) {
      let bytes = new TextEncoder().encode(message);
      return toFieldsBijective(bytes, p);
    },
  },
  Fq: {
    toBytes: (fields: Field[]) => toBytesBijective(fields, q),
    fromBytes: (bytes: Uint8Array) => toFieldsBijective(bytes, q),

    toString(fields: Field[]) {
      return new TextDecoder().decode(toBytesBijective(fields, q));
    },
    fromString(message: string) {
      let bytes = new TextEncoder().encode(message);
      return toFieldsBijective(bytes, q);
    },
  },
};

function toBytesBijective(fields: Field[], p: bigint) {
  let fieldsBigInts = fields.map((x) => x.toBigInt());
  let bytesBig = changeBase(fieldsBigInts, p, bytesBase);
  let bytes = bigIntArrayToBytes(bytesBig, bytesPerBigInt);
  return bytes;
}

function toFieldsBijective(bytes: Uint8Array, p: bigint) {
  let bytesBig = bytesToBigIntArray(bytes, bytesPerBigInt);
  let fieldsBigInts = changeBase(bytesBig, bytesBase, p);
  let fields = fieldsBigInts.map(Field);
  return fields;
}

function bytesOfConstantField(field: Field): Uint8Array {
  return Uint8Array.from(Field.toBytes(field));
}

function bigIntToBytes(x: bigint, length: number) {
  let bytes = [];
  for (; x > 0; x >>= 8n) {
    bytes.push(Number(x & 0xffn));
  }
  let array = new Uint8Array(bytes);
  if (length === undefined) return array;
  if (array.length > length)
    throw Error(`bigint doesn't fit into ${length} bytes.`);
  let sizedArray = new Uint8Array(length);
  sizedArray.set(array);
  return sizedArray;
}

function bytesToBigIntArray(bytes: Uint8Array, bytesPerBigInt: number) {
  let bigints = [];
  for (let i = 0; i < bytes.byteLength; i += bytesPerBigInt) {
    bigints.push(bytesToBigInt(bytes.subarray(i, i + bytesPerBigInt)));
  }
  return bigints;
}

function bigIntArrayToBytes(bigints: bigint[], bytesPerBigInt: number) {
  let bytes = new Uint8Array(bigints.length * bytesPerBigInt);
  let offset = 0;
  for (let b of bigints) {
    bytes.set(bigIntToBytes(b, bytesPerBigInt), offset);
    offset += bytesPerBigInt;
  }
  // remove zero bytes
  let i = bytes.byteLength - 1;
  for (; i >= 0; i--) {
    if (bytes[i] !== 0) break;
  }
  return bytes.slice(0, i + 1);
}
