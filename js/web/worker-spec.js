export { workerSpec };

function workerSpec(wasm) {
  let bool = {
    // We avoid returning zero for false to ensure that the
    // wait_until_non_zero call below terminates.
    there: (bool) => (bool ? 2 : 1),
    back: (u32) => u32 !== 1,
  };
  return {
    caml_pasta_fp_plonk_index_create: {
      args: [
        // gates
        wasm.WasmFpGateVector,
        // public_
        undefined /* number */,
        // lookup_tables
        undefined /*Uint32Array*/,
        // runtime_table_cfgs
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /* number */,
        // srs
        wasm.WasmFpSrs,
      ],
      res: wasm.WasmPastaFpPlonkIndex,
    },
    caml_pasta_fq_plonk_index_create: {
      args: [
        // gates
        wasm.WasmFqGateVector,
        // public_
        undefined /* number */,
        // lookup_tables
        undefined /*Uint32Array*/,
        // runtime_table_cfgs
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /* number */,
        // srs
        wasm.WasmFqSrs,
      ],
      res: wasm.WasmPastaFqPlonkIndex,
    },
    caml_pasta_fp_plonk_verifier_index_create: {
      args: [wasm.WasmPastaFpPlonkIndex],
      res: wasm.WasmFpPlonkVerifierIndex,
    },
    caml_pasta_fq_plonk_verifier_index_create: {
      args: [wasm.WasmPastaFqPlonkIndex],
      res: wasm.WasmFqPlonkVerifierIndex,
    },
    caml_pasta_fp_plonk_proof_create: {
      args: [
        wasm.WasmPastaFpPlonkIndex,
        wasm.WasmVecVecFp,
        undefined /*Uint8Array*/,
        undefined /*Uint32Array*/,
      ],
      res: wasm.WasmFpProverProof,
    },
    caml_pasta_fq_plonk_proof_create: {
      args: [
        wasm.WasmPastaFqPlonkIndex,
        wasm.WasmVecVecFq,
        undefined /*Uint8Array*/,
        undefined /*Uint32Array*/,
      ],
      res: wasm.WasmFqProverProof,
    },
    caml_pasta_fp_plonk_proof_verify: {
      args: [wasm.WasmFpPlonkVerifierIndex, wasm.WasmFpProverProof],
      res: bool,
    },
    caml_pasta_fq_plonk_proof_verify: {
      args: [wasm.WasmFqPlonkVerifierIndex, wasm.WasmFqProverProof],
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
      args: [wasm.WasmFpSrs, undefined /*Uint8Array*/],
      res: wasm.WasmFpPolyComm,
    },
    caml_fq_srs_b_poly_commitment: {
      args: [wasm.WasmFqSrs, undefined /*Uint8Array*/],
      res: wasm.WasmFqPolyComm,
    },
    fp_oracles_create: {
      args: [
        undefined /* Uint32Array */,
        wasm.WasmFpPlonkVerifierIndex,
        wasm.WasmFpProverProof,
      ],
      res: wasm.WasmFpOracles,
    },
    fq_oracles_create: {
      args: [
        undefined /* Uint32Array */,
        wasm.WasmFqPlonkVerifierIndex,
        wasm.WasmFqProverProof,
      ],
      res: wasm.WasmFqOracles,
    },
    caml_fp_srs_batch_accumulator_check: {
      args: [
        wasm.WasmFpSrs,
        undefined /* UintXArray */,
        undefined /* UintXArray */,
      ],
      res: bool,
    },
    caml_fq_srs_batch_accumulator_check: {
      args: [
        wasm.WasmFqSrs,
        undefined /* UintXArray */,
        undefined /* UintXArray */,
      ],
      res: bool,
    },
    caml_fp_srs_lagrange_commitment: {
      args: [wasm.WasmFpSrs, undefined /* number */, undefined /* number */],
      res: wasm.WasmFpPolyComm,
    },
    caml_fq_srs_lagrange_commitment: {
      args: [wasm.WasmFqSrs, undefined /* number */, undefined /* number */],
      res: wasm.WasmFqPolyComm,
    },
  };
}
