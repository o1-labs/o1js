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
        // index
        wasm.WasmPastaFpPlonkIndex,
        // witness
        wasm.WasmVecVecFp,
        // runtime tables
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /*Uint8Array*/,
        // prev_svgs
        undefined /*Uint32Array*/,
      ],
      res: wasm.WasmFpProverProof,
    },
    caml_pasta_fq_plonk_proof_create: {
      args: [
        // index
        wasm.WasmPastaFqPlonkIndex,
        // witness
        wasm.WasmVecVecFq,
        // runtime tables
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /*Uint8Array*/,
        // prev_svgs
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
    caml_fp_srs_create_parallel: {
      args: [undefined /*number*/],
      res: wasm.WasmFpSrs,
    },
    caml_fq_srs_create_parallel: {
      args: [undefined /*number*/],
      res: wasm.WasmFqSrs,
    },
    caml_fp_srs_get_lagrange_basis: {
      disabled: true,
      args: [wasm.WasmFpSrs, undefined /* number */],
      // TODO: returning a UintXArray does not work:
      // the worker wrapper excepts the return value to be a number
      // that can be stored in a single u32.
      // A UintXArray is coerced into a 0 pointer, which doesn't trigger `wait_until_non_zero()`,
      // which means the main worker just keeps spinning waiting for a response.
      // A proper solution would be to wrap the return value in a pointer!
      res: undefined /* UintXArray */,
    },
    caml_fq_srs_get_lagrange_basis: {
      disabled: true,
      args: [wasm.WasmFqSrs, undefined /* number */],
      // TODO: returning a UintXArray does not work, see above
      res: undefined /* UintXArray */,
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
    caml_fp_srs_lagrange_commitments_whole_domain: {
      args: [wasm.WasmFpSrs, undefined /* number */],
      res: undefined /* number, ptr */,
    },
    caml_fq_srs_lagrange_commitments_whole_domain: {
      args: [wasm.WasmFqSrs, undefined /* number */],
      res: undefined /* number, ptr */,
    },
  };
}
