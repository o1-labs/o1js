import { Field, VarField } from '../field.js';
import { FieldVar, VarFieldVar } from '../provable-core/fieldvar.js';
import { Tuple } from '../util/types.js';
import type { Bool } from '../bool.js';
import { fieldVar } from '../gates.js';
import { existsOne } from '../provable-core/exists.js';

export { toVars, toVar, isVar, assert, bitSlice, divideWithRemainder };

/**
 * Given a Field, collapse its AST to a pure Var. See {@link FieldVar}.
 *
 * This is useful to prevent rogue Generic gates added in the middle of gate chains,
 * which are caused by snarky auto-resolving constants, adds and scales to vars.
 *
 * Same as `Field.seal()` with the difference that `seal()` leaves constants as is.
 */
function toVar(x_: Field | FieldVar | bigint): VarField {
  let x = new Field(x_);
  // don't change existing vars
  if (isVar(x)) return x;
  let xVar = existsOne(() => x.toBigInt());
  xVar.assertEquals(x);
  return xVar;
}

function isVar(x: FieldVar | bigint): x is VarFieldVar;
function isVar(x: Field | bigint): x is VarField;
function isVar(x: Field | FieldVar | bigint) {
  return FieldVar.isVar(fieldVar(x));
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
  if (typeof stmt === 'boolean') {
    if (!stmt) throw Error(message ?? 'Assertion failed');
  } else {
    stmt.assertTrue(message ?? 'Assertion failed');
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
