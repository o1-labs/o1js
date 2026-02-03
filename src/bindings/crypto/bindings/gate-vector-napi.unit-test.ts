import { expect } from 'expect';
import { createRequire } from 'node:module';
import { napiConversionCore } from '../native/napi-conversion-core.js';
import type { Field, Gate, Wire } from './kimchi-types.js';

const require = createRequire(import.meta.url);

function loadNative() {
  const slug = `${process.platform}-${process.arch}`;
  const candidates = [
    `../../../../../native/${slug}/kimchi_napi.node`,
    '../../compiled/node_bindings/kimchi_napi.node',
    '../../compiled/_node_bindings/kimchi_napi.node',
  ];
  for (const path of candidates) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(path);
    } catch (err) {
      if ((err as any).code !== 'MODULE_NOT_FOUND') throw err;
    }
  }
  throw new Error('kimchi_napi.node not found in compiled bindings');
}

const native: any = loadNative();

const gateVectorCreate =
  native.caml_pasta_fp_plonk_gate_vector_create ?? native.camlPastaFpPlonkGateVectorCreate;
const gateVectorLen =
  native.caml_pasta_fp_plonk_gate_vector_len ?? native.camlPastaFpPlonkGateVectorLen;
const gateVectorAdd =
  native.caml_pasta_fp_plonk_gate_vector_add ?? native.camlPastaFpPlonkGateVectorAdd;
const gateVectorGet =
  native.caml_pasta_fp_plonk_gate_vector_get ?? native.camlPastaFpPlonkGateVectorGet;
const gateVectorWrap =
  native.caml_pasta_fp_plonk_gate_vector_wrap ?? native.camlPastaFpPlonkGateVectorWrap;
const gateVectorDigest =
  native.caml_pasta_fp_plonk_gate_vector_digest ?? native.camlPastaFpPlonkGateVectorDigest;
const circuitSerialize =
  native.caml_pasta_fp_plonk_circuit_serialize ?? native.camlPastaFpPlonkCircuitSerialize;

const { fp } = napiConversionCore(native);

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

const vector = gateVectorCreate();
expect(gateVectorLen(vector)).toBe(0);

gateVectorAdd(vector, fp.gateToRust(sampleGate));
expect(gateVectorLen(vector)).toBe(1);

const gate0 = gateVectorGet(vector, 0);
expect(gate0.typ).toBe(sampleGate[1]);

const rustTarget = fp.wireToRust(mlWire(0, 0));
const rustHead = fp.wireToRust(mlWire(1, 2));
gateVectorWrap(vector, rustTarget, rustHead);
const wrapped = gateVectorGet(vector, 0);
expect(wrapped.wires.w0).toEqual({ row: 1, col: 2 });

gateVectorDigest(0, vector);
circuitSerialize(0, vector);

console.log('{}', gateVectorDigest(0, vector));

console.log('gate vector napi bindings (fp) are working ✔️');
