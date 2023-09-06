import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import { fieldsFromRustFlat, fieldsToRustFlat } from './conversion-base.js';
import { proofConversion } from './conversion-proof.js';
import { conversionCore } from './conversion-core.js';
import { verifierIndexConversion } from './conversion-verifier-index.js';
import { oraclesConversion } from './conversion-oracles.js';

export { createRustConversion };

type wasm = typeof wasmNamespace;

function createRustConversion(wasm: wasm) {
  let core = conversionCore(wasm);
  let verifierIndex = verifierIndexConversion(wasm, core);
  let oracles = oraclesConversion(wasm);
  let proof = proofConversion(wasm, core);

  const fp = { ...core.fp, ...verifierIndex.fp, ...oracles.fp, ...proof.fp };
  const fq = { ...core.fq, ...verifierIndex.fq, ...oracles.fq, ...proof.fq };

  return {
    fp,
    fq,
    fieldsToRustFlat,
    fieldsFromRustFlat,
    wireToRust: core.wireToRust,
    mapMlArrayToRustVector: core.mapMlArrayToRustVector,
  };
}
