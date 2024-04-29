import type { Field } from '../field.js';
import type { FlexibleProvable, InferProvable } from './struct.js';
import type { Provable } from './provable-intf.js';
import {
  inCheckedComputation,
  snarkContext,
} from '../core/provable-context.js';
import { exists, existsAsync } from '../core/exists.js';
import { From } from '../../../bindings/lib/provable-generic.js';
import { TupleN } from '../../util/types.js';
import { createField } from '../core/field-constructor.js';

export { witness, witnessAsync, witnessFields };

function witness<A extends Provable<any, any>, T extends From<A> = From<A>>(
  type: A,
  compute: () => T
): InferProvable<A> {
  type S = InferProvable<A>;
  let ctx = snarkContext.get();

  // outside provable code, we just call the callback and return its cloned result
  if (!inCheckedComputation() || ctx.inWitnessBlock) {
    return clone(type, type.fromValue(compute()));
  }
  let proverValue: S | undefined = undefined;
  let fields: Field[];

  let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
  try {
    fields = exists(type.sizeInFields(), () => {
      proverValue = type.fromValue(compute());
      let fields = type.toFields(proverValue);
      return fields.map((x) => x.toBigInt());
    });
  } finally {
    snarkContext.leave(id);
  }

  // rebuild the value from its fields (which are now variables) and aux data
  let aux = type.toAuxiliary(proverValue);
  let value = (type as Provable<S>).fromFields(fields, aux);

  // add type-specific constraints
  type.check(value);

  return value;
}

async function witnessAsync<
  T,
  S extends FlexibleProvable<T> = FlexibleProvable<T>
>(type: S, compute: () => Promise<T>): Promise<T> {
  let ctx = snarkContext.get();

  // outside provable code, we just call the callback and return its cloned result
  if (!inCheckedComputation() || ctx.inWitnessBlock) {
    let value: T = await compute();
    return clone(type, value);
  }
  let proverValue: T | undefined = undefined;
  let fields: Field[];

  // call into `existsAsync` to witness the raw field elements
  let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
  try {
    fields = await existsAsync(type.sizeInFields(), async () => {
      proverValue = await compute();
      let fields = type.toFields(proverValue);
      return fields.map((x) => x.toBigInt());
    });
  } finally {
    snarkContext.leave(id);
  }

  // rebuild the value from its fields (which are now variables) and aux data
  let aux = type.toAuxiliary(proverValue);
  let value = (type as Provable<T>).fromFields(fields, aux);

  // add type-specific constraints
  type.check(value);

  return value;
}

function witnessFields<
  N extends number,
  C extends () => TupleN<bigint | Field, N>
>(size: N, compute: C): TupleN<Field, N> {
  // outside provable code, we just call the callback and return its cloned result
  if (!inCheckedComputation() || snarkContext.get().inWitnessBlock) {
    let fields = compute().map((x) => createField(x));
    return TupleN.fromArray(size, fields);
  }

  // call into `exists` to witness the field elements
  return exists(size, () => {
    let fields = compute().map((x) =>
      typeof x === 'bigint' ? x : x.toBigInt()
    );
    return TupleN.fromArray(size, fields);
  });
}

function clone<T, S extends FlexibleProvable<T>>(type: S, value: T): T {
  let fields = type.toFields(value);
  let aux = type.toAuxiliary?.(value) ?? [];
  return (type as Provable<T>).fromFields(fields, aux);
}
