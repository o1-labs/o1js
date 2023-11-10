import { Provable } from '../provable.js';
import { Field, FieldConst, FieldType } from '../field.js';
import { Tuple, TupleN } from '../util/types.js';
import { Snarky } from '../../snarky.js';
import { MlArray } from '../ml/base.js';

const MAX_BITS = 64 as const;

export {
  MAX_BITS,
  exists,
  toVars,
  existsOne,
  toVar,
  assert,
  bitSlice,
  witnessSlice,
  witnessNextValue,
  divideWithRemainder,
};

function exists<N extends number, C extends () => TupleN<bigint, N>>(
  n: N,
  compute: C
) {
  let varsMl = Snarky.exists(n, () =>
    MlArray.mapTo(compute(), FieldConst.fromBigint)
  );
  let vars = MlArray.mapFrom(varsMl, (v) => new Field(v));
  return TupleN.fromArray(n, vars);
}

function toVars<T extends Tuple<Field | bigint>>(
  fields: T
): { [k in keyof T]: Field } {
  return Tuple.map(fields, toVar);
}

function existsOne(compute: () => bigint) {
  let varMl = Snarky.existsVar(() => FieldConst.fromBigint(compute()));
  return new Field(varMl);
}

function toVar(x: Field | bigint) {
  // don't change existing vars
  if (x instanceof Field && x.value[1] === FieldType.Var) return x;
  let xVar = existsOne(() => Field.from(x).toBigInt());
  xVar.assertEquals(x);
  return xVar;
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
