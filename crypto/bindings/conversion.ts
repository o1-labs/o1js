/**
 * Implementation of Kimchi_bindings.Protocol.Gates
 */
import { MlArray } from '../../../lib/ml/base.js';
import { mapTuple } from './util.js';
import type {
  WasmFpGate,
  WasmFqGate,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import { bigIntToBytes } from '../bigint-helpers.js';

type Field = Uint8Array;

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

// TODO read from field
const fieldSizeBytes = 32;

function createRustConversion(wasm: wasm) {
  function wireToRust([, row, col]: Wire) {
    return wasm.Wire.create(row, col);
  }

  function gate<WasmGate extends typeof WasmFpGate | typeof WasmFqGate>(
    WasmGate: WasmGate
  ) {
    return {
      gateToRust(gate: Gate) {
        let [, typ, [, ...wires], coeffs] = gate;
        let rustWires = new wasm.WasmGateWires(...mapTuple(wires, wireToRust));
        let rustCoeffs = fieldsToRustFlat(coeffs);
        return new WasmGate(typ, rustWires, rustCoeffs);
      },
    };
  }

  const GateFp = gate(wasm.WasmFpGate);
  const GateFq = gate(wasm.WasmFqGate);

  return {
    wireToRust,
    fp: { ...GateFp },
    fq: { ...GateFq },
    gateFromRust(wasmGate: WasmFpGate | WasmFqGate) {
      // note: this was never used and the old implementation was wrong
      // (accessed non-existent fields on wasmGate)
      throw Error('gateFromRust not implemented');
    },
  };
}

function fieldsToRustFlat([, ...fields]: MlArray<Field>) {
  let n = fields.length;
  let flatBytes = new Uint8Array(n * fieldSizeBytes);
  for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
    let v = fieldToRust(fields[i] as Field);
    flatBytes.set(v, offset);
  }
  return flatBytes;
}

function fieldToRust(x: Field) {
  return x;
}
