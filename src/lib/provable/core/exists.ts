import { Snarky } from '../../../snarky.js';
import { FieldConst, VarFieldVar } from './fieldvar.js';
import type { VarField } from '../field.js';
import { MlArray, MlOption } from '../../ml/base.js';
import { createField } from './field-constructor.js';
import { TupleN } from '../../util/types.js';

export { createVarField, exists, existsAsync, existsOne };

/**
 * Witness `size` field element variables by passing a callback that returns `size` bigints.
 *
 * Note: this is called "exists" because in a proof, you use it like this:
 * > "I prove that there exists x, such that (some statement)"
 */
function exists<N extends number, C extends () => TupleN<bigint, N>>(
  size: N,
  compute: C
): TupleN<VarField, N> {
  // enter prover block
  let finish = Snarky.run.enterAsProver(size);

  if (!Snarky.run.inProver()) {
    // step outside prover block and create vars: compile case
    let vars = MlArray.mapFrom(finish(MlOption()), createVarField);
    return TupleN.fromArray(size, vars);
  }

  // run the callback to get values to witness
  let values = compute();
  if (values.length !== size)
    throw Error(`Expected witnessed values of length ${size}, got ${values.length}.`);

  // note: here, we deliberately reduce the bigint values modulo the field size
  // this makes it easier to use normal arithmetic in low-level gadgets,
  // i.e. you can just witness x - y and it will be a field subtraction
  let inputValues = MlArray.mapTo(values, FieldConst.fromBigint);

  // step outside prover block and create vars: prover case
  let fieldVars = finish(MlOption(inputValues));
  let vars = MlArray.mapFrom(fieldVars, createVarField);
  return TupleN.fromArray(size, vars);
}

/**
 * Variant of {@link exists} that witnesses 1 field element.
 */
function existsOne(compute: () => bigint): VarField {
  return exists(1, () => [compute()])[0];
}

/**
 * Async variant of {@link exists}, which allows an async callback.
 */
async function existsAsync<N extends number, C extends () => Promise<TupleN<bigint, N>>>(
  size: N,
  compute: C
): Promise<TupleN<VarField, N>> {
  // enter prover block
  let finish = Snarky.run.enterAsProver(size);

  if (!Snarky.run.inProver()) {
    let vars = MlArray.mapFrom(finish(MlOption()), createVarField);
    return TupleN.fromArray(size, vars);
  }

  // run the async callback to get values to witness
  let values = await compute();
  if (values.length !== size)
    throw Error(`Expected witnessed values of length ${size}, got ${values.length}.`);

  // note: here, we deliberately reduce the bigint values modulo the field size
  // this makes it easier to use normal arithmetic in low-level gadgets,
  // i.e. you can just witness x - y and it will be a field subtraction
  let inputValues = MlArray.mapTo(values, FieldConst.fromBigint);

  let fieldVars = finish(MlOption(inputValues));
  let vars = MlArray.mapFrom(fieldVars, createVarField);
  return TupleN.fromArray(size, vars);
}

// helpers for varfields

function createVarField(x: VarFieldVar): VarField {
  return createField(x) as VarField;
}
