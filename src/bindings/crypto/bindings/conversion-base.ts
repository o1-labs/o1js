import { Field } from './field.js';
import { bigintToBytes32, bytesToBigint32 } from '../bigint-helpers.js';
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

function fieldToRust([, x]: Field, dest = new Uint8Array(32)): Uint8Array {
  return bigintToBytes32(x, dest);
}
function fieldFromRust(x: Uint8Array): Field {
  return [0, bytesToBigint32(x)];
}

function fieldsToRustFlat([, ...fields]: MlArray<Field>): Uint8Array {
  let n = fields.length;
  let flatBytes = new Uint8Array(n * fieldSizeBytes);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    fieldToRust(fields[i], flatBytes.subarray(offset, offset + fieldSizeBytes));
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

const tmpBytes = new Uint8Array(32);

function affineToRust<A extends WasmAffine>(
  pt: OrInfinity,
  makeAffine: () => A
) {
  let res = makeAffine();
  if (pt === Infinity) {
    res.infinity = true;
  } else {
    let [, [, x, y]] = pt;
    // we can use the same bytes here every time,
    // because x and y setters copy the bytes into wasm memory
    res.x = fieldToRust(x, tmpBytes);
    res.y = fieldToRust(y, tmpBytes);
  }
  return res;
}

// projective

type WasmProjective = WasmVestaGProjective | WasmPallasGProjective;
