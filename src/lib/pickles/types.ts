import { Bool, Field, Group, Scalar } from '../../snarky';

export type StepStatement = {
  proofState: {
    unfinalizedProofs: UnfinalizedProof[]; // length: maxBranching
    meOnly: Field;
  };
  passThrough: Field[]; // length: maxBranching
};

export type WrapStatement = {
  passThrough: Field;
  proofState: WrapProofState<Field>;
};

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
        stepDomains: ['known', stepDomains],
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
    | ['known', Domains[]] // `Known
    | ['sideLoaded', { h: Field }[]]; // `SideLoaded
  maxWidth?: [Bool, Bool, Bool, Bool];
};

export type PerProofWitness<LocalStatement> = [
  LocalStatement,
  WrapProofState<null>,
  AllEvals<Field>,
  Group[], // length: local_max_branching
  Field[][], // lengths: inner: Tick.Rounds.n, outer: local_max_branching
  WrapProof
];

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
  sg: Group[];
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

export type AllEvals<Field> = {
  evals: [EvalsWithPublicInput<Field>, EvalsWithPublicInput<Field>];
  ftEval1: Field;
};
export type EvalsWithPublicInput<Field> = {
  publicInput: Field;
  evals: Evals<Field[]>;
};
export type Evals<FieldArray> = {
  w: FieldArray[];
  z: FieldArray;
  s: FieldArray[];
  genericSelector: FieldArray;
  poseidonSelector: FieldArray;
};
