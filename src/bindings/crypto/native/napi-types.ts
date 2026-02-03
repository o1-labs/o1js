import type * as napiNamespace from '../../compiled/node_bindings/kimchi_wasm.cjs';
import type {
  WasmFpDomain,
  WasmFpLookupCommitments,
  WasmFpLookupSelectors,
  WasmFpLookupVerifierIndex,
  WasmFpOpeningProof,
  WasmFpOracles,
  WasmFpPlonkVerificationEvals,
  WasmFpPlonkVerifierIndex,
  WasmFpProverCommitments,
  WasmFpProverProof,
  WasmFpRandomOracles,
  WasmFpRuntimeTable,
  WasmFpShifts,
  WasmFqDomain,
  WasmFqLookupCommitments,
  WasmFqLookupSelectors,
  WasmFqLookupVerifierIndex,
  WasmFqOpeningProof,
  WasmFqOracles,
  WasmFqPlonkVerificationEvals,
  WasmFqPlonkVerifierIndex,
  WasmFqProverCommitments,
  WasmFqProverProof,
  WasmFqRandomOracles,
  WasmFqRuntimeTable,
  WasmFqShifts,
  WasmPastaFpLookupTable,
  WasmPastaFpRuntimeTableCfg,
  WasmPastaFqLookupTable,
  WasmPastaFqRuntimeTableCfg,
  WasmVecVecFp,
  WasmVecVecFq,
  LookupInfo as WasmLookupInfo,
} from '../../compiled/node_bindings/kimchi_wasm.cjs';

export type Napi = typeof napiNamespace;

export type NapiAffine = napiNamespace.WasmGVesta | napiNamespace.WasmGPallas;
export type NapiPoint = NapiAffine;
export type NapiPoints = NapiAffine[];

export type NapiPolyComm = { unshifted: unknown; shifted?: NapiAffine | undefined };
export type PolyCommCtor = new (
  unshifted: unknown,
  shifted?: NapiAffine | undefined
) => NapiPolyComm;
export type NapiPolyComms = NapiPolyComm[];

export type NapiLookupCommitments = {
  sorted: NapiPolyComms;
  aggreg: NapiPolyComm;
  runtime?: NapiPolyComm | undefined;
};

export type NapiProverCommitments = {
  w_comm: NapiPolyComms;
  z_comm: NapiPolyComm;
  t_comm: NapiPolyComm;
  lookup?: NapiLookupCommitments | undefined;
};

export type NapiPointEvaluationsObject = {
  zeta: Uint8Array[];
  zetaOmega?: Uint8Array[];
};

export type NapiPointEvaluationsObjectOption = NapiPointEvaluationsObject | undefined;

export type NapiProofEvaluationsObject = {
  public?: NapiPointEvaluationsObject;
  w: NapiPointEvaluationsObject[];
  z: NapiPointEvaluationsObject;
  s: NapiPointEvaluationsObject[];
  coefficients: NapiPointEvaluationsObject[];
  genericSelector?: NapiPointEvaluationsObject;
  poseidonSelector?: NapiPointEvaluationsObject;
  completeAddSelector?: NapiPointEvaluationsObject;
  mulSelector?: NapiPointEvaluationsObject;
  emulSelector?: NapiPointEvaluationsObject;
  endomulScalarSelector?: NapiPointEvaluationsObject;
  rangeCheck0Selector?: NapiPointEvaluationsObjectOption;
  rangeCheck1Selector?: NapiPointEvaluationsObjectOption;
  foreignFieldAddSelector?: NapiPointEvaluationsObjectOption;
  foreignFieldMulSelector?: NapiPointEvaluationsObjectOption;
  xorSelector?: NapiPointEvaluationsObjectOption;
  rotSelector?: NapiPointEvaluationsObjectOption;
  lookupAggregation?: NapiPointEvaluationsObjectOption;
  lookupTable?: NapiPointEvaluationsObjectOption;
  lookupSorted?: NapiPointEvaluationsObjectOption[];
  runtimeLookupTable?: NapiPointEvaluationsObjectOption;
  runtimeLookupTableSelector?: NapiPointEvaluationsObjectOption;
  xorLookupSelector?: NapiPointEvaluationsObjectOption;
  lookupGateLookupSelector?: NapiPointEvaluationsObjectOption;
  rangeCheckLookupSelector?: NapiPointEvaluationsObjectOption;
  foreignFieldMulLookupSelector?: NapiPointEvaluationsObjectOption;
};

export type NapiOpeningProof = {
  lr_0: ArrayLike<NapiPoint>;
  lr_1: ArrayLike<NapiPoint>;
  delta: NapiPoint;
  z1: Uint8Array;
  z2: Uint8Array;
  sg: NapiPoint;
};

export type NapiProverProof = {
  commitments: NapiProverCommitments;
  proof: NapiOpeningProof;
  evals: unknown;
  ft_eval1: Uint8Array;
  public_: Uint8Array;
  prev_challenges_scalars: NapiVecVec;
  prev_challenges_comms: ArrayLike<NapiPolyComm>;
};

export type NapiRuntimeTable = WasmFpRuntimeTable | WasmFqRuntimeTable;
export type NapiRuntimeTableCfg = WasmPastaFpRuntimeTableCfg | WasmPastaFqRuntimeTableCfg;
export type NapiLookupTable = WasmPastaFpLookupTable | WasmPastaFqLookupTable;
export type NapiVecVec = WasmVecVecFp | WasmVecVecFq;

export type NapiProofClasses = {
  ProverCommitments: typeof WasmFpProverCommitments | typeof WasmFqProverCommitments;
  OpeningProof: typeof WasmFpOpeningProof | typeof WasmFqOpeningProof;
  VecVec: typeof WasmVecVecFp | typeof WasmVecVecFq;
  ProverProof: typeof WasmFpProverProof | typeof WasmFqProverProof;
  LookupCommitments: typeof WasmFpLookupCommitments | typeof WasmFqLookupCommitments;
  RuntimeTable: typeof WasmFpRuntimeTable | typeof WasmFqRuntimeTable;
  RuntimeTableCfg: typeof WasmPastaFpRuntimeTableCfg | typeof WasmPastaFqRuntimeTableCfg;
  LookupTable: typeof WasmPastaFpLookupTable | typeof WasmPastaFqLookupTable;
};

export type NapiOracles = WasmFpOracles | WasmFqOracles;
export type NapiRandomOracles = WasmFpRandomOracles | WasmFqRandomOracles;
export type NapiOraclesClasses = {
  RandomOracles: typeof WasmFpRandomOracles | typeof WasmFqRandomOracles;
  Oracles: typeof WasmFpOracles | typeof WasmFqOracles;
};

export type NapiDomainObject = { log_size_of_group: number; group_gen: Uint8Array };
export type NapiDomain = WasmFpDomain | WasmFqDomain | NapiDomainObject;
export type NapiVerificationEvals = WasmFpPlonkVerificationEvals | WasmFqPlonkVerificationEvals;
export type NapiShifts = WasmFpShifts | WasmFqShifts;
export type NapiVerifierIndex = WasmFpPlonkVerifierIndex | WasmFqPlonkVerifierIndex;
export type NapiLookupVerifierIndex = WasmFpLookupVerifierIndex | WasmFqLookupVerifierIndex;

export type NapiVerificationEvalsShape = {
  sigma_comm: NapiPolyComms;
  coefficients_comm: NapiPolyComms;
  generic_comm: NapiPolyComm;
  psm_comm: NapiPolyComm;
  complete_add_comm: NapiPolyComm;
  mul_comm: NapiPolyComm;
  emul_comm: NapiPolyComm;
  endomul_scalar_comm: NapiPolyComm;
  xor_comm?: NapiPolyComm | undefined;
  range_check0_comm?: NapiPolyComm | undefined;
  range_check1_comm?: NapiPolyComm | undefined;
  foreign_field_add_comm?: NapiPolyComm | undefined;
  foreign_field_mul_comm?: NapiPolyComm | undefined;
  rot_comm?: NapiPolyComm | undefined;
};

export type NapiLookupSelectorShape = {
  lookup?: NapiPolyComm | undefined;
  xor?: NapiPolyComm | undefined;
  range_check?: NapiPolyComm | undefined;
  rangeCheck?: NapiPolyComm | undefined;
  ffmul?: NapiPolyComm | undefined;
};

export type NapiLookupSelector =
  | NapiLookupSelectorShape
  | WasmFpLookupSelectors
  | WasmFqLookupSelectors;

export type { WasmLookupInfo };

export type NapiLookupVerifierIndexShape = {
  joint_lookup_used: boolean;
  lookup_table: NapiPolyComms;
  lookup_selectors: NapiLookupSelectorShape;
  table_ids?: NapiPolyComm | undefined;
  lookup_info: WasmLookupInfo;
  runtime_tables_selector?: NapiPolyComm | undefined;
};

export type NapiShiftsShape = {
  s0: Uint8Array;
  s1: Uint8Array;
  s2: Uint8Array;
  s3: Uint8Array;
  s4: Uint8Array;
  s5: Uint8Array;
  s6: Uint8Array;
};

export type NapiVerifierIndexShape = {
  domain: NapiDomain;
  max_poly_size: number;
  public_: number;
  prev_challenges: number;
  srs: WasmFpPlonkVerifierIndex['srs'] | WasmFqPlonkVerifierIndex['srs'];
  evals: NapiVerificationEvals;
  shifts: NapiShifts;
  lookup_index?: NapiLookupVerifierIndex;
  zk_rows: number;
};

export type NapiVerifierIndexClasses = {
  Domain: typeof WasmFpDomain | typeof WasmFqDomain;
  VerificationEvals: typeof WasmFpPlonkVerificationEvals | typeof WasmFqPlonkVerificationEvals;
  Shifts: typeof WasmFpShifts | typeof WasmFqShifts;
  VerifierIndex: typeof WasmFpPlonkVerifierIndex | typeof WasmFqPlonkVerifierIndex;
  LookupVerifierIndex: typeof WasmFpLookupVerifierIndex | typeof WasmFqLookupVerifierIndex;
  LookupSelector: typeof WasmFpLookupSelectors | typeof WasmFqLookupSelectors;
};

export type NapiCoreClasses = {
  CommitmentCurve: typeof napiNamespace.WasmGVesta | typeof napiNamespace.WasmGPallas;
  makeAffine: () => NapiAffine;
  PolyComm: typeof napiNamespace.WasmFpPolyComm | typeof napiNamespace.WasmFqPolyComm;
};
