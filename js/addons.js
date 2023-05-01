// TODO this code is not currently working

import { Circuit } from '../snarky.js';
/**
 * @type { import("./wrapper") }
 */
import { getWasm } from './wrapper.js';

function getJsooRuntime() {
  return globalThis.jsoo_runtime;
}

/**
 *
 * @param { import("../snarky").Keypair } keypair SNARK keypair, as returned by Circuit.generateKeypair
 * @returns { import("./wrapper").WasmModule['WasmFpSrs'] } The SRS (structured reference string), needed to reconstruct the keypair later
 */
function getSrs(keypair) {
  return keypair.value[2][4]; // this operates on the OCaml representation of a keypair
}

/**
 *
 * @param { import("../snarky").VerificationKey } verificationKey the verification key of a Circuit
 * @returns { string } string representation of the verification key
 */
function serializeVerificationKey(verificationKey) {
  let wasm = getWasm();
  let runtime = getJsooRuntime();
  let isFp = verificationKey.value[4].constructor.name === 'WasmFpSrs';
  return isFp
    ? wasm.caml_pasta_fp_plonk_verifier_index_serialize(
        runtime.caml_pasta_fp_plonk_verifier_index_to_rust(
          verificationKey.value
        )
      )
    : wasm.caml_pasta_fq_plonk_verifier_index_serialize(
        runtime.caml_pasta_fq_plonk_verifier_index_to_rust(
          verificationKey.value
        )
      );
}

/**
 * @param { import("./wrapper").WasmModule['WasmFpSrs'] } srs the "structured reference string", a set of precomputed values needed for verifying proofs
 * @param { String } serializedVk string representation of a Circuit verification key
 * @returns { import("../snarky").VerificationKey } the recovered verification key
 */
function recoverVerificationKey(srs, serializedVk) {
  let vkRust = getWasm().caml_pasta_fp_plonk_verifier_index_deserialize(
    srs,
    serializedVk
  );
  let vk = getJsooRuntime().caml_pasta_fp_plonk_verifier_index_of_rust(vkRust);
  return Circuit.getVerificationKey(vk);
}
