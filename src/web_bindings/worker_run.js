export default function workerRun() {
  const worker_spec = function (plonk_wasm) {
    let bool = {
      there: function (bool) {
        // We avoid returning zero for false to ensure that the
        // wait_until_non_zero call below terminates.
        if (bool) {
          return 2;
        } else {
          return 1;
        }
      },
      back: function (u32) {
        return u32 !== 1;
      },
    };
    return {
      caml_pasta_fp_plonk_index_create: {
        args: [
          plonk_wasm.WasmFpGateVector,
          undefined /* number */,
          undefined /* number */,
          plonk_wasm.WasmFpSrs,
        ],
        res: plonk_wasm.WasmPastaFpPlonkIndex,
      },
      caml_pasta_fq_plonk_index_create: {
        args: [
          plonk_wasm.WasmFqGateVector,
          undefined /* number */,
          undefined /* number */,
          plonk_wasm.WasmFqSrs,
        ],
        res: plonk_wasm.WasmPastaFqPlonkIndex,
      },
      caml_pasta_fp_plonk_verifier_index_create: {
        args: [plonk_wasm.WasmPastaFpPlonkIndex],
        res: plonk_wasm.WasmFpPlonkVerifierIndex,
      },
      caml_pasta_fq_plonk_verifier_index_create: {
        args: [plonk_wasm.WasmPastaFqPlonkIndex],
        res: plonk_wasm.WasmFqPlonkVerifierIndex,
      },
      caml_pasta_fp_plonk_proof_create: {
        args: [
          plonk_wasm.WasmPastaFpPlonkIndex,
          plonk_wasm.WasmVecVecFp,
          undefined /*Uint8Array*/,
          undefined /*Uint32Array*/,
        ],
        res: plonk_wasm.WasmFpProverProof,
      },
      caml_pasta_fq_plonk_proof_create: {
        args: [
          plonk_wasm.WasmPastaFqPlonkIndex,
          plonk_wasm.WasmVecVecFq,
          undefined /*Uint8Array*/,
          undefined /*Uint32Array*/,
        ],
        res: plonk_wasm.WasmFqProverProof,
      },
      caml_pasta_fp_plonk_proof_verify: {
        args: [
          plonk_wasm.WasmFpPlonkVerifierIndex,
          plonk_wasm.WasmFpProverProof,
        ],
        res: bool,
      },
      caml_pasta_fq_plonk_proof_verify: {
        args: [
          plonk_wasm.WasmFqPlonkVerifierIndex,
          plonk_wasm.WasmFqProverProof,
        ],
        res: bool,
      },
      caml_pasta_fp_plonk_proof_batch_verify: {
        args: [undefined /* UintXArray */, undefined /* UintXArray */],
        res: bool,
      },
      caml_pasta_fq_plonk_proof_batch_verify: {
        args: [undefined /* UintXArray */, undefined /* UintXArray */],
        res: bool,
      },
      caml_fp_srs_b_poly_commitment: {
        args: [plonk_wasm.WasmFpSrs, undefined /*Uint8Array*/],
        res: plonk_wasm.WasmFpPolyComm,
      },
      caml_fq_srs_b_poly_commitment: {
        args: [plonk_wasm.WasmFqSrs, undefined /*Uint8Array*/],
        res: plonk_wasm.WasmFqPolyComm,
      },
      fp_oracles_create: {
        args: [
          undefined /* Uint32Array */,
          plonk_wasm.WasmFpPlonkVerifierIndex,
          plonk_wasm.WasmFpProverProof,
        ],
        res: plonk_wasm.WasmFpOracles,
      },
      fq_oracles_create: {
        args: [
          undefined /* Uint32Array */,
          plonk_wasm.WasmFqPlonkVerifierIndex,
          plonk_wasm.WasmFqProverProof,
        ],
        res: plonk_wasm.WasmFqOracles,
      },
      caml_fp_srs_batch_accumulator_check: {
        args: [
          plonk_wasm.WasmFpSrs,
          undefined /* UintXArray */,
          undefined /* UintXArray */,
        ],
        res: bool,
      },
      caml_fq_srs_batch_accumulator_check: {
        args: [
          plonk_wasm.WasmFqSrs,
          undefined /* UintXArray */,
          undefined /* UintXArray */,
        ],
        res: bool,
      },
    };
  };

  const override_bindings = function (plonk_wasm, worker) {
    let worker_spec_ = worker_spec(plonk_wasm);
    // Copied object so that we don't modify any const bindings.
    let plonk_wasm_ = {};
    for (let key in plonk_wasm) {
      plonk_wasm_[key] = plonk_wasm[key];
    }
    for (let key in worker_spec_) {
      plonk_wasm_[key] = (...args) => {
        let u32_ptr = plonk_wasm.create_zero_u32_ptr();
        worker.postMessage({ type: 'run', name: key, args, u32_ptr });
        /* Here be undefined behavior dragons. */
        let res = plonk_wasm.wait_until_non_zero(u32_ptr);
        plonk_wasm.free_u32_ptr(u32_ptr);
        let res_spec = worker_spec_[key].res;
        if (res_spec && res_spec.__wrap) {
          return worker_spec_[key].res.__wrap(res);
        } else if (res_spec && res_spec.back) {
          return res_spec.back(res);
        } else {
          return res;
        }
      };
    }
    return plonk_wasm_;
  };
  return { worker_spec, override_bindings };
}
