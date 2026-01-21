import type { MlArray } from '../../../lib/ml/base.js';
import type {
  WasmGPallas,
  WasmGVesta,
  WasmPallasGProjective,
  WasmVestaGProjective,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import { bigintToBytes32, bytesToBigint32 } from '../bigint-helpers.js';
import { Infinity, OrInfinity } from './curve.js';
import { Field } from './field.js';

export {
  WasmAffine,
  WasmProjective,
  affineFromRust,
  affineToRust,
  fieldFromRust,
  fieldToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
  maybeFieldToRust,
};

// TODO: Hardcoding this is a little brittle
// TODO read from field
const fieldSizeBytes = 32;

// field, field vectors

function fieldToRust([, x]: Field, dest = new Uint8Array(32)): Uint8Array {
  return bigintToBytes32(x, dest);
}
function fieldFromRust(x: Uint8Array): Field {
  // Some native bindings may return byte arrays as plain `number[]`.
  // Normalize so downstream code can rely on `Uint8Array` APIs.
  let bytes: Uint8Array =
    x instanceof Uint8Array ? x : Uint8Array.from(x as unknown as ArrayLike<number>);
  return [0, bytesToBigint32(bytes)];
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
  // Some native bindings may return byte arrays as plain `number[]`.
  fieldBytes =
    fieldBytes instanceof Uint8Array
      ? fieldBytes
      : Uint8Array.from(fieldBytes as unknown as ArrayLike<number>);
  let n = fieldBytes.length / fieldSizeBytes;
  if (!Number.isInteger(n)) {
    throw Error('fieldsFromRustFlat: invalid bytes');
  }
  let fields: Field[] = Array(n);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    // Use `subarray()` so we slice relative to the view (works for `Buffer` too),
    // and avoid relying on `byteOffset` alignment/pooling details.
    let fieldView = fieldBytes.subarray(offset, offset + fieldSizeBytes);
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

function affineToRust<A extends WasmAffine>(pt: OrInfinity, makeAffine: () => A) {
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
