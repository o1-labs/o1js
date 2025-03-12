/**
 * TS implementation of Kimchi_bindings.FieldVectors
 */
import { MlArray } from '../../../lib/ml/base.js';
import { Field } from './field.js';
import { withPrefix } from './util.js';

export { FpVectorBindings, FqVectorBindings };
export { FieldVector };

type FieldVector = MlArray<Field>;

const FieldVectorBindings = {
  create(): FieldVector {
    // OCaml tag for arrays, so that we can use the same utility fns on both
    return [0];
  },
  length(v: FieldVector): number {
    return v.length - 1;
  },
  emplace_back(v: FieldVector, x: Field): void {
    v.push(x);
  },
  get(v: FieldVector, i: number): Field {
    let value = v[i + 1] as Field | undefined;
    if (value === undefined) {
      throw Error(
        `FieldVector.get(): Index out of bounds, got ${i}/${v.length - 1}`
      );
    }
    // copying to a new array to break mutable reference
    return [...value];
  },
  set(v: FieldVector, i: number, x: Field): void {
    v[i + 1] = x;
  },
};

const FpVectorBindings = withPrefix('caml_fp_vector', FieldVectorBindings);
const FqVectorBindings = withPrefix('caml_fq_vector', FieldVectorBindings);
