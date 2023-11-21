import { Provable } from '../provable.js';
import { Field, FieldConst, FieldVar, VarField } from '../field.js';
import { Tuple, TupleN } from '../util/types.js';
import { Snarky } from '../../snarky.js';
import { MlArray } from '../ml/base.js';

const MAX_BITS = 64 as const;

export {
  MAX_BITS,
  exists,
  existsOne,
  toVars,
  toVar,
  assert,
  bitSlice,
  witnessSlice,
  witnessNextValue,
  divideWithRemainder,
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

function assert(stmt: boolean, message?: string): asserts stmt {
  if (!stmt) {
    throw Error(message ?? 'Assertion failed');
  }
}

function bitSlice(x: bigint, start: number, length: number) {
  return (x >> BigInt(start)) & ((1n << BigInt(length)) - 1n);
}

function witnessSlice(f: Field, start: number, length: number) {
  if (length <= 0) throw Error('Length must be a positive number');

  return Provable.witness(Field, () => {
    let n = f.toBigInt();
    return new Field((n >> BigInt(start)) & ((1n << BigInt(length)) - 1n));
  });
}

function witnessNextValue(current: Field) {
  return Provable.witness(Field, () => new Field(current.toBigInt() >> 16n));
}

function divideWithRemainder(numerator: bigint, denominator: bigint) {
  const quotient = numerator / denominator;
  const remainder = numerator - denominator * quotient;
  return { quotient, remainder };
}
