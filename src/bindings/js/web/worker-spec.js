export { workerSpec };

function workerSpec(wasm) {
  let borrowed = (type) => ({ kind: 'wasm-object', type, ownership: 'borrow' });
  let moved = (type) => ({ kind: 'wasm-object', type, ownership: 'move' });
  let transferred = (type) => ({ kind: 'wasm-object', type, ownership: 'transfer' });
  let bool = { kind: 'boolean' };
  return {
    caml_pasta_fp_plonk_index_create: {
      args: [
        // gates
        borrowed(wasm.WasmFpGateVector),
        // public_
        undefined /* number */,
        // lookup_tables
        undefined /*Uint32Array*/,
        // runtime_table_cfgs
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /* number */,
        // srs
        borrowed(wasm.WasmFpSrs),
        // lazy_mode
        undefined /* boolean */,
      ],
      res: transferred(wasm.WasmPastaFpPlonkIndex),
    },
    caml_pasta_fq_plonk_index_create: {
      args: [
        // gates
        borrowed(wasm.WasmFqGateVector),
        // public_
        undefined /* number */,
        // lookup_tables
        undefined /*Uint32Array*/,
        // runtime_table_cfgs
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /* number */,
        // srs
        borrowed(wasm.WasmFqSrs),
        // lazy_mode
        undefined /* boolean */,
      ],
      res: transferred(wasm.WasmPastaFqPlonkIndex),
    },
    caml_pasta_fp_plonk_verifier_index_create: {
      args: [borrowed(wasm.WasmPastaFpPlonkIndex)],
      res: transferred(wasm.WasmFpPlonkVerifierIndex),
    },
    caml_pasta_fq_plonk_verifier_index_create: {
      args: [borrowed(wasm.WasmPastaFqPlonkIndex)],
      res: transferred(wasm.WasmFqPlonkVerifierIndex),
    },
    caml_pasta_fp_plonk_proof_create: {
      args: [
        // index
        borrowed(wasm.WasmPastaFpPlonkIndex),
        // witness
        moved(wasm.WasmVecVecFp),
        // runtime tables
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /*Uint8Array*/,
        // prev_svgs
        undefined /*Uint32Array*/,
      ],
      res: transferred(wasm.WasmFpProverProof),
    },
    caml_pasta_fq_plonk_proof_create: {
      args: [
        // index
        borrowed(wasm.WasmPastaFqPlonkIndex),
        // witness
        moved(wasm.WasmVecVecFq),
        // runtime tables
        undefined /*Uint32Array*/,
        // prev_challenges
        undefined /*Uint8Array*/,
        // prev_svgs
        undefined /*Uint32Array*/,
      ],
      res: transferred(wasm.WasmFqProverProof),
    },
    caml_pasta_fp_plonk_proof_verify: {
      args: [moved(wasm.WasmFpPlonkVerifierIndex), moved(wasm.WasmFpProverProof)],
      res: bool,
    },
    caml_pasta_fq_plonk_proof_verify: {
      args: [moved(wasm.WasmFqPlonkVerifierIndex), moved(wasm.WasmFqProverProof)],
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
      res: transferred(wasm.WasmFpSrs),
    },
    caml_fq_srs_create_parallel: {
      args: [undefined /*number*/],
      res: transferred(wasm.WasmFqSrs),
    },
    caml_fp_srs_get_lagrange_basis: {
      disabled: true,
      args: [borrowed(wasm.WasmFpSrs), undefined /* number */],
      // TODO: the synchronous worker RPC currently returns a single u32.
      // Typed-array results need a separate transfer representation.
      res: undefined /* UintXArray */,
    },
    caml_fq_srs_get_lagrange_basis: {
      disabled: true,
      args: [borrowed(wasm.WasmFqSrs), undefined /* number */],
      // TODO: returning a UintXArray does not work, see above
      res: undefined /* UintXArray */,
    },
    caml_fp_srs_b_poly_commitment: {
      args: [borrowed(wasm.WasmFpSrs), undefined /*Uint8Array*/],
      res: transferred(wasm.WasmFpPolyComm),
    },
    caml_fq_srs_b_poly_commitment: {
      args: [borrowed(wasm.WasmFqSrs), undefined /*Uint8Array*/],
      res: transferred(wasm.WasmFqPolyComm),
    },
    fp_oracles_create: {
      args: [
        undefined /* Uint32Array */,
        moved(wasm.WasmFpPlonkVerifierIndex),
        moved(wasm.WasmFpProverProof),
      ],
      res: transferred(wasm.WasmFpOracles),
    },
    fq_oracles_create: {
      args: [
        undefined /* Uint32Array */,
        moved(wasm.WasmFqPlonkVerifierIndex),
        moved(wasm.WasmFqProverProof),
      ],
      res: transferred(wasm.WasmFqOracles),
    },
    caml_fp_srs_batch_accumulator_check: {
      args: [borrowed(wasm.WasmFpSrs), undefined /* UintXArray */, undefined /* UintXArray */],
      res: bool,
    },
    caml_fq_srs_batch_accumulator_check: {
      args: [borrowed(wasm.WasmFqSrs), undefined /* UintXArray */, undefined /* UintXArray */],
      res: bool,
    },
    caml_fp_srs_lagrange_commitment: {
      args: [borrowed(wasm.WasmFpSrs), undefined /* number */, undefined /* number */],
      res: transferred(wasm.WasmFpPolyComm),
    },
    caml_fq_srs_lagrange_commitment: {
      args: [borrowed(wasm.WasmFqSrs), undefined /* number */, undefined /* number */],
      res: transferred(wasm.WasmFqPolyComm),
    },
    caml_fp_srs_lagrange_commitments_whole_domain_ptr: {
      args: [borrowed(wasm.WasmFpSrs), undefined /* number */],
      res: undefined /* number, ptr */,
    },
    caml_fq_srs_lagrange_commitments_whole_domain_ptr: {
      args: [borrowed(wasm.WasmFqSrs), undefined /* number */],
      res: undefined /* number, ptr */,
    },
  };
}
