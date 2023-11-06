use ark_ec::short_weierstrass_jacobian::GroupAffine;
use ark_ff::{UniformRand, Zero};
use groupmap::GroupMap;
use js_sys::Uint8Array;
use kimchi::circuits::polynomial::COLUMNS;
use kimchi::circuits::polynomials::generic::testing::create_circuit;
use kimchi::circuits::polynomials::generic::testing::fill_in_witness;
use kimchi::poly_commitment::pairing_proof::{PairingProof, PairingSRS};
use kimchi::proof::ProverProof;
use kimchi::prover_index::testing::new_index_for_test_with_lookups;
use kimchi::snarky::{Constants, SnarkyConstraintSystem};
use mina_poseidon::{
    constants::PlonkSpongeConstantsKimchi,
    sponge::{DefaultFqSponge, DefaultFrSponge},
};
use poly_commitment::commitment::CommitmentCurve;
use std::array;
use wasm_bindgen::prelude::*;

type BN254 = GroupAffine<ark_bn254::g1::Parameters>;
type Proof = PairingProof<ark_ec::bn::Bn<ark_bn254::Parameters>>;

type EFqSponge = DefaultFqSponge<BN254Parameters, PlonkSpongeConstantsKimchi>;
type EFrSponge = DefaultFrSponge<Fp, PlonkSpongeConstantsKimchi>;

enum CVar {
    Var(i32)
}

#[wasm_bindgen]
pub fn wasm_bn254_plonk_proof_create() -> Result<Uint8Array, JsError> {
    let gates = create_circuit(0, 0);

    // create witness
    let mut witness: [Vec<Fp>; COLUMNS] = array::from_fn(|_| vec![Fp::zero(); gates.len()]);
    fill_in_witness(0, &mut witness, &[]);

    let x = Fp::rand(&mut rand::rngs::OsRng);
    let prover = new_index_for_test_with_lookups(gates, 0, 0, vec![], None, true);
    let public_inputs = vec![];

    prover.verify(&witness, &public_inputs).unwrap();

    let group_map = <BN254 as CommitmentCurve>::Map::setup();

    let proof = ProverProof::create_recursive::<EFqSponge, EFrSponge>(
        &group_map,
        witness,
        &[],
        &prover,
        vec![],
        None,
    )
    .map_err(|_| JsError::new("Could not create KZG proof"))?;

    let verifier_index = prover.verifier_index();
    let srs = (**verifier_index.srs()).clone();
    let rmp_srs = rmp_serde::to_vec(&srs).map_err(|_| JsError::new("Could not serialize SRS"))?;

    Ok(rmp_srs.as_slice().into())
}

/**
 * `Pickles.Impls.Step.r1cs_h`
 * See https://github.com/o1-labs/snarky/blob/94b2df82129658d505b612806a5804bc192f13f0/src/base/runners.ml#L225
 */
fn r1cs_h(next_input: &mut i32) -> SnarkyConstraintSystem<BN254> {
    let (retval, checked) = collect_input_constraints(next_input);
    
    // Add run_to_run
    
    create_constraint_system(next_input, retval, checked)
}

/**
 * `Pickles.Impls.Step.collect_input_constraints`
 * See https://github.com/o1-labs/snarky/blob/94b2df82129658d505b612806a5804bc192f13f0/src/base/runners.ml#L189
 */
fn collect_input_constraints(next_input: &mut i32) -> (BN254, /* ??? */) {
    let var = alloc_input(/* input_typ */);
    let retval = alloc_input(/* return_typ */);
    let circuit = /* TODO */

    (retval, circuit)
}

/**
 * `Pickles.Impls.Step.collect_input_constraints`
 * See https://github.com/o1-labs/snarky/blob/94b2df82129658d505b612806a5804bc192f13f0/src/base/runners.ml#L204
 */
fn alloc_input(next_input: &mut i32) -> BN254 {
    const SIZE_IN_FIELD_ELEMENTS = 1;
    let fields: [_; SIZE_IN_FIELD_ELEMENTS] = std::array::from_fn(|i| alloc_var(next_input));
    
    var_of_fields(&fields)
}

/**
 * `Pickles.Impls.Step.alloc_var`
 * See https://github.com/o1-labs/snarky/blob/94b2df82129658d505b612806a5804bc192f13f0/src/base/runners.ml#L180
 */
fn alloc_var(next_input: &mut i32) -> CVar {
    let v = next_input.clone();
    *next_input += 1;

    CVar::Var(v)
}

/**
 * `Pickles.Impls.Step.Typ.T.field.var_of_fields`
 * See https://github.com/o1-labs/snarky/blob/94b2df82129658d505b612806a5804bc192f13f0/src/base/typ.ml#L138
 */
fn var_of_fields(fields: &[BN254]) -> BN254 {
    fields[0]
}

/**
 * `Pickles.Impls.Step.constraint_system`
 * See https://github.com/o1-labs/snarky/blob/94b2df82129658d505b612806a5804bc192f13f0/src/base/runners.ml#L48
 */
fn create_constraint_system(num_inputs: &i32, output, t) -> SnarkyConstraintSystem<BN254> {
    let constants = Constants::new();
    let mut cs = SnarkyConstraintSystem::create(constants);
    let next_auxiliary = num_inputs.clone();
    cs.set_public_input_size(num_inputs);
    let auxiliary_input_size = next_auxiliary - num_inputs;
    cs.set_auxiliary_input_size(auxiliary_input_size);

    cs
}
