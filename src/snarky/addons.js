import { Circuit } from '../snarky';
/**
 * @type { import("./wrapper") }
 */
import { getWasm } from './wrapper';

export { getSrs, serializeVerificationKey, recoverVerificationKey };

function getJsooRuntime() {
  return globalThis.jsoo_runtime;
}

/**
 *
 * @param { import("../snarky").Keypair } kp
 * @returns { import("./wrapper").WasmModule['WasmFpSrs'] } srs
 */
function getSrs(kp) {
  return kp.value[2][4];
}

/**
 *
 * @param { import("../snarky").VerificationKey } vk
 */
function serializeVerificationKey(vk) {
  let wasm = getWasm();
  let runtime = getJsooRuntime();
  let isFp = vk.value[4].constructor.name === 'WasmFpSrs';
  return isFp
    ? wasm.caml_pasta_fp_plonk_verifier_index_serialize(
        runtime.caml_pasta_fp_plonk_verifier_index_to_rust(vk.value)
      )
    : wasm.caml_pasta_fq_plonk_verifier_index_serialize(
        runtime.caml_pasta_fq_plonk_verifier_index_to_rust(vk.value)
      );
}

/**
 * @param { import("./wrapper").WasmModule['WasmFpSrs'] } srs
 * @param { String } vkBytes
 * @returns { import("../snarky").VerificationKey }
 */
function recoverVerificationKey(srs, vkBytes) {
  let vkRust = getWasm().caml_pasta_fp_plonk_verifier_index_deserialize(
    srs,
    vkBytes
  );
  let vk = getJsooRuntime().caml_pasta_fp_plonk_verifier_index_of_rust(vkRust);
  return Circuit.getVerificationKey(vk);
}
