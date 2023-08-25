/**
 * TS implementation of Kimchi_bindings.FieldVectors
 */
import { MlArray } from '../../lib/ml/base.js';
import { Field } from './bindings-field.js';

export { FpVectorBindings, FqVectorBindings };

type FieldVector = MlArray<Field>;

const FpVectorBindings = createFieldVector('caml_pasta_fp_vector');
const FqVectorBindings = createFieldVector('caml_pasta_fq_vector');

function createFieldVector<vector extends string>(vector: vector) {
  let FieldVectorBindings = {
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
          `${vector}_get: Index out of bounds, got ${i}/${v.length - 1}`
        );
      }
      return value;
    },
    set(v: FieldVector, i: number, x: Field): void {
      v[i + 1] = x;
    },
  };

  type FieldVectorBindings = typeof FieldVectorBindings;

  return Object.fromEntries(
    Object.entries(FieldVectorBindings).map(([k, v]) => {
      return [`${vector}_${k}`, v];
    })
  ) as {
    [k in keyof FieldVectorBindings as `${vector}_${k}`]: FieldVectorBindings[k];
  };
}
