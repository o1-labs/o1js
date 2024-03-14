import {
  Field,
  FieldConst,
  FieldVar,
  VarField,
  VarFieldVar,
} from '../field.js';
import { Tuple, TupleN } from '../util/types.js';
import { Snarky } from '../../snarky.js';
import { MlArray } from '../ml/base.js';
import { Bool } from '../bool.js';
import { fieldVar } from '../gates.js';

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
};

function existsOne(compute: () => bigint) {
  let varMl = Snarky.run.existsOne(() => FieldConst.fromBigint(compute()));
  return VarField(varMl);
}

function exists<N extends number, C extends () => TupleN<bigint, N>>(
  n: N,
  compute: C
) {
  let varsMl = Snarky.run.exists(n, () =>
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
