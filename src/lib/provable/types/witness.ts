import type { Field } from '../field.js';
import type { FlexibleProvable, InferProvable } from './struct.js';
import { Provable, ProvableType, ToProvable } from './provable-intf.js';
import { inCheckedComputation, snarkContext } from '../core/provable-context.js';
import { exists, existsAsync } from '../core/exists.js';
import { From } from '../../../bindings/lib/provable-generic.js';
import { TupleN } from '../../util/types.js';
import { createField } from '../core/field-constructor.js';

export { witness, witnessAsync, witnessFields };

function witness<
  A extends ProvableType<any, any>,
  T extends From<ToProvable<A>> = From<ToProvable<A>>
>(type: A, compute: () => T): InferProvable<ToProvable<A>> {
  type S = InferProvable<ToProvable<A>>;
  const provable: Provable<S> = ProvableType.get(type);
  let ctx = snarkContext.get();

  // outside provable code, we just call the callback and return its cloned result
  if (!inCheckedComputation() || ctx.inWitnessBlock) {
    return clone(provable, provable.fromValue(compute()));
  }
  let proverValue: S | undefined = undefined;
  let fields: Field[];

  let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
  try {
    fields = exists(provable.sizeInFields(), () => {
      let value = provable.fromValue(compute());
      proverValue = value;
      let fields = provable.toFields(value);
      return fields.map((x) => x.toBigInt());
    });
  } finally {
    snarkContext.leave(id);
  }

  // rebuild the value from its fields (which are now variables) and aux data
  let aux = provable.toAuxiliary(proverValue);
  let value = provable.fromFields(fields, aux);

  // add type-specific constraints
  provable.check(value);

  return value;
}

async function witnessAsync<
  A extends ProvableType<any, any>,
  T extends From<ToProvable<A>> = From<ToProvable<A>>
>(type: A, compute: () => Promise<T>): Promise<T> {
  type S = InferProvable<ToProvable<A>>;
  const provable: Provable<S> = ProvableType.get(type);

  let ctx = snarkContext.get();

  // outside provable code, we just call the callback and return its cloned result
  if (!inCheckedComputation() || ctx.inWitnessBlock) {
    let value: T = await compute();
    return clone(provable, provable.fromValue(value));
  }
  let proverValue: S | undefined = undefined;
  let fields: Field[];

  // call into `existsAsync` to witness the raw field elements
  let id = snarkContext.enter({ ...ctx, inWitnessBlock: true });
  try {
    fields = await existsAsync(provable.sizeInFields(), async () => {
      let value: S = provable.fromValue(await compute());
      proverValue = value;
      let fields = provable.toFields(value);
      return fields.map((x) => x.toBigInt());
    });
  } finally {
    snarkContext.leave(id);
  }

  // rebuild the value from its fields (which are now variables) and aux data
  let aux = provable.toAuxiliary(proverValue);
  let value = provable.fromFields(fields, aux);

  // add type-specific constraints
  provable.check(value);

  return value;
}

function witnessFields<N extends number, C extends () => TupleN<bigint | Field, N>>(
  size: N,
  compute: C
): TupleN<Field, N> {
  // outside provable code, we just call the callback and return its cloned result
  if (!inCheckedComputation() || snarkContext.get().inWitnessBlock) {
    let fields = compute().map((x) => createField(x));
    return TupleN.fromArray(size, fields);
  }

  // call into `exists` to witness the field elements
  return exists(size, () => {
    let fields = compute().map((x) => (typeof x === 'bigint' ? x : x.toBigInt()));
    return TupleN.fromArray(size, fields);
  });
}

function clone<T, S extends FlexibleProvable<T>>(type: S, value: T): T {
  let fields = type.toFields(value);
  let aux = type.toAuxiliary?.(value) ?? [];
  return (type as Provable<T>).fromFields(fields, aux);
}
