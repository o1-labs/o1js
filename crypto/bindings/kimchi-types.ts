/**
 * This file is a TS representation of kimchi_types.ml
 */
import type { Lookup } from './lookup.js';
import type { MlArray, MlOption } from '../../../lib/ml/base.js';
import type { OrInfinity } from './curve.js';
import type { Field } from './field.js';
import type {
  WasmFpSrs,
  WasmFqSrs,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type { MlTupleN } from './util.js';

export {
  Field,
  OrInfinity,
  Wire,
  Gate,
  PolyComm,
  Domain,
  VerificationEvals,
  VerifierIndex,
  ScalarChallenge,
  RandomOracles,
  Oracles,
  ProverCommitments,
  OpeningProof,
  PointEvaluations,
  LookupEvaluations,
  ProofEvaluations,
  RecursionChallenge,
  ProverProof,
};

// wasm types

type WasmSrs = WasmFpSrs | WasmFqSrs;

// ml types from kimchi_types.ml

type GateType = number;
type Wire = [_: 0, row: number, col: number];
type Gate = [
  _: 0,
  typ: GateType,
  wires: [0, Wire, Wire, Wire, Wire, Wire, Wire, Wire],
  coeffs: MlArray<Field>
];

type PolyComm = [
  _: 0,
  unshifted: MlArray<OrInfinity>,
  shifted: MlOption<OrInfinity>
];

// verifier index

type Domain = [_: 0, log_size_of_group: number, group_gen: Field];

type VerificationEvals = [
  _: 0,
  sigma_comm: MlArray<PolyComm>,
  coefficients_comm: MlArray<PolyComm>,
  generic_comm: PolyComm,
  psm_comm: PolyComm,
  complete_add_comm: PolyComm,
  mul_comm: PolyComm,
  emul_comm: PolyComm,
  endomul_scalar_comm: PolyComm
];

type VerifierIndex = [
  _: 0,
  domain: Domain,
  max_poly_size: number,
  public_: number,
  prev_challenges: number,
  srs: WasmSrs,
  evals: VerificationEvals,
  shifts: MlArray<Field>,
  lookup_index: MlOption<Lookup<PolyComm>>
];

// oracles

type ScalarChallenge = [_: 0, inner: Field];
type RandomOracles = [
  _: 0,
  joint_combiner: MlOption<[0, ScalarChallenge, Field]>,
  beta: Field,
  gamma: Field,
  alpha_chal: ScalarChallenge,
  alpha: Field,
  zeta: Field,
  v: Field,
  u: Field,
  zeta_chal: ScalarChallenge,
  v_chal: ScalarChallenge,
  u_chal: ScalarChallenge
];
type Oracles = [
  _: 0,
  o: RandomOracles,
  p_eval: [0, Field, Field],
  opening_prechallenges: MlArray<Field>,
  digest_before_evaluations: Field
];

// proof

type LookupCommitments = [
  _: 0,
  sorted: MlArray<PolyComm>,
  aggreg: PolyComm,
  runtime: MlOption<PolyComm>
];
type ProverCommitments = [
  _: 0,
  w_comm: MlTupleN<PolyComm, 15>,
  z_comm: PolyComm,
  t_comm: PolyComm,
  lookup: LookupCommitments
];
type OpeningProof = [
  _: 0,
  lr: MlArray<[0, OrInfinity, OrInfinity]>,
  delta: OrInfinity,
  z1: Field,
  z2: Field,
  sg: OrInfinity
];
type PointEvaluations<Field> = [
  _: 0,
  zeta: MlArray<Field>,
  zeta_omega: MlArray<Field>
];
type LookupEvaluations<Field> = [
  _: 0,
  sorted: MlArray<PointEvaluations<Field>>,
  aggreg: PointEvaluations<Field>,
  table: PointEvaluations<Field>,
  runtime: MlOption<PointEvaluations<Field>>
];
type nColumns = 15;
type nPermutsMinus1 = 6;
type ProofEvaluations<Field> = [
  _: 0,
  w: MlTupleN<PointEvaluations<Field>, nColumns>,
  z: PointEvaluations<Field>,
  s: MlTupleN<PointEvaluations<Field>, nPermutsMinus1>,
  coefficients: MlTupleN<PointEvaluations<Field>, nColumns>,
  lookup: MlOption<LookupEvaluations<Field>>,
  generic_selector: PointEvaluations<Field>,
  poseidon_selector: PointEvaluations<Field>
];
type RecursionChallenge = [_: 0, chals: MlArray<Field>, comm: PolyComm];

type ProverProof = [
  _: 0,
  commitments: ProverCommitments,
  proof: OpeningProof,
  evals: ProofEvaluations<Field>,
  ft_eval1: Field,
  public_: MlArray<Field>,
  prev_challenges: MlArray<RecursionChallenge>
];
