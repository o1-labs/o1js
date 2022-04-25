import { Bool, Field, Group, Poseidon } from '../../snarky';
import {
  ForStep,
  PerProofWitness,
  PlonkVerificationEvals,
  StepMeOnly,
  UnfinalizedProof,
  WrapProof,
  WrapProofState,
} from './types';

export { verifyOne, hashMeOnly };

function verifyOne<A>({
  proof,
  data,
  passThrough,
  unfinalizedProof,
  shouldVerify,
}: {
  proof: PerProofWitness;
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
  // Types.Wrap.Statement
  let statement = {
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

type WrapStatement = {
  passThrough: Field;
  proofState: WrapProofState<Field>;
};

function verify(
  statement: WrapStatement,
  unfinalizedProof: UnfinalizedProof,
  {}: {
    branching: number;
    wrapDomain: number;
    isBaseCase: Bool;
    sgOld: unknown; // TODO
    opening: WrapProof[0];
    messages: WrapProof[1];
    wrapVerificationKey: PlonkVerificationEvals<Group>;
  }
): Bool {
  return 'TODO';
}

function finalizeOtherProof({
  maxBranching,
  maxWidth,
  stepWidths,
  stepDomains,
  sponge,
  oldBulletproofChallenges,
  deferredValues,
  prevEvals,
}): [Bool, Field[]] {
  return 'TODO';
}

// <> => _
// let hash_me_only (type s) ~index
//       (state_to_field_elements : s -> Field.t array) =
//     let open Types.Step.Proof_state.Me_only in
//     let after_index =
//       let sponge = Sponge.create sponge_params in
//       Array.iter
//         (Types.index_to_field_elements
//            ~g:(fun (z : Inputs.Inner_curve.t) ->
//              List.to_array (Inner_curve.to_field_elements z))
//            index)
//         ~f:(fun x -> Sponge.absorb sponge (`Field x)) ;
//       sponge
//     in
//     stage (fun (t : _ Types.Step.Proof_state.Me_only.t) ->
//         let sponge = Sponge.copy after_index in
//         Array.iter
//           ~f:(fun x -> Sponge.absorb sponge (`Field x))
//           (to_field_elements_without_index t ~app_state:state_to_field_elements
//              ~g:Inner_curve.to_field_elements) ;
//         Sponge.squeeze_field sponge)
function hashMeOnly<A, S>(
  index: PlonkVerificationEvals<Group>,
  stateToFieldElements: (s: S) => Field[]
) {
  let afterIndex = new Poseidon.Sponge();
  for (let x of indexToFieldElements(index)) {
    afterIndex.absorb(x);
  }
  return function hash(t: StepMeOnly<A>) {
    // TODO add .copy to Sponge
    let sponge = (afterIndex as any).copy();
  };
}
function hashMeOnlyOpt<A, S>(
  index: PlonkVerificationEvals<Group>,
  stateToFieldElements: (s: S) => Field[]
) {
  let afterIndex = new Poseidon.Sponge();
  for (let x of indexToFieldElements(index)) {
    afterIndex.absorb(x);
  }
  return function hash(
    t: StepMeOnly<A>,
    {
      widths,
      maxWidth,
      whichBranch,
    }: { widths: Field[]; maxWidth: number; whichBranch: Bool[] }
  ): Field {
    return 'TODO';
  };
}
function indexToFieldElements({
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
