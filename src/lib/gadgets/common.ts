import { Field, FieldConst, FieldVar, VarField } from '../field.js';
import { Tuple, TupleN } from '../util/types.js';
import { Snarky } from '../../snarky.js';
import { MlArray } from '../ml/base.js';
import { Bool, UInt8 } from '../../index.js';
import { Provable } from '../provable.js';
import { chunk } from '../util/arrays.js';

const MAX_BITS = 64 as const;

export {
  MAX_BITS,
  exists,
  existsOne,
  toVars,
  toVar,
  isVar,
  assert,
  bitSlice,
  divideWithRemainder,
  bytesToWord,
  bytesToWords,
  wordsToBytes,
  wordToBytes,
};

function existsOne(compute: () => bigint) {
  let varMl = Snarky.existsVar(() => FieldConst.fromBigint(compute()));
  return VarField(varMl);
}

function exists<N extends number, C extends () => TupleN<bigint, N>>(
  n: N,
  compute: C
) {
  let varsMl = Snarky.exists(n, () =>
    MlArray.mapTo(compute(), FieldConst.fromBigint)
  );
  let vars = MlArray.mapFrom(varsMl, VarField);
  return TupleN.fromArray(n, vars);
}

/**
 * Given a Field, collapse its AST to a pure Var. See {@link FieldVar}.
 *
 * This is useful to prevent rogue Generic gates added in the middle of gate chains,
 * which are caused by snarky auto-resolving constants, adds and scales to vars.
 *
 * Same as `Field.seal()` with the difference that `seal()` leaves constants as is.
 */
function toVar(x: Field | bigint): VarField {
  // don't change existing vars
  if (isVar(x)) return x;
  let xVar = existsOne(() => Field.from(x).toBigInt());
  xVar.assertEquals(x);
  return xVar;
}

function isVar(x: Field | bigint): x is VarField {
  return x instanceof Field && FieldVar.isVar(x.value);
}

/**
 * Apply {@link toVar} to each element of a tuple.
 */
function toVars<T extends Tuple<Field | bigint>>(
  fields: T
): { [k in keyof T]: VarField } {
  return Tuple.map(fields, toVar);
}

/**
 * Assert that a statement is true. If the statement is false, throws an error with the given message.
 * Can be used in provable code.
 */
function assert(stmt: boolean | Bool, message?: string): asserts stmt {
  if (stmt instanceof Bool) {
    stmt.assertTrue(message ?? 'Assertion failed');
  } else if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}

function bitSlice(x: bigint, start: number, length: number) {
  return (x >> BigInt(start)) & ((1n << BigInt(length)) - 1n);
}

function divideWithRemainder(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  const remainder = numerator - denominator * quotient;
  return { quotient, remainder };
}

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
