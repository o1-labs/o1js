import { expect } from 'expect';
import { createRequire } from 'node:module';
import { bindingsNapi } from '../bindings-napi.js';
import type { Field, Gate, Wire } from './kimchi-types.js';

const require = createRequire(import.meta.url);

function loadNative() {
  const candidates = [
    '../../compiled/_node_bindings/plonk_napi.node',
    '../../compiled/node_bindings/plonk_napi.node',
  ];
  for (const path of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(path);
    } catch (err) {
      if ((err as any).code !== 'MODULE_NOT_FOUND') throw err;
    }
  }
  throw new Error('plonk_napi.node not found in compiled bindings');
}

const native: any = loadNative();

const { fp } = bindingsNapi(native);

const zeroField: Field = [0, 0n];
const mlWire = (row: number, col: number): Wire => [0, row, col];

const sampleGate: Gate = [
  0,
  1,
  [
    0,
    mlWire(0, 0),
    mlWire(0, 1),
    mlWire(0, 2),
    mlWire(0, 3),
    mlWire(0, 4),
    mlWire(0, 5),
    mlWire(0, 6),
  ],
  [0, zeroField, zeroField, zeroField, zeroField, zeroField, zeroField, zeroField],
];

const vector = native.camlPastaFpPlonkGateVectorCreate();
expect(native.camlPastaFpPlonkGateVectorLen(vector)).toBe(0);

native.camlPastaFpPlonkGateVectorAdd(vector, fp.gateToRust(sampleGate));
expect(native.camlPastaFpPlonkGateVectorLen(vector)).toBe(1);

const gate0 = native.camlPastaFpPlonkGateVectorGet(vector, 0);
expect(gate0.typ).toBe(sampleGate[1]);

const rustTarget = fp.wireToRust(mlWire(0, 0));
const rustHead = fp.wireToRust(mlWire(1, 2));
native.camlPastaFpPlonkGateVectorWrap(vector, rustTarget, rustHead);
const wrapped = native.camlPastaFpPlonkGateVectorGet(vector, 0);
expect(wrapped.wires.w0).toEqual({ row: 1, col: 2 });

native.camlPastaFpPlonkGateVectorDigest(0, vector);
native.camlPastaFpPlonkCircuitSerialize(0, vector);

console.log('{}', native.camlPastaFpPlonkGateVectorDigest(0, vector));

console.log('gate vector napi bindings (fp) are working ✔️');
