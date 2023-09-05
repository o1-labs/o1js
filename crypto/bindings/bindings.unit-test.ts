import {
  Bigint256,
  Bigint256Bindings,
  MlBytes,
  fromMlString,
  mlBytesFromUint8Array,
  mlBytesToUint8Array,
  toMlStringAscii,
} from '../bindings-bigint256.js';
import { wasm } from '../../js/node/node-backend.js';
import { Random } from '../../../lib/testing/property.js';
import { fieldFromRust, fieldToRust } from '../bindings-conversion-base.js';
import { id, equivalentRecord, Spec, ToSpec, FromSpec } from './test-utils.js';
import { Field, FpBindings, FqBindings } from '../bindings-field.js';
import { MlBool, MlOption } from '../../../lib/ml/base.js';

let unit: ToSpec<void, void> = { back: id };
let number: ToSpec<number, number> = { back: id };
let numberBetween = (min: number, max: number): FromSpec<number, number> => ({
  rng: Random.map(Random.int(min, max), id),
  there: id,
});

let bigint256: Spec<Bigint256, Uint8Array> = {
  rng: Random.map(Random.biguint(256), (x) => [0, x]),
  there: fieldToRust,
  back: fieldFromRust,
};
let fp: Spec<Field, Uint8Array> = {
  rng: Random.map(Random.field, (x) => [0, x]),
  there: fieldToRust,
  back: fieldFromRust,
};
let fq: Spec<Field, Uint8Array> = {
  rng: Random.map(Random.scalar, (x) => [0, x]),
  there: fieldToRust,
  back: fieldFromRust,
};

let boolean: Spec<MlBool, boolean> = {
  rng: Random.map(Random.boolean, MlBool),
  there: Boolean,
  back: MlBool,
};
let decimalString: Spec<MlBytes, string> = {
  rng: Random.map(Random.json.field, toMlStringAscii),
  there: fromMlString,
  back: toMlStringAscii,
};
let bytes: Spec<MlBytes, Uint8Array> = {
  rng: Random.map(Random.bytes(32), mlBytesFromUint8Array),
  there: mlBytesToUint8Array,
  back: mlBytesFromUint8Array,
};

equivalentRecord(Bigint256Bindings, wasm, {
  caml_bigint_256_of_numeral: undefined, // TODO
  caml_bigint_256_of_decimal_string: { from: [decimalString], to: bigint256 },
  caml_bigint_256_num_limbs: { from: [], to: number },
  caml_bigint_256_bytes_per_limb: { from: [], to: number },
  caml_bigint_256_div: { from: [bigint256, bigint256], to: bigint256 },
  caml_bigint_256_compare: { from: [bigint256, bigint256], to: number },
  caml_bigint_256_print: undefined, // this would spam the console
  caml_bigint_256_to_string: { from: [bigint256], to: decimalString },
  caml_bigint_256_test_bit: {
    from: [bigint256, numberBetween(0, 255)],
    to: boolean,
  },
  caml_bigint_256_to_bytes: { from: [bigint256], to: bytes },
  caml_bigint_256_of_bytes: { from: [bytes], to: bigint256 },
  caml_bigint_256_deep_copy: { from: [bigint256], to: bigint256 },
});

equivalentRecord(
  FpBindings as Omit<
    typeof FpBindings,
    | 'caml_pasta_fp_copy'
    | 'caml_pasta_fp_mut_add'
    | 'caml_pasta_fp_mut_sub'
    | 'caml_pasta_fp_mut_mul'
    | 'caml_pasta_fp_mut_square'
  >,
  wasm,
  {
    caml_pasta_fp_size_in_bits: { from: [], to: number },
    caml_pasta_fp_size: { from: [], to: fp },
    caml_pasta_fp_add: { from: [fp, fp], to: fp },
    caml_pasta_fp_sub: { from: [fp, fp], to: fp },
    caml_pasta_fp_negate: { from: [fp], to: fp },
    caml_pasta_fp_mul: { from: [fp, fp], to: fp },
    caml_pasta_fp_div: { from: [fp, fp], to: fp },
    caml_pasta_fp_inv: { from: [fp], to: option(fp) },
    caml_pasta_fp_square: { from: [fp], to: fp },
    caml_pasta_fp_is_square: { from: [fp], to: boolean },
    caml_pasta_fp_sqrt: { from: [fp], to: option(fp) },
    caml_pasta_fp_of_int: { from: [numberBetween(0, 1000)], to: fp },
    caml_pasta_fp_to_string: { from: [fp], to: decimalString },
    caml_pasta_fp_of_string: { from: [decimalString], to: fp },
    caml_pasta_fp_print: undefined, // this would spam the console
    // these aren't defined in Rust
    // caml_pasta_fp_copy: { from: [fp, fp], to: unit },
    // caml_pasta_fp_mut_add: { from: [fp, fp], to: unit },
    // caml_pasta_fp_mut_sub: { from: [fp, fp], to: unit },
    // caml_pasta_fp_mut_mul: { from: [fp, fp], to: unit },
    // caml_pasta_fp_mut_square: { from: [fp], to: unit },
    caml_pasta_fp_compare: { from: [fp, fp], to: number },
    caml_pasta_fp_equal: { from: [fp, fp], to: boolean },
    caml_pasta_fp_random: undefined, // random outputs won't match
    caml_pasta_fp_rng: undefined, // random outputs won't match
    caml_pasta_fp_to_bigint: { from: [fp], to: bigint256 },
    caml_pasta_fp_of_bigint: { from: [bigint256], to: fp },
    caml_pasta_fp_two_adic_root_of_unity: { from: [], to: fp },
    caml_pasta_fp_domain_generator: { from: [numberBetween(0, 31)], to: fp },
    caml_pasta_fp_to_bytes: undefined, // not implemented
    caml_pasta_fp_of_bytes: undefined, // not implemented
    caml_pasta_fp_deep_copy: { from: [fp], to: fp },
  }
);

equivalentRecord(
  FqBindings as Omit<
    typeof FqBindings,
    | 'caml_pasta_fq_copy'
    | 'caml_pasta_fq_mut_add'
    | 'caml_pasta_fq_mut_sub'
    | 'caml_pasta_fq_mut_mul'
    | 'caml_pasta_fq_mut_square'
  >,
  wasm,
  {
    caml_pasta_fq_size_in_bits: { from: [], to: number },
    caml_pasta_fq_size: { from: [], to: fq },
    caml_pasta_fq_add: { from: [fq, fq], to: fq },
    caml_pasta_fq_sub: { from: [fq, fq], to: fq },
    caml_pasta_fq_negate: { from: [fq], to: fq },
    caml_pasta_fq_mul: { from: [fq, fq], to: fq },
    caml_pasta_fq_div: { from: [fq, fq], to: fq },
    caml_pasta_fq_inv: { from: [fq], to: option(fq) },
    caml_pasta_fq_square: { from: [fq], to: fq },
    caml_pasta_fq_is_square: { from: [fq], to: boolean },
    caml_pasta_fq_sqrt: { from: [fq], to: option(fq) },
    caml_pasta_fq_of_int: { from: [numberBetween(0, 1000)], to: fq },
    caml_pasta_fq_to_string: { from: [fq], to: decimalString },
    caml_pasta_fq_of_string: { from: [decimalString], to: fq },
    caml_pasta_fq_print: undefined, // this would spam the console
    // these aren't defined in Rust
    // caml_pasta_fq_copy: { from: [fq, fq], to: unit },
    // caml_pasta_fq_mut_add: { from: [fq, fq], to: unit },
    // caml_pasta_fq_mut_sub: { from: [fq, fq], to: unit },
    // caml_pasta_fq_mut_mul: { from: [fq, fq], to: unit },
    // caml_pasta_fq_mut_square: { from: [fq], to: unit },
    caml_pasta_fq_compare: { from: [fq, fq], to: number },
    caml_pasta_fq_equal: { from: [fq, fq], to: boolean },
    caml_pasta_fq_random: undefined, // random outputs won't match
    caml_pasta_fq_rng: undefined, // random outputs won't match
    caml_pasta_fq_to_bigint: { from: [fq], to: bigint256 },
    caml_pasta_fq_of_bigint: { from: [bigint256], to: fq },
    caml_pasta_fq_two_adic_root_of_unity: { from: [], to: fq },
    caml_pasta_fq_domain_generator: { from: [numberBetween(0, 31)], to: fq },
    caml_pasta_fq_to_bytes: undefined, // not implemented
    caml_pasta_fq_of_bytes: undefined, // not implemented
    caml_pasta_fq_deep_copy: { from: [fq], to: fq },
  }
);

function option<T, S>(spec: Spec<T, S>): Spec<MlOption<T>, S | undefined> {
  return {
    rng: Random.map(Random.oneOf(spec.rng, undefined), (o) => MlOption(o)),
    there: (x) => MlOption.mapFrom(x, spec.there),
    back: (x) => MlOption.mapTo(x, spec.back),
  };
}
