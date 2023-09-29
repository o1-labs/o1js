import { Field } from './field.js';
import { bigIntToBytes, bytesToBigInt } from '../bigint-helpers.js';
import type {
  WasmGPallas,
  WasmGVesta,
  WasmPallasGProjective,
  WasmVestaGProjective,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type { MlArray } from '../../../lib/ml/base.js';
import { OrInfinity, Infinity } from './curve.js';

export {
  fieldToRust,
  fieldFromRust,
  fieldsToRustFlat,
  fieldsFromRustFlat,
  maybeFieldToRust,
  affineToRust,
  affineFromRust,
  WasmAffine,
  WasmProjective,
};

// TODO: Hardcoding this is a little brittle
// TODO read from field
const fieldSizeBytes = 32;

// field, field vectors

// TODO make more performant
function fieldToRust([, x]: Field): Uint8Array {
  return Uint8Array.from(bigIntToBytes(x, fieldSizeBytes));
}
function fieldFromRust(x: Uint8Array): Field {
  return [0, bytesToBigInt(x)];
}

// TODO avoid intermediate Uint8Arrays
function fieldsToRustFlat([, ...fields]: MlArray<Field>): Uint8Array {
  let n = fields.length;
  let flatBytes = new Uint8Array(n * fieldSizeBytes);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    let fieldBytes = fieldToRust(fields[i]);
    flatBytes.set(fieldBytes, offset);
  }
  return flatBytes;
}

function fieldsFromRustFlat(fieldBytes: Uint8Array): MlArray<Field> {
  let n = fieldBytes.length / fieldSizeBytes;
  if (!Number.isInteger(n)) {
    throw Error('fieldsFromRustFlat: invalid bytes');
  }
  let fields: Field[] = Array(n);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    let fieldView = new Uint8Array(fieldBytes.buffer, offset, fieldSizeBytes);
    fields[i] = fieldFromRust(fieldView);
  }
  return [0, ...fields];
}

function maybeFieldToRust(x?: Field): Uint8Array | undefined {
  return x && fieldToRust(x);
}

// affine

type WasmAffine = WasmGVesta | WasmGPallas;

function affineFromRust<A extends WasmAffine>(pt: A): OrInfinity {
  if (pt.infinity) {
    pt.free();
    return 0;
  } else {
    let x = fieldFromRust(pt.x);
    let y = fieldFromRust(pt.y);
    pt.free();
    return [0, [0, x, y]];
  }
}

function affineToRust<A extends WasmAffine>(
  pt: OrInfinity,
  makeAffine: () => A
) {
  let res = makeAffine();
  if (pt === Infinity) {
    res.infinity = true;
  } else {
    let [, [, x, y]] = pt;
    res.x = fieldToRust(x);
    res.y = fieldToRust(y);
  }
  return res;
}

// projective

type WasmProjective = WasmVestaGProjective | WasmPallasGProjective;
