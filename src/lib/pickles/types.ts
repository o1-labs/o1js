import { Bool, Field, Group, Scalar } from '../../snarky';

export type PlonkVerificationEvals<G> = {
  sigmaComm: G[];
  coefficientsComm: G[];
  genericComm: G;
  psmComm: G;
  completeAddComm: G;
  mulComm: G;
  emulComm: G;
  endomulScalarComm: G;
};

type SideLoaded<A> = unknown;

export let typesMap = {
  forStep: {
    ofCompiled<A>({
      typ,
      branches,
      branchings,
      maxBranching,
      stepDomains,
      valueToFieldElements,
      wrapDomains,
      wrapKey,
    }: Compiled<A>): ForStep<A> {
      return {
        branches,
        maxBranching,
        branchings: branchings.map(Field),
        stepDomains,
        typ,
        valueToFieldElements,
        wrapDomains,
        wrapKey: wrapKey(),
        maxWidth: undefined,
      };
    },
    ofSideLoaded<A>(thing: SideLoaded<A>): ForStep<A> {
      return thing as never; // TODO
    },
  },
  compiledTable: {},
  sideLoadedTable: {},
  lookupCompiled(id: string) {
    return this.compiledTable[id];
  },
  lookupSideLoaded(id: string) {
    return this.sideLoadedTable[id];
  },
};

type StepTyp<A> = unknown;
type Domains = { h: number; x: number };
export type ForStep<A> = {
  branches: number;
  maxBranching: number;
  branchings: Field[]; // length: branches
  typ: StepTyp<A>;
  valueToFieldElements: (value: A) => Field[];
  // varToFieldElements : (value: A) => Field[]; // I think vars and values should be the same in JS
  wrapKey: PlonkVerificationEvals<Group>;
  wrapDomains: Domains;
  stepDomains:
    | Domains[] // `Known
    | { h: Field }[]; // `SideLoaded
  maxWidth?: [Bool, Bool, Bool, Bool];
};

// TODO
// type ('local_statement, 'local_max_branching, 'local_num_branches) t =
//   'local_statement
//   * ( Challenge.Make(Impl).t
//     , Challenge.Make(Impl).t Scalar_challenge.t
//     , Impl.Field.t Shifted_value.Type1.t
//     , Step_verifier.Make(Step_main_inputs).Other_field.t
//     , unit
//     , Digest.Make(Impl).t
//     , Challenge.Make(Impl).t Scalar_challenge.t Types.Bulletproof_challenge.t
//       Types.Step_bp_vec.t
//     , 'local_num_branches One_hot_vector.t )
//     Types.Wrap.Proof_state.In_circuit.t
//   * (Impl.Field.t, Impl.Field.t array) Plonk_types.All_evals.t
//   * (Step_main_inputs.Inner_curve.t, 'local_max_branching) Vector.t
//   * ((Impl.Field.t, Tick.Rounds.n) Vector.t, 'local_max_branching) Vector.t
//   * Wrap_proof.var
export type PerProofWitness = [
  LocalStatement,
  WrapProofState<null>,
  Group[] /* length: local_max_branching */,
  AllEvals,
  Field[][] /* lengths: inner: Tick.Rounds.n, outer: local_max_branching */,
  WrapProof
];
type LocalStatement = unknown;

export type WrapProofState<MeOnly extends null | Field> = {
  deferredValues: {
    plonk: DeferredValuesPlonk<Field, Field>;
    combinedInnerProduct: Field;
    b: Field;
    xi: { inner: Field };
    bulletproofChallenges: { prechallenge: { inner: Field } }[]; // length: Tick.Rounds.n
    whichBranch: Bool[]; // length: local_num_branches
  };
  spongeDigestBeforeEvaluations: Field;
  meOnly: MeOnly;
};

type AllEvals = unknown;

export type WrapProof = [
  { lr: [Group, Group][]; z1: Scalar; z2: Scalar; delta: Group; sg: Group },
  {
    wComm: Group[][]; // outer length: 15
    zComm: Group[];
    tComm: Group[];
  }
];

export type WrapPassThrough<A> = {
  appState: A;
  dlogPlonkIndex: PlonkVerificationEvals<Group>;
  sg: AllEvals;
  oldBulletproofChallenges: Field[][];
};
export type StepMeOnly<A> = WrapPassThrough<A>;

export type CompiledBasic<A> = {
  typ: StepTyp<A>;
  // For each branch in this rule, how many predecessor proofs does it have?
  branchings: number[];
  valueToFieldElements: (value: A) => Field[];
  wrapDomains: Domains;
  stepDomains: Domains[];
};

// This is the data associated to an inductive proof system with statement type
// ['a_var], which has ['branches] many "variants" each of which depends on at most
// ['max_branching] many previous statements.
export type Compiled<A> = {
  typ: StepTyp<A>;
  // For each branch in this rule, how many predecessor proofs does it have?
  branchings: number[];
  branches: number;
  maxBranching: number;
  valueToFieldElements: (value: A) => Field[];
  wrapDomains: Domains;
  stepDomains: Domains[];
  wrapKey: () => PlonkVerificationEvals<Group>; // this has Tick.Inner_curve.Affine.t, but I think we should collapse the different curve types into one
  wrapVk: () => WrapVerificationKey;
};

type WrapVerificationKey = unknown;

export type DeferredValuesPlonk<Field, Scalar> = {
  alpha: { inner: Field };
  beta: Field;
  gamma: Field;
  zeta: { inner: Field };
  zetaToSrsLength: Scalar;
  zetaToDomainSize: Scalar;
  poseidonSelector: Scalar;
  vbmul: Scalar;
  completeAdd: Scalar;
  endomul: Scalar;
  endomulScalar: Scalar;
  perm: Scalar;
  generic: Scalar[]; // length: 9
};

export type UnfinalizedProof = {
  deferredValues: {
    plonk: DeferredValuesPlonk<Field, Scalar>;
    combinedInnerProduct: Scalar; // I think we can leave the representation of Scalar unexposed
    xi: { inner: Field }; // this is ScalarChallenge, the wrapping object seems useless though
    bulletproofChallenges: { prechallenge: { inner: Field } }[]; // BulletproofChallenge[]. length: Tock.Rounds.n
    b: Scalar;
  };
  shouldFinalize: Bool;
  spongeDigestBeforeEvaluations: Field;
};
