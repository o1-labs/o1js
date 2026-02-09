import type * as napiNamespace from '../../compiled/node_bindings/kimchi_wasm.cjs';
import type {
  WasmFpDomain as NapiFpDomain,
  WasmFpLookupCommitments as NapiFpLookupCommitments,
  WasmFpLookupSelectors as NapiFpLookupSelectors,
  WasmFpLookupVerifierIndex as NapiFpLookupVerifierIndex,
  WasmFpOpeningProof as NapiFpOpeningProof,
  WasmFpOracles as NapiFpOracles,
  WasmFpPlonkVerificationEvals as NapiFpPlonkVerificationEvals,
  WasmFpPlonkVerifierIndex as NapiFpPlonkVerifierIndex,
  WasmFpPolyComm as NapiFpPolyComm,
  WasmFpProverCommitments as NapiFpProverCommitments,
  WasmFpProverProof as NapiFpProverProof,
  WasmFpRandomOracles as NapiFpRandomOracles,
  WasmFpRuntimeTable as NapiFpRuntimeTable,
  WasmFpShifts as NapiFpShifts,
  WasmFpSrs as NapiFpSrs,
  WasmFqDomain as NapiFqDomain,
  WasmFqLookupCommitments as NapiFqLookupCommitments,
  WasmFqLookupSelectors as NapiFqLookupSelectors,
  WasmFqLookupVerifierIndex as NapiFqLookupVerifierIndex,
  WasmFqOpeningProof as NapiFqOpeningProof,
  WasmFqOracles as NapiFqOracles,
  WasmFqPlonkVerificationEvals as NapiFqPlonkVerificationEvals,
  WasmFqPlonkVerifierIndex as NapiFqPlonkVerifierIndex,
  WasmFqPolyComm as NapiFqPolyComm,
  WasmFqProverCommitments as NapiFqProverCommitments,
  WasmFqProverProof as NapiFqProverProof,
  WasmFqRandomOracles as NapiFqRandomOracles,
  WasmFqRuntimeTable as NapiFqRuntimeTable,
  WasmFqShifts as NapiFqShifts,
  WasmFqSrs as NapiFqSrs,
  LookupInfo as NapiLookupInfo,
  WasmPastaFpLookupTable as NapiPastaFpLookupTable,
  WasmPastaFpRuntimeTableCfg as NapiPastaFpRuntimeTableCfg,
  WasmPastaFqLookupTable as NapiPastaFqLookupTable,
  WasmPastaFqRuntimeTableCfg as NapiPastaFqRuntimeTableCfg,
  WasmVecVecFp as NapiVecVecFp,
  WasmVecVecFq as NapiVecVecFq,
} from '../../compiled/node_bindings/kimchi_wasm.cjs';

export type Napi = typeof napiNamespace;

export type NapiAffine = napiNamespace.WasmGVesta | napiNamespace.WasmGPallas;
export type NapiPoint = NapiAffine;
export type NapiPoints = NapiAffine[];

export type NapiPolyComm = NapiFpPolyComm | NapiFqPolyComm;
export type PolyCommCtor = new (
  unshifted: ArrayLike<NapiAffine>,
  shifted?: NapiAffine | undefined
) => NapiPolyComm;
export type NapiPolyComms = NapiPolyComm[];

export type NapiSrs = NapiFpSrs | NapiFqSrs;

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
  evals: NapiProofEvaluationsObject;
  ft_eval1: Uint8Array;
  public_: Uint8Array;
  prev_challenges_scalars: NapiVecVec;
  prev_challenges_comms: ArrayLike<NapiPolyComm>;
};

export type NapiRuntimeTable = NapiFpRuntimeTable | NapiFqRuntimeTable;
export type NapiRuntimeTableCfg = NapiPastaFpRuntimeTableCfg | NapiPastaFqRuntimeTableCfg;
export type NapiLookupTable = NapiPastaFpLookupTable | NapiPastaFqLookupTable;
export type NapiVecVec = NapiVecVecFp | NapiVecVecFq;

export type NapiOracles = NapiFpOracles | NapiFqOracles;
export type NapiRandomOracles = NapiFpRandomOracles | NapiFqRandomOracles;

export type NapiDomainObject = { log_size_of_group: number; group_gen: Uint8Array };
export type NapiDomain = NapiFpDomain | NapiFqDomain | NapiDomainObject;
export type NapiVerificationEvals = NapiFpPlonkVerificationEvals | NapiFqPlonkVerificationEvals;
export type NapiShifts = NapiFpShifts | NapiFqShifts;
export type NapiVerifierIndex = NapiFpPlonkVerifierIndex | NapiFqPlonkVerifierIndex;
export type NapiLookupVerifierIndex = NapiFpLookupVerifierIndex | NapiFqLookupVerifierIndex;

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
  ffmul?: NapiPolyComm | undefined;
};

export type NapiLookupSelector =
  | NapiLookupSelectorShape
  | NapiFpLookupSelectors
  | NapiFqLookupSelectors;

export type { NapiLookupInfo };

export type NapiLookupVerifierIndexShape = {
  joint_lookup_used: boolean;
  lookup_table: NapiPolyComms;
  lookup_selectors: NapiLookupSelectorShape;
  table_ids?: NapiPolyComm | undefined;
  lookup_info: NapiLookupInfo;
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
  srs: NapiFpPlonkVerifierIndex['srs'] | NapiFqPlonkVerifierIndex['srs'];
  evals: NapiVerificationEvalsShape;
  shifts: NapiShiftsShape;
  lookup_index?: NapiLookupVerifierIndexShape;
  zk_rows: number;
};

export type NapiCoreClasses = {
  makeAffine: () => NapiAffine;
  PolyComm: typeof napiNamespace.WasmFpPolyComm | typeof napiNamespace.WasmFqPolyComm;
};

export type NapiProofClasses = {
  ProverCommitments: typeof NapiFpProverCommitments | typeof NapiFqProverCommitments;
  OpeningProof: typeof NapiFpOpeningProof | typeof NapiFqOpeningProof;
  VecVec: typeof NapiVecVecFp | typeof NapiVecVecFq;
  ProverProof: typeof NapiFpProverProof | typeof NapiFqProverProof;
  LookupCommitments: typeof NapiFpLookupCommitments | typeof NapiFqLookupCommitments;
  RuntimeTable: typeof NapiFpRuntimeTable | typeof NapiFqRuntimeTable;
  RuntimeTableCfg: typeof NapiPastaFpRuntimeTableCfg | typeof NapiPastaFqRuntimeTableCfg;
  LookupTable: typeof NapiPastaFpLookupTable | typeof NapiPastaFqLookupTable;
};

export type NapiVerifierIndexClasses = {
  Domain: typeof NapiFpDomain | typeof NapiFqDomain;
  VerificationEvals: typeof NapiFpPlonkVerificationEvals | typeof NapiFqPlonkVerificationEvals;
  Shifts: typeof NapiFpShifts | typeof NapiFqShifts;
  VerifierIndex: typeof NapiFpPlonkVerifierIndex | typeof NapiFqPlonkVerifierIndex;
  LookupVerifierIndex: typeof NapiFpLookupVerifierIndex | typeof NapiFqLookupVerifierIndex;
  LookupSelector: typeof NapiFpLookupSelectors | typeof NapiFqLookupSelectors;
};

export type NapiOraclesClasses = {
  RandomOracles: typeof NapiFpRandomOracles | typeof NapiFqRandomOracles;
  Oracles: typeof NapiFpOracles | typeof NapiFqOracles;
};
