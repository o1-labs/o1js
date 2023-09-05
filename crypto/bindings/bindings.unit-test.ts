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
import { id, equivalentRecord, Spec } from './test-utils.js';
import { Field, FpBindings } from '../bindings-field.js';
import { MlBool } from '../../../lib/ml/base.js';

let number: Spec<number, number> = {
  rng: Random.nat(100),
  there: id,
  back: id,
};

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
  caml_bigint_256_test_bit: { from: [bigint256, number], to: boolean },
  caml_bigint_256_to_bytes: { from: [bigint256], to: bytes },
  caml_bigint_256_of_bytes: { from: [bytes], to: bigint256 },
  caml_bigint_256_deep_copy: { from: [bigint256], to: bigint256 },
});
