/* tslint:disable */
/* eslint-disable */
/**
* @returns {WasmGPallas}
*/
export function caml_pallas_affine_one(): WasmGPallas;
/**
* @returns {WasmGVesta}
*/
export function caml_vesta_affine_one(): WasmGVesta;
/**
* @param {Uint8Array} state
* @returns {Uint8Array}
*/
export function caml_pasta_fp_poseidon_block_cipher(state: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} state
* @returns {Uint8Array}
*/
export function caml_pasta_fq_poseidon_block_cipher(state: Uint8Array): Uint8Array;
/**
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_one(): WasmPallasGProjective;
/**
* @param {WasmPallasGProjective} x
* @param {WasmPallasGProjective} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_add(x: WasmPallasGProjective, y: WasmPallasGProjective): WasmPallasGProjective;
/**
* @param {WasmPallasGProjective} x
* @param {WasmPallasGProjective} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_sub(x: WasmPallasGProjective, y: WasmPallasGProjective): WasmPallasGProjective;
/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_negate(x: WasmPallasGProjective): WasmPallasGProjective;
/**
* @param {WasmPallasGProjective} x
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_double(x: WasmPallasGProjective): WasmPallasGProjective;
/**
* @param {WasmPallasGProjective} x
* @param {Uint8Array} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_scale(x: WasmPallasGProjective, y: Uint8Array): WasmPallasGProjective;
/**
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_random(): WasmPallasGProjective;
/**
* @param {number} i
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_rng(i: number): WasmPallasGProjective;
/**
* @returns {Uint8Array}
*/
export function caml_pallas_endo_base(): Uint8Array;
/**
* @returns {Uint8Array}
*/
export function caml_pallas_endo_scalar(): Uint8Array;
/**
* @param {WasmPallasGProjective} x
* @returns {WasmGPallas}
*/
export function caml_pallas_to_affine(x: WasmPallasGProjective): WasmGPallas;
/**
* @param {WasmGPallas} x
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_of_affine(x: WasmGPallas): WasmPallasGProjective;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {WasmPallasGProjective}
*/
export function caml_pallas_of_affine_coordinates(x: Uint8Array, y: Uint8Array): WasmPallasGProjective;
/**
* @param {WasmGPallas} x
* @returns {WasmGPallas}
*/
export function caml_pallas_affine_deep_copy(x: WasmGPallas): WasmGPallas;
/**
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_one(): WasmVestaGProjective;
/**
* @param {WasmVestaGProjective} x
* @param {WasmVestaGProjective} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_add(x: WasmVestaGProjective, y: WasmVestaGProjective): WasmVestaGProjective;
/**
* @param {WasmVestaGProjective} x
* @param {WasmVestaGProjective} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_sub(x: WasmVestaGProjective, y: WasmVestaGProjective): WasmVestaGProjective;
/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_negate(x: WasmVestaGProjective): WasmVestaGProjective;
/**
* @param {WasmVestaGProjective} x
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_double(x: WasmVestaGProjective): WasmVestaGProjective;
/**
* @param {WasmVestaGProjective} x
* @param {Uint8Array} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_scale(x: WasmVestaGProjective, y: Uint8Array): WasmVestaGProjective;
/**
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_random(): WasmVestaGProjective;
/**
* @param {number} i
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_rng(i: number): WasmVestaGProjective;
/**
* @returns {Uint8Array}
*/
export function caml_vesta_endo_base(): Uint8Array;
/**
* @returns {Uint8Array}
*/
export function caml_vesta_endo_scalar(): Uint8Array;
/**
* @param {WasmVestaGProjective} x
* @returns {WasmGVesta}
*/
export function caml_vesta_to_affine(x: WasmVestaGProjective): WasmGVesta;
/**
* @param {WasmGVesta} x
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_of_affine(x: WasmGVesta): WasmVestaGProjective;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {WasmVestaGProjective}
*/
export function caml_vesta_of_affine_coordinates(x: Uint8Array, y: Uint8Array): WasmVestaGProjective;
/**
* @param {WasmGVesta} x
* @returns {WasmGVesta}
*/
export function caml_vesta_affine_deep_copy(x: WasmGVesta): WasmGVesta;
/**
* @param {number} depth
* @returns {WasmFpSrs}
*/
export function caml_fp_srs_create(depth: number): WasmFpSrs;
/**
* @param {WasmFpSrs} srs
* @param {number} log2_size
*/
export function caml_fp_srs_add_lagrange_basis(srs: WasmFpSrs, log2_size: number): void;
/**
* @param {boolean | undefined} append
* @param {WasmFpSrs} srs
* @param {string} path
*/
export function caml_fp_srs_write(append: boolean | undefined, srs: WasmFpSrs, path: string): void;
/**
* @param {number | undefined} offset
* @param {string} path
* @returns {WasmFpSrs | undefined}
*/
export function caml_fp_srs_read(offset: number | undefined, path: string): WasmFpSrs | undefined;
/**
* @param {WasmFpSrs} srs
* @param {number} domain_size
* @param {number} i
* @returns {WasmFpPolyComm}
*/
export function caml_fp_srs_lagrange_commitment(srs: WasmFpSrs, domain_size: number, i: number): WasmFpPolyComm;
/**
* @param {WasmFpSrs} srs
* @param {number} domain_size
* @param {Uint8Array} evals
* @returns {WasmFpPolyComm}
*/
export function caml_fp_srs_commit_evaluations(srs: WasmFpSrs, domain_size: number, evals: Uint8Array): WasmFpPolyComm;
/**
* @param {WasmFpSrs} srs
* @param {Uint8Array} chals
* @returns {WasmFpPolyComm}
*/
export function caml_fp_srs_b_poly_commitment(srs: WasmFpSrs, chals: Uint8Array): WasmFpPolyComm;
/**
* @param {WasmFpSrs} srs
* @param {Uint32Array} comms
* @param {Uint8Array} chals
* @returns {boolean}
*/
export function caml_fp_srs_batch_accumulator_check(srs: WasmFpSrs, comms: Uint32Array, chals: Uint8Array): boolean;
/**
* @param {WasmFpSrs} srs
* @param {number} comms
* @param {Uint8Array} chals
* @returns {Uint32Array}
*/
export function caml_fp_srs_batch_accumulator_generate(srs: WasmFpSrs, comms: number, chals: Uint8Array): Uint32Array;
/**
* @param {WasmFpSrs} srs
* @returns {WasmGVesta}
*/
export function caml_fp_srs_h(srs: WasmFpSrs): WasmGVesta;
/**
* @param {number} depth
* @returns {WasmFqSrs}
*/
export function caml_fq_srs_create(depth: number): WasmFqSrs;
/**
* @param {WasmFqSrs} srs
* @param {number} log2_size
*/
export function caml_fq_srs_add_lagrange_basis(srs: WasmFqSrs, log2_size: number): void;
/**
* @param {boolean | undefined} append
* @param {WasmFqSrs} srs
* @param {string} path
*/
export function caml_fq_srs_write(append: boolean | undefined, srs: WasmFqSrs, path: string): void;
/**
* @param {number | undefined} offset
* @param {string} path
* @returns {WasmFqSrs | undefined}
*/
export function caml_fq_srs_read(offset: number | undefined, path: string): WasmFqSrs | undefined;
/**
* @param {WasmFqSrs} srs
* @param {number} domain_size
* @param {number} i
* @returns {WasmFqPolyComm}
*/
export function caml_fq_srs_lagrange_commitment(srs: WasmFqSrs, domain_size: number, i: number): WasmFqPolyComm;
/**
* @param {WasmFqSrs} srs
* @param {number} domain_size
* @param {Uint8Array} evals
* @returns {WasmFqPolyComm}
*/
export function caml_fq_srs_commit_evaluations(srs: WasmFqSrs, domain_size: number, evals: Uint8Array): WasmFqPolyComm;
/**
* @param {WasmFqSrs} srs
* @param {Uint8Array} chals
* @returns {WasmFqPolyComm}
*/
export function caml_fq_srs_b_poly_commitment(srs: WasmFqSrs, chals: Uint8Array): WasmFqPolyComm;
/**
* @param {WasmFqSrs} srs
* @param {Uint32Array} comms
* @param {Uint8Array} chals
* @returns {boolean}
*/
export function caml_fq_srs_batch_accumulator_check(srs: WasmFqSrs, comms: Uint32Array, chals: Uint8Array): boolean;
/**
* @param {WasmFqSrs} srs
* @param {number} comms
* @param {Uint8Array} chals
* @returns {Uint32Array}
*/
export function caml_fq_srs_batch_accumulator_generate(srs: WasmFqSrs, comms: number, chals: Uint8Array): Uint32Array;
/**
* @param {WasmFqSrs} srs
* @returns {WasmGPallas}
*/
export function caml_fq_srs_h(srs: WasmFqSrs): WasmGPallas;
/**
* @param {WasmPastaFpPlonkIndex} index
* @param {WasmVecVecFp} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFpProverProof}
*/
export function caml_pasta_fp_plonk_proof_create(index: WasmPastaFpPlonkIndex, witness: WasmVecVecFp, prev_challenges: Uint8Array, prev_sgs: Uint32Array): WasmFpProverProof;
/**
* @param {WasmFpPlonkVerifierIndex} index
* @param {WasmFpProverProof} proof
* @returns {boolean}
*/
export function caml_pasta_fp_plonk_proof_verify(index: WasmFpPlonkVerifierIndex, proof: WasmFpProverProof): boolean;
/**
* @param {Uint32Array} indexes
* @param {Uint32Array} proofs
* @returns {boolean}
*/
export function caml_pasta_fp_plonk_proof_batch_verify(indexes: Uint32Array, proofs: Uint32Array): boolean;
/**
* @returns {WasmFpProverProof}
*/
export function caml_pasta_fp_plonk_proof_dummy(): WasmFpProverProof;
/**
* @param {WasmFpProverProof} x
* @returns {WasmFpProverProof}
*/
export function caml_pasta_fp_plonk_proof_deep_copy(x: WasmFpProverProof): WasmFpProverProof;
/**
* @param {WasmPastaFqPlonkIndex} index
* @param {WasmVecVecFq} witness
* @param {Uint8Array} prev_challenges
* @param {Uint32Array} prev_sgs
* @returns {WasmFqProverProof}
*/
export function caml_pasta_fq_plonk_proof_create(index: WasmPastaFqPlonkIndex, witness: WasmVecVecFq, prev_challenges: Uint8Array, prev_sgs: Uint32Array): WasmFqProverProof;
/**
* @param {WasmFqPlonkVerifierIndex} index
* @param {WasmFqProverProof} proof
* @returns {boolean}
*/
export function caml_pasta_fq_plonk_proof_verify(index: WasmFqPlonkVerifierIndex, proof: WasmFqProverProof): boolean;
/**
* @param {Uint32Array} indexes
* @param {Uint32Array} proofs
* @returns {boolean}
*/
export function caml_pasta_fq_plonk_proof_batch_verify(indexes: Uint32Array, proofs: Uint32Array): boolean;
/**
* @returns {WasmFqProverProof}
*/
export function caml_pasta_fq_plonk_proof_dummy(): WasmFqProverProof;
/**
* @param {WasmFqProverProof} x
* @returns {WasmFqProverProof}
*/
export function caml_pasta_fq_plonk_proof_deep_copy(x: WasmFqProverProof): WasmFqProverProof;
/**
* @param {number | undefined} offset
* @param {WasmFpSrs} srs
* @param {string} path
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_read(offset: number | undefined, srs: WasmFpSrs, path: string): WasmFpPlonkVerifierIndex;
/**
* @param {boolean | undefined} append
* @param {WasmFpPlonkVerifierIndex} index
* @param {string} path
*/
export function caml_pasta_fp_plonk_verifier_index_write(append: boolean | undefined, index: WasmFpPlonkVerifierIndex, path: string): void;
/**
* @param {WasmFpPlonkVerifierIndex} index
* @returns {string}
*/
export function caml_pasta_fp_plonk_verifier_index_serialize(index: WasmFpPlonkVerifierIndex): string;
/**
* @param {WasmFpSrs} srs
* @param {string} index
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_deserialize(srs: WasmFpSrs, index: string): WasmFpPlonkVerifierIndex;
/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_create(index: WasmPastaFpPlonkIndex): WasmFpPlonkVerifierIndex;
/**
* @param {number} log2_size
* @returns {WasmFpShifts}
*/
export function caml_pasta_fp_plonk_verifier_index_shifts(log2_size: number): WasmFpShifts;
/**
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_dummy(): WasmFpPlonkVerifierIndex;
/**
* @param {WasmFpPlonkVerifierIndex} x
* @returns {WasmFpPlonkVerifierIndex}
*/
export function caml_pasta_fp_plonk_verifier_index_deep_copy(x: WasmFpPlonkVerifierIndex): WasmFpPlonkVerifierIndex;
/**
* @param {number | undefined} offset
* @param {WasmFqSrs} srs
* @param {string} path
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_read(offset: number | undefined, srs: WasmFqSrs, path: string): WasmFqPlonkVerifierIndex;
/**
* @param {boolean | undefined} append
* @param {WasmFqPlonkVerifierIndex} index
* @param {string} path
*/
export function caml_pasta_fq_plonk_verifier_index_write(append: boolean | undefined, index: WasmFqPlonkVerifierIndex, path: string): void;
/**
* @param {WasmFqPlonkVerifierIndex} index
* @returns {string}
*/
export function caml_pasta_fq_plonk_verifier_index_serialize(index: WasmFqPlonkVerifierIndex): string;
/**
* @param {WasmFqSrs} srs
* @param {string} index
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_deserialize(srs: WasmFqSrs, index: string): WasmFqPlonkVerifierIndex;
/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_create(index: WasmPastaFqPlonkIndex): WasmFqPlonkVerifierIndex;
/**
* @param {number} log2_size
* @returns {WasmFqShifts}
*/
export function caml_pasta_fq_plonk_verifier_index_shifts(log2_size: number): WasmFqShifts;
/**
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_dummy(): WasmFqPlonkVerifierIndex;
/**
* @param {WasmFqPlonkVerifierIndex} x
* @returns {WasmFqPlonkVerifierIndex}
*/
export function caml_pasta_fq_plonk_verifier_index_deep_copy(x: WasmFqPlonkVerifierIndex): WasmFqPlonkVerifierIndex;
/**
* @param {Uint32Array} lgr_comm
* @param {WasmFpPlonkVerifierIndex} index
* @param {WasmFpProverProof} proof
* @returns {WasmFpOracles}
*/
export function fp_oracles_create(lgr_comm: Uint32Array, index: WasmFpPlonkVerifierIndex, proof: WasmFpProverProof): WasmFpOracles;
/**
* @returns {WasmFpOracles}
*/
export function fp_oracles_dummy(): WasmFpOracles;
/**
* @param {WasmFpProverProof} x
* @returns {WasmFpProverProof}
*/
export function fp_oracles_deep_copy(x: WasmFpProverProof): WasmFpProverProof;
/**
* @param {Uint32Array} lgr_comm
* @param {WasmFqPlonkVerifierIndex} index
* @param {WasmFqProverProof} proof
* @returns {WasmFqOracles}
*/
export function fq_oracles_create(lgr_comm: Uint32Array, index: WasmFqPlonkVerifierIndex, proof: WasmFqProverProof): WasmFqOracles;
/**
* @returns {WasmFqOracles}
*/
export function fq_oracles_dummy(): WasmFqOracles;
/**
* @param {WasmFqProverProof} x
* @returns {WasmFqProverProof}
*/
export function fq_oracles_deep_copy(x: WasmFqProverProof): WasmFqProverProof;
/**
* @returns {WasmFpGateVector}
*/
export function caml_pasta_fp_plonk_gate_vector_create(): WasmFpGateVector;
/**
* @param {WasmFpGateVector} v
* @param {WasmFpGate} gate
*/
export function caml_pasta_fp_plonk_gate_vector_add(v: WasmFpGateVector, gate: WasmFpGate): void;
/**
* @param {WasmFpGateVector} v
* @param {number} i
* @returns {WasmFpGate}
*/
export function caml_pasta_fp_plonk_gate_vector_get(v: WasmFpGateVector, i: number): WasmFpGate;
/**
* @param {WasmFpGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
export function caml_pasta_fp_plonk_gate_vector_wrap(v: WasmFpGateVector, t: Wire, h: Wire): void;
/**
* @param {WasmFpGateVector} v
* @returns {Uint8Array}
*/
export function caml_pasta_fp_plonk_gate_vector_digest(v: WasmFpGateVector): Uint8Array;
/**
* @returns {WasmFqGateVector}
*/
export function caml_pasta_fq_plonk_gate_vector_create(): WasmFqGateVector;
/**
* @param {WasmFqGateVector} v
* @param {WasmFqGate} gate
*/
export function caml_pasta_fq_plonk_gate_vector_add(v: WasmFqGateVector, gate: WasmFqGate): void;
/**
* @param {WasmFqGateVector} v
* @param {number} i
* @returns {WasmFqGate}
*/
export function caml_pasta_fq_plonk_gate_vector_get(v: WasmFqGateVector, i: number): WasmFqGate;
/**
* @param {WasmFqGateVector} v
* @param {Wire} t
* @param {Wire} h
*/
export function caml_pasta_fq_plonk_gate_vector_wrap(v: WasmFqGateVector, t: Wire, h: Wire): void;
/**
* @param {WasmFqGateVector} v
* @returns {Uint8Array}
*/
export function caml_pasta_fq_plonk_gate_vector_digest(v: WasmFqGateVector): Uint8Array;
/**
* @param {WasmFpGateVector} gates
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFpSrs} srs
* @returns {WasmPastaFpPlonkIndex}
*/
export function caml_pasta_fp_plonk_index_create(gates: WasmFpGateVector, public_: number, prev_challenges: number, srs: WasmFpSrs): WasmPastaFpPlonkIndex;
/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_max_degree(index: WasmPastaFpPlonkIndex): number;
/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_public_inputs(index: WasmPastaFpPlonkIndex): number;
/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_domain_d1_size(index: WasmPastaFpPlonkIndex): number;
/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_domain_d4_size(index: WasmPastaFpPlonkIndex): number;
/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fp_plonk_index_domain_d8_size(index: WasmPastaFpPlonkIndex): number;
/**
* @param {number | undefined} offset
* @param {WasmFpSrs} srs
* @param {string} path
* @returns {WasmPastaFpPlonkIndex}
*/
export function caml_pasta_fp_plonk_index_read(offset: number | undefined, srs: WasmFpSrs, path: string): WasmPastaFpPlonkIndex;
/**
* @param {boolean | undefined} append
* @param {WasmPastaFpPlonkIndex} index
* @param {string} path
*/
export function caml_pasta_fp_plonk_index_write(append: boolean | undefined, index: WasmPastaFpPlonkIndex, path: string): void;
/**
* @param {WasmPastaFpPlonkIndex} index
* @returns {string}
*/
export function caml_pasta_fp_plonk_index_serialize(index: WasmPastaFpPlonkIndex): string;
/**
* @param {WasmFqGateVector} gates
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFqSrs} srs
* @returns {WasmPastaFqPlonkIndex}
*/
export function caml_pasta_fq_plonk_index_create(gates: WasmFqGateVector, public_: number, prev_challenges: number, srs: WasmFqSrs): WasmPastaFqPlonkIndex;
/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_max_degree(index: WasmPastaFqPlonkIndex): number;
/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_public_inputs(index: WasmPastaFqPlonkIndex): number;
/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_domain_d1_size(index: WasmPastaFqPlonkIndex): number;
/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_domain_d4_size(index: WasmPastaFqPlonkIndex): number;
/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {number}
*/
export function caml_pasta_fq_plonk_index_domain_d8_size(index: WasmPastaFqPlonkIndex): number;
/**
* @param {number | undefined} offset
* @param {WasmFqSrs} srs
* @param {string} path
* @returns {WasmPastaFqPlonkIndex}
*/
export function caml_pasta_fq_plonk_index_read(offset: number | undefined, srs: WasmFqSrs, path: string): WasmPastaFqPlonkIndex;
/**
* @param {boolean | undefined} append
* @param {WasmPastaFqPlonkIndex} index
* @param {string} path
*/
export function caml_pasta_fq_plonk_index_write(append: boolean | undefined, index: WasmPastaFqPlonkIndex, path: string): void;
/**
* @param {WasmPastaFqPlonkIndex} index
* @returns {string}
*/
export function caml_pasta_fq_plonk_index_serialize(index: WasmPastaFqPlonkIndex): string;
/**
* @param {string} name
*/
export function greet(name: string): void;
/**
* @param {string} s
*/
export function console_log(s: string): void;
/**
* @returns {number}
*/
export function create_zero_u32_ptr(): number;
/**
* @param {number} ptr
*/
export function free_u32_ptr(ptr: number): void;
/**
* @param {number} ptr
* @param {number} arg
*/
export function set_u32_ptr(ptr: number, arg: number): void;
/**
* @param {number} ptr
* @returns {number}
*/
export function wait_until_non_zero(ptr: number): number;
/**
* @param {string} s
* @param {number} _len
* @param {number} base
* @returns {Uint8Array}
*/
export function caml_bigint_256_of_numeral(s: string, _len: number, base: number): Uint8Array;
/**
* @param {string} s
* @returns {Uint8Array}
*/
export function caml_bigint_256_of_decimal_string(s: string): Uint8Array;
/**
* @returns {number}
*/
export function caml_bigint_256_num_limbs(): number;
/**
* @returns {number}
*/
export function caml_bigint_256_bytes_per_limb(): number;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_bigint_256_div(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
export function caml_bigint_256_compare(x: Uint8Array, y: Uint8Array): number;
/**
* @param {Uint8Array} x
*/
export function caml_bigint_256_print(x: Uint8Array): void;
/**
* @param {Uint8Array} x
* @returns {string}
*/
export function caml_bigint_256_to_string(x: Uint8Array): string;
/**
* @param {Uint8Array} x
* @param {number} i
* @returns {boolean}
*/
export function caml_bigint_256_test_bit(x: Uint8Array, i: number): boolean;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_bigint_256_to_bytes(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_bigint_256_of_bytes(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_bigint_256_deep_copy(x: Uint8Array): Uint8Array;
/**
* @returns {number}
*/
export function caml_pasta_fp_size_in_bits(): number;
/**
* @returns {Uint8Array}
*/
export function caml_pasta_fp_size(): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_add(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_sub(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_negate(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_mul(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fp_div(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fp_inv(x: Uint8Array): Uint8Array | undefined;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_square(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {boolean}
*/
export function caml_pasta_fp_is_square(x: Uint8Array): boolean;
/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fp_sqrt(x: Uint8Array): Uint8Array | undefined;
/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_int(i: number): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {string}
*/
export function caml_pasta_fp_to_string(x: Uint8Array): string;
/**
* @param {string} s
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_string(s: string): Uint8Array;
/**
* @param {Uint8Array} x
*/
export function caml_pasta_fp_print(x: Uint8Array): void;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
export function caml_pasta_fp_compare(x: Uint8Array, y: Uint8Array): number;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {boolean}
*/
export function caml_pasta_fp_equal(x: Uint8Array, y: Uint8Array): boolean;
/**
* @returns {Uint8Array}
*/
export function caml_pasta_fp_random(): Uint8Array;
/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fp_rng(i: number): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_to_bigint(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_bigint(x: Uint8Array): Uint8Array;
/**
* @returns {Uint8Array}
*/
export function caml_pasta_fp_two_adic_root_of_unity(): Uint8Array;
/**
* @param {number} log2_size
* @returns {Uint8Array}
*/
export function caml_pasta_fp_domain_generator(log2_size: number): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_to_bytes(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_of_bytes(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fp_deep_copy(x: Uint8Array): Uint8Array;
/**
* @returns {number}
*/
export function caml_pasta_fq_size_in_bits(): number;
/**
* @returns {Uint8Array}
*/
export function caml_pasta_fq_size(): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_add(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_sub(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_negate(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_mul(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {Uint8Array}
*/
export function caml_pasta_fq_div(x: Uint8Array, y: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fq_inv(x: Uint8Array): Uint8Array | undefined;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_square(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {boolean}
*/
export function caml_pasta_fq_is_square(x: Uint8Array): boolean;
/**
* @param {Uint8Array} x
* @returns {Uint8Array | undefined}
*/
export function caml_pasta_fq_sqrt(x: Uint8Array): Uint8Array | undefined;
/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_int(i: number): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {string}
*/
export function caml_pasta_fq_to_string(x: Uint8Array): string;
/**
* @param {string} s
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_string(s: string): Uint8Array;
/**
* @param {Uint8Array} x
*/
export function caml_pasta_fq_print(x: Uint8Array): void;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {number}
*/
export function caml_pasta_fq_compare(x: Uint8Array, y: Uint8Array): number;
/**
* @param {Uint8Array} x
* @param {Uint8Array} y
* @returns {boolean}
*/
export function caml_pasta_fq_equal(x: Uint8Array, y: Uint8Array): boolean;
/**
* @returns {Uint8Array}
*/
export function caml_pasta_fq_random(): Uint8Array;
/**
* @param {number} i
* @returns {Uint8Array}
*/
export function caml_pasta_fq_rng(i: number): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_to_bigint(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_bigint(x: Uint8Array): Uint8Array;
/**
* @returns {Uint8Array}
*/
export function caml_pasta_fq_two_adic_root_of_unity(): Uint8Array;
/**
* @param {number} log2_size
* @returns {Uint8Array}
*/
export function caml_pasta_fq_domain_generator(log2_size: number): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_to_bytes(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_of_bytes(x: Uint8Array): Uint8Array;
/**
* @param {Uint8Array} x
* @returns {Uint8Array}
*/
export function caml_pasta_fq_deep_copy(x: Uint8Array): Uint8Array;
/**
* @param {number} num_threads
* @param {string} worker_source
* @returns {Promise<any>}
*/
export function initThreadPool(num_threads: number, worker_source: string): Promise<any>;
/**
* @param {number} receiver
*/
export function wbg_rayon_start_worker(receiver: number): void;
/**
* A row accessible from a given row, corresponds to the fact that we open all polynomials
* at `zeta` **and** `omega * zeta`.
*/
export enum CurrOrNext {
  Curr,
  Next,
}
/**
* The different types of gates the system supports.
* Note that all the gates are mutually exclusive:
* they cannot be used at the same time on single row.
* If we were ever to support this feature, we would have to make sure
* not to re-use powers of alpha across constraints.
*/
export enum GateType {
/**
* Zero gate
*/
  Zero,
/**
* Generic arithmetic gate
*/
  Generic,
/**
* Poseidon permutation gate
*/
  Poseidon,
/**
* Complete EC addition in Affine form
*/
  CompleteAdd,
/**
* EC variable base scalar multiplication
*/
  VarBaseMul,
/**
* EC variable base scalar multiplication with group endomorphim optimization
*/
  EndoMul,
/**
* Gate for computing the scalar corresponding to an endoscaling
*/
  EndoMulScalar,
/**
* ChaCha
*/
  ChaCha0,
  ChaCha1,
  ChaCha2,
  ChaChaFinal,
  Lookup,
/**
* Cairo
*/
  CairoClaim,
  CairoInstruction,
  CairoFlags,
  CairoTransition,
/**
* Range check (16-24)
*/
  RangeCheck0,
  RangeCheck1,
  ForeignFieldAdd,
}
/**
*/
export class WasmFpDomain {
  free(): void;
/**
* @param {number} log_size_of_group
* @param {Uint8Array} group_gen
*/
  constructor(log_size_of_group: number, group_gen: Uint8Array);
/**
*/
  group_gen: Uint8Array;
/**
*/
  log_size_of_group: number;
}
/**
*/
export class WasmFpGate {
  free(): void;
/**
* @param {number} typ
* @param {WasmGateWires} wires
* @param {Uint8Array} coeffs
*/
  constructor(typ: number, wires: WasmGateWires, coeffs: Uint8Array);
/**
*/
  typ: number;
/**
*/
  wires: WasmGateWires;
}
/**
*/
export class WasmFpGateVector {
  free(): void;
}
/**
*/
export class WasmFpOpeningProof {
  free(): void;
/**
* @param {Uint32Array} lr_0
* @param {Uint32Array} lr_1
* @param {WasmGVesta} delta
* @param {Uint8Array} z1
* @param {Uint8Array} z2
* @param {WasmGVesta} sg
*/
  constructor(lr_0: Uint32Array, lr_1: Uint32Array, delta: WasmGVesta, z1: Uint8Array, z2: Uint8Array, sg: WasmGVesta);
/**
*/
  delta: WasmGVesta;
/**
*/
  lr_0: Uint32Array;
/**
*/
  lr_1: Uint32Array;
/**
*/
  sg: WasmGVesta;
/**
*/
  z1: Uint8Array;
/**
*/
  z2: Uint8Array;
}
/**
*/
export class WasmFpOracles {
  free(): void;
/**
* @param {WasmFpRandomOracles} o
* @param {Uint8Array} p_eval0
* @param {Uint8Array} p_eval1
* @param {Uint8Array} opening_prechallenges
* @param {Uint8Array} digest_before_evaluations
*/
  constructor(o: WasmFpRandomOracles, p_eval0: Uint8Array, p_eval1: Uint8Array, opening_prechallenges: Uint8Array, digest_before_evaluations: Uint8Array);
/**
*/
  digest_before_evaluations: Uint8Array;
/**
*/
  o: WasmFpRandomOracles;
/**
*/
  opening_prechallenges: Uint8Array;
/**
*/
  p_eval0: Uint8Array;
/**
*/
  p_eval1: Uint8Array;
}
/**
*/
export class WasmFpPlonkVerificationEvals {
  free(): void;
/**
* @param {Uint32Array} sigma_comm
* @param {Uint32Array} coefficients_comm
* @param {WasmFpPolyComm} generic_comm
* @param {WasmFpPolyComm} psm_comm
* @param {WasmFpPolyComm} complete_add_comm
* @param {WasmFpPolyComm} mul_comm
* @param {WasmFpPolyComm} emul_comm
* @param {WasmFpPolyComm} endomul_scalar_comm
*/
  constructor(sigma_comm: Uint32Array, coefficients_comm: Uint32Array, generic_comm: WasmFpPolyComm, psm_comm: WasmFpPolyComm, complete_add_comm: WasmFpPolyComm, mul_comm: WasmFpPolyComm, emul_comm: WasmFpPolyComm, endomul_scalar_comm: WasmFpPolyComm);
/**
*/
  chacha_comm: Uint32Array;
/**
*/
  coefficients_comm: Uint32Array;
/**
*/
  complete_add_comm: WasmFpPolyComm;
/**
*/
  emul_comm: WasmFpPolyComm;
/**
*/
  endomul_scalar_comm: WasmFpPolyComm;
/**
*/
  generic_comm: WasmFpPolyComm;
/**
*/
  mul_comm: WasmFpPolyComm;
/**
*/
  psm_comm: WasmFpPolyComm;
/**
*/
  sigma_comm: Uint32Array;
}
/**
*/
export class WasmFpPlonkVerifierIndex {
  free(): void;
/**
* @param {WasmFpDomain} domain
* @param {number} max_poly_size
* @param {number} max_quot_size
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFpSrs} srs
* @param {WasmFpPlonkVerificationEvals} evals
* @param {WasmFpShifts} shifts
*/
  constructor(domain: WasmFpDomain, max_poly_size: number, max_quot_size: number, public_: number, prev_challenges: number, srs: WasmFpSrs, evals: WasmFpPlonkVerificationEvals, shifts: WasmFpShifts);
/**
*/
  domain: WasmFpDomain;
/**
*/
  evals: WasmFpPlonkVerificationEvals;
/**
*/
  max_poly_size: number;
/**
*/
  max_quot_size: number;
/**
*/
  prev_challenges: number;
/**
*/
  public_: number;
/**
*/
  shifts: WasmFpShifts;
/**
*/
  srs: WasmFpSrs;
}
/**
*/
export class WasmFpPolyComm {
  free(): void;
/**
* @param {Uint32Array} unshifted
* @param {WasmGVesta | undefined} shifted
*/
  constructor(unshifted: Uint32Array, shifted?: WasmGVesta);
/**
*/
  shifted?: WasmGVesta;
/**
*/
  unshifted: Uint32Array;
}
/**
*/
export class WasmFpProofEvaluations {
  free(): void;
/**
* @param {WasmVecVecFp} w
* @param {Uint8Array} z
* @param {WasmVecVecFp} s
* @param {Uint8Array} generic_selector
* @param {Uint8Array} poseidon_selector
*/
  constructor(w: WasmVecVecFp, z: Uint8Array, s: WasmVecVecFp, generic_selector: Uint8Array, poseidon_selector: Uint8Array);
/**
*/
  generic_selector: Uint8Array;
/**
*/
  poseidon_selector: Uint8Array;
/**
*/
  s: WasmVecVecFp;
/**
*/
  w: WasmVecVecFp;
/**
*/
  z: Uint8Array;
}
/**
*/
export class WasmFpProverCommitments {
  free(): void;
/**
* @param {Uint32Array} w_comm
* @param {WasmFpPolyComm} z_comm
* @param {WasmFpPolyComm} t_comm
*/
  constructor(w_comm: Uint32Array, z_comm: WasmFpPolyComm, t_comm: WasmFpPolyComm);
/**
*/
  t_comm: WasmFpPolyComm;
/**
*/
  w_comm: Uint32Array;
/**
*/
  z_comm: WasmFpPolyComm;
}
/**
*/
export class WasmFpProverProof {
  free(): void;
/**
* @param {WasmFpProverCommitments} commitments
* @param {WasmFpOpeningProof} proof
* @param {WasmFpProofEvaluations} evals0
* @param {WasmFpProofEvaluations} evals1
* @param {Uint8Array} ft_eval1
* @param {Uint8Array} public_
* @param {WasmVecVecFp} prev_challenges_scalars
* @param {Uint32Array} prev_challenges_comms
*/
  constructor(commitments: WasmFpProverCommitments, proof: WasmFpOpeningProof, evals0: WasmFpProofEvaluations, evals1: WasmFpProofEvaluations, ft_eval1: Uint8Array, public_: Uint8Array, prev_challenges_scalars: WasmVecVecFp, prev_challenges_comms: Uint32Array);
/**
* @returns {string}
*/
  serialize(): string;
/**
*/
  commitments: WasmFpProverCommitments;
/**
*/
  evals0: WasmFpProofEvaluations;
/**
*/
  evals1: WasmFpProofEvaluations;
/**
*/
  ft_eval1: Uint8Array;
/**
*/
  prev_challenges_comms: Uint32Array;
/**
*/
  prev_challenges_scalars: WasmVecVecFp;
/**
*/
  proof: WasmFpOpeningProof;
/**
*/
  public_: Uint8Array;
}
/**
*/
export class WasmFpRandomOracles {
  free(): void;
/**
* @param {Uint8Array | undefined} joint_combiner_chal
* @param {Uint8Array | undefined} joint_combiner
* @param {Uint8Array} beta
* @param {Uint8Array} gamma
* @param {Uint8Array} alpha_chal
* @param {Uint8Array} alpha
* @param {Uint8Array} zeta
* @param {Uint8Array} v
* @param {Uint8Array} u
* @param {Uint8Array} zeta_chal
* @param {Uint8Array} v_chal
* @param {Uint8Array} u_chal
*/
  constructor(joint_combiner_chal: Uint8Array | undefined, joint_combiner: Uint8Array | undefined, beta: Uint8Array, gamma: Uint8Array, alpha_chal: Uint8Array, alpha: Uint8Array, zeta: Uint8Array, v: Uint8Array, u: Uint8Array, zeta_chal: Uint8Array, v_chal: Uint8Array, u_chal: Uint8Array);
/**
*/
  alpha: Uint8Array;
/**
*/
  alpha_chal: Uint8Array;
/**
*/
  beta: Uint8Array;
/**
*/
  gamma: Uint8Array;
/**
*/
  joint_combiner?: Uint8Array;
/**
*/
  joint_combiner_chal?: Uint8Array;
/**
*/
  u: Uint8Array;
/**
*/
  u_chal: Uint8Array;
/**
*/
  v: Uint8Array;
/**
*/
  v_chal: Uint8Array;
/**
*/
  zeta: Uint8Array;
/**
*/
  zeta_chal: Uint8Array;
}
/**
*/
export class WasmFpShifts {
  free(): void;
/**
* @param {Uint8Array} s0
* @param {Uint8Array} s1
* @param {Uint8Array} s2
* @param {Uint8Array} s3
* @param {Uint8Array} s4
* @param {Uint8Array} s5
* @param {Uint8Array} s6
*/
  constructor(s0: Uint8Array, s1: Uint8Array, s2: Uint8Array, s3: Uint8Array, s4: Uint8Array, s5: Uint8Array, s6: Uint8Array);
/**
*/
  s0: Uint8Array;
/**
*/
  s1: Uint8Array;
/**
*/
  s2: Uint8Array;
/**
*/
  s3: Uint8Array;
/**
*/
  s4: Uint8Array;
/**
*/
  s5: Uint8Array;
/**
*/
  s6: Uint8Array;
}
/**
*/
export class WasmFpSrs {
  free(): void;
}
/**
*/
export class WasmFqDomain {
  free(): void;
/**
* @param {number} log_size_of_group
* @param {Uint8Array} group_gen
*/
  constructor(log_size_of_group: number, group_gen: Uint8Array);
/**
*/
  group_gen: Uint8Array;
/**
*/
  log_size_of_group: number;
}
/**
*/
export class WasmFqGate {
  free(): void;
/**
* @param {number} typ
* @param {WasmGateWires} wires
* @param {Uint8Array} coeffs
*/
  constructor(typ: number, wires: WasmGateWires, coeffs: Uint8Array);
/**
*/
  typ: number;
/**
*/
  wires: WasmGateWires;
}
/**
*/
export class WasmFqGateVector {
  free(): void;
}
/**
*/
export class WasmFqOpeningProof {
  free(): void;
/**
* @param {Uint32Array} lr_0
* @param {Uint32Array} lr_1
* @param {WasmGPallas} delta
* @param {Uint8Array} z1
* @param {Uint8Array} z2
* @param {WasmGPallas} sg
*/
  constructor(lr_0: Uint32Array, lr_1: Uint32Array, delta: WasmGPallas, z1: Uint8Array, z2: Uint8Array, sg: WasmGPallas);
/**
*/
  delta: WasmGPallas;
/**
*/
  lr_0: Uint32Array;
/**
*/
  lr_1: Uint32Array;
/**
*/
  sg: WasmGPallas;
/**
*/
  z1: Uint8Array;
/**
*/
  z2: Uint8Array;
}
/**
*/
export class WasmFqOracles {
  free(): void;
/**
* @param {WasmFqRandomOracles} o
* @param {Uint8Array} p_eval0
* @param {Uint8Array} p_eval1
* @param {Uint8Array} opening_prechallenges
* @param {Uint8Array} digest_before_evaluations
*/
  constructor(o: WasmFqRandomOracles, p_eval0: Uint8Array, p_eval1: Uint8Array, opening_prechallenges: Uint8Array, digest_before_evaluations: Uint8Array);
/**
*/
  digest_before_evaluations: Uint8Array;
/**
*/
  o: WasmFqRandomOracles;
/**
*/
  opening_prechallenges: Uint8Array;
/**
*/
  p_eval0: Uint8Array;
/**
*/
  p_eval1: Uint8Array;
}
/**
*/
export class WasmFqPlonkVerificationEvals {
  free(): void;
/**
* @param {Uint32Array} sigma_comm
* @param {Uint32Array} coefficients_comm
* @param {WasmFqPolyComm} generic_comm
* @param {WasmFqPolyComm} psm_comm
* @param {WasmFqPolyComm} complete_add_comm
* @param {WasmFqPolyComm} mul_comm
* @param {WasmFqPolyComm} emul_comm
* @param {WasmFqPolyComm} endomul_scalar_comm
*/
  constructor(sigma_comm: Uint32Array, coefficients_comm: Uint32Array, generic_comm: WasmFqPolyComm, psm_comm: WasmFqPolyComm, complete_add_comm: WasmFqPolyComm, mul_comm: WasmFqPolyComm, emul_comm: WasmFqPolyComm, endomul_scalar_comm: WasmFqPolyComm);
/**
*/
  chacha_comm: Uint32Array;
/**
*/
  coefficients_comm: Uint32Array;
/**
*/
  complete_add_comm: WasmFqPolyComm;
/**
*/
  emul_comm: WasmFqPolyComm;
/**
*/
  endomul_scalar_comm: WasmFqPolyComm;
/**
*/
  generic_comm: WasmFqPolyComm;
/**
*/
  mul_comm: WasmFqPolyComm;
/**
*/
  psm_comm: WasmFqPolyComm;
/**
*/
  sigma_comm: Uint32Array;
}
/**
*/
export class WasmFqPlonkVerifierIndex {
  free(): void;
/**
* @param {WasmFqDomain} domain
* @param {number} max_poly_size
* @param {number} max_quot_size
* @param {number} public_
* @param {number} prev_challenges
* @param {WasmFqSrs} srs
* @param {WasmFqPlonkVerificationEvals} evals
* @param {WasmFqShifts} shifts
*/
  constructor(domain: WasmFqDomain, max_poly_size: number, max_quot_size: number, public_: number, prev_challenges: number, srs: WasmFqSrs, evals: WasmFqPlonkVerificationEvals, shifts: WasmFqShifts);
/**
*/
  domain: WasmFqDomain;
/**
*/
  evals: WasmFqPlonkVerificationEvals;
/**
*/
  max_poly_size: number;
/**
*/
  max_quot_size: number;
/**
*/
  prev_challenges: number;
/**
*/
  public_: number;
/**
*/
  shifts: WasmFqShifts;
/**
*/
  srs: WasmFqSrs;
}
/**
*/
export class WasmFqPolyComm {
  free(): void;
/**
* @param {Uint32Array} unshifted
* @param {WasmGPallas | undefined} shifted
*/
  constructor(unshifted: Uint32Array, shifted?: WasmGPallas);
/**
*/
  shifted?: WasmGPallas;
/**
*/
  unshifted: Uint32Array;
}
/**
*/
export class WasmFqProofEvaluations {
  free(): void;
/**
* @param {WasmVecVecFq} w
* @param {Uint8Array} z
* @param {WasmVecVecFq} s
* @param {Uint8Array} generic_selector
* @param {Uint8Array} poseidon_selector
*/
  constructor(w: WasmVecVecFq, z: Uint8Array, s: WasmVecVecFq, generic_selector: Uint8Array, poseidon_selector: Uint8Array);
/**
*/
  generic_selector: Uint8Array;
/**
*/
  poseidon_selector: Uint8Array;
/**
*/
  s: WasmVecVecFq;
/**
*/
  w: WasmVecVecFq;
/**
*/
  z: Uint8Array;
}
/**
*/
export class WasmFqProverCommitments {
  free(): void;
/**
* @param {Uint32Array} w_comm
* @param {WasmFqPolyComm} z_comm
* @param {WasmFqPolyComm} t_comm
*/
  constructor(w_comm: Uint32Array, z_comm: WasmFqPolyComm, t_comm: WasmFqPolyComm);
/**
*/
  t_comm: WasmFqPolyComm;
/**
*/
  w_comm: Uint32Array;
/**
*/
  z_comm: WasmFqPolyComm;
}
/**
*/
export class WasmFqProverProof {
  free(): void;
/**
* @param {WasmFqProverCommitments} commitments
* @param {WasmFqOpeningProof} proof
* @param {WasmFqProofEvaluations} evals0
* @param {WasmFqProofEvaluations} evals1
* @param {Uint8Array} ft_eval1
* @param {Uint8Array} public_
* @param {WasmVecVecFq} prev_challenges_scalars
* @param {Uint32Array} prev_challenges_comms
*/
  constructor(commitments: WasmFqProverCommitments, proof: WasmFqOpeningProof, evals0: WasmFqProofEvaluations, evals1: WasmFqProofEvaluations, ft_eval1: Uint8Array, public_: Uint8Array, prev_challenges_scalars: WasmVecVecFq, prev_challenges_comms: Uint32Array);
/**
* @returns {string}
*/
  serialize(): string;
/**
*/
  commitments: WasmFqProverCommitments;
/**
*/
  evals0: WasmFqProofEvaluations;
/**
*/
  evals1: WasmFqProofEvaluations;
/**
*/
  ft_eval1: Uint8Array;
/**
*/
  prev_challenges_comms: Uint32Array;
/**
*/
  prev_challenges_scalars: WasmVecVecFq;
/**
*/
  proof: WasmFqOpeningProof;
/**
*/
  public_: Uint8Array;
}
/**
*/
export class WasmFqRandomOracles {
  free(): void;
/**
* @param {Uint8Array | undefined} joint_combiner_chal
* @param {Uint8Array | undefined} joint_combiner
* @param {Uint8Array} beta
* @param {Uint8Array} gamma
* @param {Uint8Array} alpha_chal
* @param {Uint8Array} alpha
* @param {Uint8Array} zeta
* @param {Uint8Array} v
* @param {Uint8Array} u
* @param {Uint8Array} zeta_chal
* @param {Uint8Array} v_chal
* @param {Uint8Array} u_chal
*/
  constructor(joint_combiner_chal: Uint8Array | undefined, joint_combiner: Uint8Array | undefined, beta: Uint8Array, gamma: Uint8Array, alpha_chal: Uint8Array, alpha: Uint8Array, zeta: Uint8Array, v: Uint8Array, u: Uint8Array, zeta_chal: Uint8Array, v_chal: Uint8Array, u_chal: Uint8Array);
/**
*/
  alpha: Uint8Array;
/**
*/
  alpha_chal: Uint8Array;
/**
*/
  beta: Uint8Array;
/**
*/
  gamma: Uint8Array;
/**
*/
  joint_combiner?: Uint8Array;
/**
*/
  joint_combiner_chal?: Uint8Array;
/**
*/
  u: Uint8Array;
/**
*/
  u_chal: Uint8Array;
/**
*/
  v: Uint8Array;
/**
*/
  v_chal: Uint8Array;
/**
*/
  zeta: Uint8Array;
/**
*/
  zeta_chal: Uint8Array;
}
/**
*/
export class WasmFqShifts {
  free(): void;
/**
* @param {Uint8Array} s0
* @param {Uint8Array} s1
* @param {Uint8Array} s2
* @param {Uint8Array} s3
* @param {Uint8Array} s4
* @param {Uint8Array} s5
* @param {Uint8Array} s6
*/
  constructor(s0: Uint8Array, s1: Uint8Array, s2: Uint8Array, s3: Uint8Array, s4: Uint8Array, s5: Uint8Array, s6: Uint8Array);
/**
*/
  s0: Uint8Array;
/**
*/
  s1: Uint8Array;
/**
*/
  s2: Uint8Array;
/**
*/
  s3: Uint8Array;
/**
*/
  s4: Uint8Array;
/**
*/
  s5: Uint8Array;
/**
*/
  s6: Uint8Array;
}
/**
*/
export class WasmFqSrs {
  free(): void;
}
/**
*/
export class WasmGPallas {
  free(): void;
/**
*/
  infinity: boolean;
/**
*/
  x: Uint8Array;
/**
*/
  y: Uint8Array;
}
/**
*/
export class WasmGVesta {
  free(): void;
/**
*/
  infinity: boolean;
/**
*/
  x: Uint8Array;
/**
*/
  y: Uint8Array;
}
/**
*/
export class WasmGateWires {
  free(): void;
/**
* @param {Wire} w0
* @param {Wire} w1
* @param {Wire} w2
* @param {Wire} w3
* @param {Wire} w4
* @param {Wire} w5
* @param {Wire} w6
*/
  constructor(w0: Wire, w1: Wire, w2: Wire, w3: Wire, w4: Wire, w5: Wire, w6: Wire);
/**
*/
  0: Wire;
/**
*/
  1: Wire;
/**
*/
  2: Wire;
/**
*/
  3: Wire;
/**
*/
  4: Wire;
/**
*/
  5: Wire;
/**
*/
  6: Wire;
}
/**
*/
export class WasmPallasGProjective {
  free(): void;
}
/**
* Boxed so that we don't store large proving indexes in the OCaml heap.
*/
export class WasmPastaFpPlonkIndex {
  free(): void;
}
/**
* Boxed so that we don't store large proving indexes in the OCaml heap.
*/
export class WasmPastaFqPlonkIndex {
  free(): void;
}
/**
*/
export class WasmVecVecFp {
  free(): void;
/**
* @param {number} n
*/
  constructor(n: number);
/**
* @param {Uint8Array} x
*/
  push(x: Uint8Array): void;
/**
* @param {number} i
* @returns {Uint8Array}
*/
  get(i: number): Uint8Array;
/**
* @param {number} i
* @param {Uint8Array} x
*/
  set(i: number, x: Uint8Array): void;
}
/**
*/
export class WasmVecVecFpPolyComm {
  free(): void;
/**
* @param {number} n
*/
  constructor(n: number);
/**
* @param {Uint32Array} x
*/
  push(x: Uint32Array): void;
}
/**
*/
export class WasmVecVecFq {
  free(): void;
/**
* @param {number} n
*/
  constructor(n: number);
/**
* @param {Uint8Array} x
*/
  push(x: Uint8Array): void;
/**
* @param {number} i
* @returns {Uint8Array}
*/
  get(i: number): Uint8Array;
/**
* @param {number} i
* @param {Uint8Array} x
*/
  set(i: number, x: Uint8Array): void;
}
/**
*/
export class WasmVecVecFqPolyComm {
  free(): void;
/**
* @param {number} n
*/
  constructor(n: number);
/**
* @param {Uint32Array} x
*/
  push(x: Uint32Array): void;
}
/**
*/
export class WasmVestaGProjective {
  free(): void;
}
/**
* Wire documents the other cell that is wired to this one.
* If the cell represents an internal wire, an input to the circuit,
* or a final output of the circuit, the cell references itself.
*/
export class Wire {
  free(): void;
/**
* @param {number} row
* @param {number} col
* @returns {Wire}
*/
  static create(row: number, col: number): Wire;
/**
*/
  col: number;
/**
*/
  row: number;
}
/**
*/
export class wbg_rayon_PoolBuilder {
  free(): void;
/**
* @returns {number}
*/
  numThreads(): number;
/**
* @returns {number}
*/
  receiver(): number;
/**
*/
  build(): void;
}
