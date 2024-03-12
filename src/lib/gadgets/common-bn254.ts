import { FieldBn254, FieldConst, FieldVar, VarField } from '../field-bn254.js';
import { Tuple, TupleN } from '../util/types.js';
import { Snarky } from '../../snarky.js';
import { MlArray } from '../ml/base.js';
import { BoolBn254 } from '../bool-bn254.js';

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
  let varMl = Snarky.bn254.existsVar(() => FieldConst.fromBigint(compute()));
  return VarField(varMl);
}

function exists<N extends number, C extends () => TupleN<bigint, N>>(
  n: N,
  compute: C
) {
  let varsMl = Snarky.bn254.exists(n, () =>
    MlArray.mapTo(compute(), FieldConst.fromBigint)
  );
  let vars = MlArray.mapFrom(varsMl, VarField);
  return TupleN.fromArray(n, vars);
}

/**
 * Given a FieldBn254, collapse its AST to a pure Var. See {@link FieldVar}.
 *
 * This is useful to prevent rogue Generic gates added in the middle of gate chains,
 * which are caused by snarky auto-resolving constants, adds and scales to vars.
 *
 * Same as `FieldBn254.seal()` with the difference that `seal()` leaves constants as is.
 */
function toVar(x: FieldBn254 | bigint): VarField {
  // don't change existing vars
  if (isVar(x)) return x;
  let xVar = existsOne(() => FieldBn254.from(x).toBigInt());
  xVar.assertEquals(x);
  return xVar;
}

function isVar(x: FieldBn254 | bigint): x is VarField {
  return x instanceof FieldBn254 && FieldVar.isVar(x.value);
}

/**
 * Apply {@link toVar} to each element of a tuple.
 */
function toVars<T extends Tuple<FieldBn254 | bigint>>(
  fields: T
): { [k in keyof T]: VarField } {
  return Tuple.map(fields, toVar);
}

/**
 * Assert that a statement is true. If the statement is false, throws an error with the given message.
 * Can be used in provable code.
 */
function assert(stmt: boolean | BoolBn254, message?: string): asserts stmt {
  if (stmt instanceof BoolBn254) {
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
