import { Bool, Field, Group, Poseidon, PoseidonSponge } from '../../snarky';
import {
  AllEvals,
  ForStep,
  PerProofWitness,
  PlonkVerificationEvals,
  StepMeOnly,
  UnfinalizedProof,
  WrapProof,
  WrapProofState,
  WrapStatement,
} from './types';

export { verifyOne, hashMeOnly };

function verifyOne<A>({
  proof,
  data,
  passThrough,
  unfinalizedProof,
  shouldVerify,
}: {
  proof: PerProofWitness<A>;
  data: ForStep<A>;
  passThrough: Field;
  unfinalizedProof: UnfinalizedProof;
  shouldVerify: Bool;
}): [Field[], Bool] {
  let [
    appState,
    state,
    prevEvals,
    sgOld,
    oldBulletproofChallenges,
    [opening, messages],
  ] = proof;
  shouldVerify.assertEquals(unfinalizedProof.shouldFinalize);
  let sponge = new Poseidon.Sponge();
  sponge.absorb(state.spongeDigestBeforeEvaluations);

  let { maxBranching, maxWidth, branchings: stepWidths, stepDomains } = data;
  let [finalized, challenges] = finalizeOtherProof({
    maxBranching,
    maxWidth,
    stepWidths,
    stepDomains,
    sponge,
    oldBulletproofChallenges,
    deferredValues: state.deferredValues,
    prevEvals,
  });
  let whichBranch = state.deferredValues.whichBranch;
  let whichBranchNew = Pseudo.choose(
    whichBranch,
    range(data.branches).map(Field),
    (x) => x
  )
    // TODO understand whether this is doing the same as Field.unpack
    .toBits()
    .slice(8);
  // TODO: can we use the simpler mutating version here?
  // state.deferredValues.whichBranch = whichBranchNew;
  state = {
    ...state,
    deferredValues: { ...state.deferredValues, whichBranch: whichBranchNew },
  };
  // TODO this is not properly implemented yet
  let hash = hashMeOnlyOpt(data.wrapKey, data.valueToFieldElements);
  let prevMeOnly = hash(
    {
      appState,
      dlogPlonkIndex: data.wrapKey,
      sg: sgOld,
      oldBulletproofChallenges,
    },
    { widths: data.branchings, maxWidth: maxBranching, whichBranch }
  );
  let statement: WrapStatement = {
    passThrough: prevMeOnly,
    proofState: { ...state, meOnly: passThrough },
  };
  let verified = verify(statement, unfinalizedProof, {
    branching: data.maxBranching,
    wrapDomain: data.wrapDomains.h,
    isBaseCase: shouldVerify.not(),
    sgOld,
    opening,
    messages,
    wrapVerificationKey: data.wrapKey,
  });
  // TODO maybe add debug logic here
  // (chals, Boolean.(verified &&& finalized ||| not should_verify))
  return [challenges, verified.and(finalized).or(shouldVerify.not())];
}

function verify(
  statement: WrapStatement,
  unfinalizedProof: UnfinalizedProof,
  {}: {
    branching: number;
    wrapDomain: number;
    isBaseCase: Bool;
    sgOld: Group[];
    opening: WrapProof[0];
    messages: WrapProof[1];
    wrapVerificationKey: PlonkVerificationEvals<Group>;
  }
): Bool {
  return 'TODO';
}

function getShifts(log2Size: number): Field[] {
  throw Error('unimplemented');
}
function getDomainGenerator(log2Size: number): Field {
  throw Error('unimplemented');
}

let NUMSHIFTS = 7; // # permutation columns

function finalizeOtherProof({
  maxBranching,
  maxWidth,
  stepWidths,
  stepDomains: stepDomains_,
  sponge,
  oldBulletproofChallenges,
  deferredValues: {
    xi,
    combinedInnerProduct,
    bulletproofChallenges,
    whichBranch,
    b,
    plonk,
  },
  prevEvals: {
    ftEval1,
    evals: [
      { evals: evals1, publicInput: xHat1 },
      { evals: evals2, publicInput: xHat2 },
    ],
  },
}: {
  maxBranching: number;
  maxWidth: [Bool, Bool, Bool, Bool];
  stepWidths: Field[];
  stepDomains: ForStep<unknown>['stepDomains'];
  sponge: PoseidonSponge;
  oldBulletproofChallenges: Field[][];
  deferredValues: WrapProofState<null>['deferredValues'];
  prevEvals: AllEvals<Field>;
}): [Bool, Field[]] {
  let stepDomains:
    | ['known', { h: number; x: number }[]]
    | ['sideLoaded', unknown];
  let inputDomain: {
    size: Field;
    shifts: Field[];
    generator: Field;
    vanishingPolynomial: (x: Field) => Field;
  };
  if (stepDomains_[0] === 'known') {
    let [, domains] = stepDomains_;
    stepDomains = stepDomains_;
    // inlined because it's only used once
    // Pseudo.Domain.to_domain ~shifts ~domain_generator
    //   (which_branch, Vector.map domains ~f:Domains.x) )
    let log2Sizes = domains.map((d) => d.x);
    let size = Pseudo.choose(whichBranch, log2Sizes, (d) =>
      Field(1 << d)
    ).seal();
    // let shifts = shifts (fst t, log2_sizes) ~shifts:s in
    let shiftss = log2Sizes.map(getShifts);
    let shifts = Array(NUMSHIFTS)
      .fill(0)
      .map((_, i) =>
        Pseudo.mask(
          whichBranch,
          shiftss.map((a) => a[i])
        )
      );
    // let generator = generator (fst t, log2_sizes) ~domain_generator in
    let generator = Pseudo.mask(whichBranch, log2Sizes.map(getDomainGenerator));
    let maxLog2 = Math.max(...log2Sizes);
    let vanishingPolynomial = (x: Field) => {
      let pow2Pows = [x];
      for (let i = 1; i <= maxLog2; i++) {
        pow2Pows[i] = pow2Pows[i - 1].square();
      }
      return Pseudo.choose(whichBranch, log2Sizes, (d) => pow2Pows[d - 1]);
    };
    inputDomain = { size, shifts, generator, vanishingPolynomial };
  } else {
    let [, domains] = stepDomains_;
    throw Error('side loaded domains not implemented');
  }
  let actualWidth = Pseudo.mask(whichBranch, stepWidths);
  // You use the NEW bulletproof challenges to check b. Not the old ones.
  [
    [xHat1],
    evals1.z,
    evals1.genericSelector,
    evals1.poseidonSelector,
    ...evals1.w,
    ...evals1.s,
  ]
    .flat()
    .forEach((x) => sponge.absorb(x));
  [
    [xHat2],
    evals2.z,
    evals2.genericSelector,
    evals2.poseidonSelector,
    ...evals2.w,
    ...evals2.s,
  ]
    .flat()
    .forEach((x) => sponge.absorb(x));
  sponge.absorb(ftEval1);
  let xiActual = lowest128Bits(sponge.squeeze());
  let rActual = lowest128Bits(sponge.squeeze());
  let xiCorrect = xiActual.equals(xi.inner);
  // the rest of this function depends on understanding ScalarChallenge
  return 'TODO';
}

// 2^n
function pow2(n: number) {
  let p = Field.one;
  for (let i = 0; i < n; i++) {
    p = p.add(p);
  }
  return p;
}

function lowest128Bits(x: Field) {
  // TODO is this correct and efficient?
  return Field.ofBits(x.toBits().slice(128));
}

// <> => _
function hashMeOnly<A>(
  index: PlonkVerificationEvals<Group>,
  stateToFields: (s: A) => Field[]
) {
  let afterIndex = new Poseidon.Sponge();
  for (let x of indexToFields(index)) {
    afterIndex.absorb(x);
  }
  return function hash(meOnly: StepMeOnly<A>) {
    let sponge = afterIndex.copy();
    for (let x of meOnlyToFieldsWithoutIndex(meOnly, stateToFields)) {
      sponge.absorb(x);
    }
    return sponge.squeeze();
  };
}
function hashMeOnlyOpt<A>(
  index: PlonkVerificationEvals<Group>,
  stateToFields: (s: A) => Field[]
) {
  let afterIndex = new Poseidon.Sponge();
  for (let x of indexToFields(index)) {
    afterIndex.absorb(x);
  }
  // TODO implement or expose Optsponge
  let hash0 = hashMeOnly(index, stateToFields);
  return function hash(
    meOnly: StepMeOnly<A>,
    {
      widths,
      maxWidth,
      whichBranch,
    }: { widths: Field[]; maxWidth: number; whichBranch: Bool[] }
  ): Field {
    // TODO
    return hash0(meOnly);
    let firstZero = Pseudo.choose(whichBranch, widths, (x) => x);
    let mask = onesVector(maxWidth, firstZero);
    let sponge = afterIndex.copy();
    const OPT = 1;
    const NOT_OPT = 0;
    let oldBulletproofChallenges = meOnly.oldBulletproofChallenges.map(
      (challenges) =>
        challenges.map((c, i) => [OPT, mask[i], c] as [0 | 1, Bool, Field])
    );
    let sg = meOnly.sg.map((g, i) => [mask[i], g] as [Bool, Group]);
    let meOnlyNew = { ...meOnly, oldBulletproofChallenges, sg };
    let notOpt = (x: unknown) => [NOT_OPT, x];
    let hashInputs = [
      ...stateToFields(meOnly.appState).map(notOpt),
      ...sg.map(([b, g]) => Group.toFields(g).map((x) => [OPT, b, x])).flat(),
      ...oldBulletproofChallenges.flat(),
    ];
    //   match
    //     Array.fold hash_inputs ~init:(`Not_opt sponge) ~f:(fun acc t ->
    //         match (acc, t) with
    //         | `Not_opt sponge, `Not_opt t ->
    //             Sponge.absorb sponge (`Field t) ;
    //             acc
    //         | `Not_opt sponge, `Opt t ->
    //             let sponge = Opt_sponge.of_sponge sponge in
    //             Opt_sponge.absorb sponge t ; `Opt sponge
    //         | `Opt sponge, `Opt t ->
    //             Opt_sponge.absorb sponge t ; acc
    //         | `Opt _, `Not_opt _ ->
    //             assert false)
    //   with
    //   | `Not_opt sponge ->
    //       (* This means there were no optional inputs. *)
    //       Sponge.squeeze_field sponge
    //   | `Opt sponge ->
    //       Opt_sponge.squeeze sponge)
  };
}

// 1 ... 1 0 ... 0, where the first zero is at index firstZero
function onesVector(length: number, firstZero: Field) {
  let vec: Bool[] = [];
  let value = Bool(true);
  for (let i = 0; i < length; i++) {
    value = value.and(Field(i).equals(firstZero).not());
    vec.push(value);
  }
  return vec;
}

function meOnlyToFieldsWithoutIndex<A>(
  { appState, dlogPlonkIndex: _, sg, oldBulletproofChallenges }: StepMeOnly<A>,
  stateToFields: (a: A) => Field[]
): Field[] {
  return [
    ...stateToFields(appState),
    ...sg.map(Group.toFields).flat(),
    ...oldBulletproofChallenges.flat(),
  ];
}

function indexToFields({
  sigmaComm,
  coefficientsComm,
  genericComm,
  psmComm,
  completeAddComm,
  mulComm,
  emulComm,
  endomulScalarComm,
}: PlonkVerificationEvals<Group>) {
  let groupElements = [
    ...sigmaComm,
    ...coefficientsComm,
    genericComm,
    psmComm,
    completeAddComm,
    mulComm,
    emulComm,
    endomulScalarComm,
  ];
  return groupElements.map(Group.toFields).flat();
}

let Pseudo = {
  mask(bits: Bool[], xs: Field[]) {
    return xs
      .map((x, i) => x.mul(bits[i].toField()))
      .reduce((x, y) => x.add(y));
  },
  choose<A>(bits: Bool[], xs: A[], func: (a: A) => Field) {
    return Pseudo.mask(bits, xs.map(func));
  },
};

function range(n: number) {
  return Array(n)
    .fill(0)
    .map((_, i) => i);
}
