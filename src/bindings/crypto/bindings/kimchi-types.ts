/**
 * This file is a TS representation of kimchi_types.ml
 */
import type { Lookup } from './lookup.js';
import type { MlArray, MlOption, MlTuple } from '../../../lib/ml/base.js';
import type { OrInfinity } from './curve.js';
import type { Field } from './field.js';
import type {
  WasmFpSrs,
  WasmFqSrs,
} from '../../compiled/node_bindings/plonk_wasm.cjs';

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
  ProofEvaluations,
  RecursionChallenge,
  ProverProof,
  ProofWithPublic,
  LookupCommitments,
  RuntimeTableCfg,
  LookupTable,
  RuntimeTable,
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
  elems: MlArray<OrInfinity>,
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
  endomul_scalar_comm: PolyComm,
  xor_comm: MlOption<PolyComm>,
  range_check0_comm: MlOption<PolyComm>,
  range_check1_comm: MlOption<PolyComm>,
  foreign_field_add_comm: MlOption<PolyComm>,
  foreign_field_mul_comm: MlOption<PolyComm>,
  rot_comm: MlOption<PolyComm>
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
  lookup_index: MlOption<Lookup<PolyComm>>,
  zkRows: number,
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
  w_comm: MlTuple<PolyComm, 15>,
  z_comm: PolyComm,
  t_comm: PolyComm,
  lookup: MlOption<LookupCommitments>
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

type nColumns = 15;
type nPermutsMinus1 = 6;

type ProofEvaluations<Field> = [
  _: 0,
  w: MlTuple<PointEvaluations<Field>, nColumns>,
  z: PointEvaluations<Field>,
  s: MlTuple<PointEvaluations<Field>, nPermutsMinus1>,
  coefficients: MlTuple<PointEvaluations<Field>, nColumns>,
  generic_selector: PointEvaluations<Field>,
  poseidon_selector: PointEvaluations<Field>,
  complete_add_selector: PointEvaluations<Field>,
  mul_selector: PointEvaluations<Field>,
  emul_selector: PointEvaluations<Field>,
  endomul_scalar_selector: PointEvaluations<Field>,
  range_check0_selector: MlOption<PointEvaluations<Field>>,
  range_check1_selector: MlOption<PointEvaluations<Field>>,
  foreign_field_add_selector: MlOption<PointEvaluations<Field>>,
  foreign_field_mul_selector: MlOption<PointEvaluations<Field>>,
  xor_selector: MlOption<PointEvaluations<Field>>,
  rot_selector: MlOption<PointEvaluations<Field>>,
  lookup_aggregation: MlOption<PointEvaluations<Field>>,
  lookup_table: MlOption<PointEvaluations<Field>>,
  lookup_sorted: MlArray<MlOption<PointEvaluations<Field>>>,
  runtime_lookup_table: MlOption<PointEvaluations<Field>>,
  runtime_lookup_table_selector: MlOption<PointEvaluations<Field>>,
  xor_lookup_selector: MlOption<PointEvaluations<Field>>,
  lookup_gate_lookup_selector: MlOption<PointEvaluations<Field>>,
  range_check_lookup_selector: MlOption<PointEvaluations<Field>>,
  foreign_field_mul_lookup_selector: MlOption<PointEvaluations<Field>>
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

type ProofWithPublic = [
  _: 0,
  public_evals: MlOption<PointEvaluations<Field>>,
  proof: ProverProof
];

// tables

type RuntimeTableCfg = [_: 0, id: number, first_column: MlArray<Field>];

type LookupTable = [_: 0, id: number, data: MlArray<MlArray<Field>>];

type RuntimeTable = [_: 0, id: number, data: MlArray<Field>];
