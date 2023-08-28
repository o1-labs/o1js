/**
 * Implementation of Kimchi_bindings.Protocol.Gates
 */
import { MlArray } from '../../lib/ml/base.js';
import { mapTuple } from './bindings-util.js';
import { Field } from './bindings-field.js';
import type {
  WasmFpGate,
  WasmFqGate,
} from '../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import { bigIntToBytes, bytesToBigInt } from './bigint-helpers.js';

export { createRustConversion };

// ml types from kimchi_types.ml
type GateType = number;
type Wire = [_: 0, row: number, col: number];
type Gate = [
  _: 0,
  typ: GateType,
  wires: [0, Wire, Wire, Wire, Wire, Wire, Wire, Wire],
  coeffs: MlArray<Field>
];

type wasm = typeof wasmNamespace;

// TODO: Hardcoding this is a little brittle
// TODO read from field
const fieldSizeBytes = 32;

function createRustConversion(wasm: wasm) {
  function wireToRust([, row, col]: Wire) {
    return wasm.Wire.create(row, col);
  }

  function perField<WasmGate extends typeof WasmFpGate | typeof WasmFqGate>(
    WasmGate: WasmGate
  ) {
    return {
      vectorToRust: fieldsToRustFlat,
      vectorFromRust: fieldsFromRustFlat,
      gateToRust(gate: Gate) {
        let [, typ, [, ...wires], coeffs] = gate;
        let rustWires = new wasm.WasmGateWires(...mapTuple(wires, wireToRust));
        let rustCoeffs = fieldsToRustFlat(coeffs);
        return new WasmGate(typ, rustWires, rustCoeffs);
      },
    };
  }

  const fpConversion = perField(wasm.WasmFpGate);
  const fqConversion = perField(wasm.WasmFqGate);

  return {
    wireToRust,
    fieldsToRustFlat,
    fieldsFromRustFlat,
    fp: fpConversion,
    fq: fqConversion,
    gateFromRust(wasmGate: WasmFpGate | WasmFqGate) {
      // note: this was never used and the old implementation was wrong
      // (accessed non-existent fields on wasmGate)
      throw Error('gateFromRust not implemented');
    },
  };
}

// TODO make more performant
function fieldToRust([x]: Field): Uint8Array {
  return Uint8Array.from(bigIntToBytes(x, fieldSizeBytes));
}
function fieldFromRust(x: Uint8Array): Field {
  return [bytesToBigInt(x)];
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
  var n = fieldBytes.length / fieldSizeBytes;
  if (!Number.isInteger(n)) {
    throw Error('fieldsFromRustFlat: invalid bytes');
  }
  var fields: Field[] = Array(n);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    let fieldView = new Uint8Array(fieldBytes.buffer, offset, fieldSizeBytes);
    fields[i] = fieldFromRust(fieldView);
  }
  return [0, ...fields];
}
