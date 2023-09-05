import {
  Bigint256Bindings,
  fromMlString,
  mlBytesFromUint8Array,
  mlBytesToUint8Array,
  toMlStringAscii,
} from '../bindings-bigint256.js';
import { wasm } from '../../js/node/node-backend.js';
import { Random } from '../../../lib/testing/property.js';
import { fieldFromRust, fieldToRust } from '../bindings-conversion-base.js';
import { id, equivalentRecord, tuple } from './test-utils.js';
import { Field } from '../bindings-field.js';

let randomFp = Random.map(Random.field, (x) => [0, x] satisfies Field);
let randomFq = Random.map(Random.scalar, (x) => [0, x] satisfies Field);
let randomMlDecimalString = Random.map(Random.json.field, toMlStringAscii);
let randomMlBytes32 = Random.map(Random.bytes(32), mlBytesFromUint8Array);

let unitToNumber = { there: tuple([]), back: id, generators: tuple([]) };

let fromFp = { generators: tuple([randomFp]), there: tuple([fieldToRust]) };
let fromFp2 = {
  generators: tuple([randomFp, randomFp]),
  there: tuple([fieldToRust, fieldToRust]),
};
let toFp = { back: fieldFromRust };
let fromBytes = {
  generators: tuple([randomMlBytes32]),
  there: tuple([mlBytesToUint8Array]),
};

let field2ToField = { ...fromFp2, ...toFp };
let fieldToField = { ...fromFp, ...toFp };
let field2ToNumber = { ...fromFp2, back: id };
let fieldToString = { ...fromFp, back: toMlStringAscii };
let fieldOfString = {
  generators: tuple([randomMlDecimalString]),
  there: tuple([fromMlString]),
  ...toFp,
};
let fieldToBytes = { ...fromFp, back: mlBytesFromUint8Array };
let fieldFromBytes = { ...fromBytes, ...toFp };

equivalentRecord(Bigint256Bindings, wasm, {
  caml_bigint_256_of_numeral: undefined, // TODO
  caml_bigint_256_of_decimal_string: fieldOfString,
  caml_bigint_256_num_limbs: unitToNumber,
  caml_bigint_256_bytes_per_limb: unitToNumber,
  caml_bigint_256_div: field2ToField,
  caml_bigint_256_compare: field2ToNumber,
  caml_bigint_256_print: undefined, // this would spam the console
  caml_bigint_256_to_string: fieldToString,
  caml_bigint_256_test_bit: {
    generators: tuple([randomFp, Random.byte]),
    there: tuple([fieldToRust, id]),
    back: Number,
  },
  caml_bigint_256_to_bytes: fieldToBytes,
  caml_bigint_256_of_bytes: fieldFromBytes,
  caml_bigint_256_deep_copy: fieldToField,
});
