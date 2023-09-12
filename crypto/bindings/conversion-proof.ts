import type {
  WasmFpOpeningProof,
  WasmFpProverCommitments,
  WasmFpProverProof,
  WasmFqOpeningProof,
  WasmFqProverCommitments,
  WasmFqProverProof,
  WasmVecVecFp,
  WasmVecVecFq,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import type {
  LookupEvaluations,
  PointEvaluations,
  PolyComm,
  ProverProof,
  ProofEvaluations,
  ProverCommitments,
  OpeningProof,
  RecursionChallenge,
} from './kimchi-types.js';
import { MlTupleN, mapMlTuple } from './util.js';
import { MlArray, MlOption } from '../../../lib/ml/base.js';
import {
  fieldToRust,
  fieldFromRust,
  fieldsToRustFlat,
  fieldsFromRustFlat,
} from './conversion-base-old.js';
import { ConversionCore, ConversionCores } from './conversion-core.js';

export { proofConversion };

import { OrInfinity } from './kimchi-types.js';

const proofEvaluationsToRust = mapProofEvaluations(fieldToRust);
const proofEvaluationsFromRust = mapProofEvaluations(fieldFromRust);

type wasm = typeof wasmNamespace;

type WasmProverCommitments = WasmFpProverCommitments | WasmFqProverCommitments;
type WasmOpeningProof = WasmFpOpeningProof | WasmFqOpeningProof;
type WasmProverProof = WasmFpProverProof | WasmFqProverProof;

type WasmClasses = {
  ProverCommitments:
    | typeof WasmFpProverCommitments
    | typeof WasmFqProverCommitments;
  OpeningProof: typeof WasmFpOpeningProof | typeof WasmFqOpeningProof;
  VecVec: typeof WasmVecVecFp | typeof WasmVecVecFq;
  ProverProof: typeof WasmFpProverProof | typeof WasmFqProverProof;
};

function proofConversion(wasm: wasm, core: ConversionCores) {
  return {
    fp: proofConversionPerField(core.fp, {
      ProverCommitments: wasm.WasmFpProverCommitments,
      OpeningProof: wasm.WasmFpOpeningProof,
      VecVec: wasm.WasmVecVecFp,
      ProverProof: wasm.WasmFpProverProof,
    }),
    fq: proofConversionPerField(core.fq, {
      ProverCommitments: wasm.WasmFqProverCommitments,
      OpeningProof: wasm.WasmFqOpeningProof,
      VecVec: wasm.WasmVecVecFq,
      ProverProof: wasm.WasmFqProverProof,
    }),
  };
}

function proofConversionPerField(
  core: ConversionCore,
  { ProverCommitments, OpeningProof, VecVec, ProverProof }: WasmClasses
) {
  function commitmentsToRust(
    commitments: ProverCommitments
  ): WasmProverCommitments {
    let wComm = core.polyCommsToRust(commitments[1]);
    let zComm = core.polyCommToRust(commitments[2]);
    let tComm = core.polyCommToRust(commitments[3]);
    // TODO lookup
    return new ProverCommitments(wComm, zComm, tComm);
  }
  function commitmentsFromRust(
    commitments: WasmProverCommitments
  ): ProverCommitments {
    let wComm = core.polyCommsFromRust(commitments.w_comm);
    let zComm = core.polyCommFromRust(commitments.z_comm);
    let tComm = core.polyCommFromRust(commitments.t_comm);
    let lookup = 0 as any; // TODO
    commitments.free();
    return [0, wComm as MlTupleN<PolyComm, 15>, zComm, tComm, lookup];
  }

  function openingProofToRust(proof: OpeningProof): WasmOpeningProof {
    let [_, [, ...lr], delta, z1, z2, sg] = proof;
    // We pass l and r as separate vectors over the FFI
    let l: MlArray<OrInfinity> = [0];
    let r: MlArray<OrInfinity> = [0];
    for (let [, li, ri] of lr) {
      l.push(li);
      r.push(ri);
    }
    return new OpeningProof(
      core.pointsToRust(l),
      core.pointsToRust(r),
      core.pointToRust(delta),
      fieldToRust(z1),
      fieldToRust(z2),
      core.pointToRust(sg)
    );
  }
  function openingProofFromRust(proof: WasmOpeningProof): OpeningProof {
    let [, ...l] = core.pointsFromRust(proof.lr_0);
    let [, ...r] = core.pointsFromRust(proof.lr_1);
    let n = l.length;
    if (n !== r.length)
      throw Error('openingProofFromRust: l and r length mismatch.');
    let lr = l.map<[0, OrInfinity, OrInfinity]>((li, i) => [0, li, r[i]]);
    let delta = core.pointFromRust(proof.delta);
    let z1 = fieldFromRust(proof.z1);
    let z2 = fieldFromRust(proof.z2);
    let sg = core.pointFromRust(proof.sg);
    proof.free();
    return [0, [0, ...lr], delta, z1, z2, sg];
  }

  return {
    proofToRust(proof: ProverProof): WasmProverProof {
      let commitments = commitmentsToRust(proof[1]);
      let openingProof = openingProofToRust(proof[2]);
      // TODO typed as `any` in wasm-bindgen, this has the correct type
      let evals = proofEvaluationsToRust(proof[3]);
      let ftEval1 = fieldToRust(proof[4]);
      let public_ = fieldsToRustFlat(proof[5]);
      let [, ...prevChallenges] = proof[6];
      let n = prevChallenges.length;
      let prevChallengeScalars = new VecVec(n);
      let prevChallengeCommsMl: MlArray<PolyComm> = [0];
      for (let [, scalars, comms] of prevChallenges) {
        prevChallengeScalars.push(fieldsToRustFlat(scalars));
        prevChallengeCommsMl.push(comms);
      }
      let prevChallengeComms = core.polyCommsToRust(prevChallengeCommsMl);
      return new ProverProof(
        commitments,
        openingProof,
        evals,
        ftEval1,
        public_,
        prevChallengeScalars,
        prevChallengeComms
      );
    },
    proofFromRust(proof: WasmProverProof): ProverProof {
      let commitments = commitmentsFromRust(proof.commitments);
      let openingProof = openingProofFromRust(proof.proof);
      let evals = proofEvaluationsFromRust(
        // TODO typed as `any` in wasm-bindgen, this has the correct type
        proof.evals satisfies ProofEvaluations<Uint8Array>
      );
      let ftEval1 = fieldFromRust(proof.ft_eval1);
      let public_ = fieldsFromRustFlat(proof.public_);
      let prevChallengeScalars = proof.prev_challenges_scalars;
      let [, ...prevChallengeComms] = core.polyCommsFromRust(
        proof.prev_challenges_comms
      );
      let prevChallenges = prevChallengeComms.map<RecursionChallenge>(
        (comms, i) => {
          let scalars = fieldsFromRustFlat(prevChallengeScalars.get(i));
          return [0, scalars, comms];
        }
      );
      proof.free();
      return [
        0,
        commitments,
        openingProof,
        evals,
        ftEval1,
        public_,
        [0, ...prevChallenges],
      ];
    },
  };
}

function mapProofEvaluations<Field1, Field2>(map: (x: Field1) => Field2) {
  const mapPointEvals = (
    evals: PointEvaluations<Field1>
  ): PointEvaluations<Field2> => {
    let [, zeta, zeta_omega] = evals;
    return [0, MlArray.map(zeta, map), MlArray.map(zeta_omega, map)];
  };

  const mapLookupEvals = (
    evals: LookupEvaluations<Field1>
  ): LookupEvaluations<Field2> => {
    let [, sorted, aggreg, table, runtime] = evals;
    return [
      0,
      MlArray.map(sorted, mapPointEvals),
      mapPointEvals(aggreg),
      mapPointEvals(table),
      MlOption.map(runtime, mapPointEvals),
    ];
  };

  return function mapProofEvaluations(
    evals: ProofEvaluations<Field1>
  ): ProofEvaluations<Field2> {
    let [, w, z, s, coeffs, lookup, genericSelector, poseidonSelector] = evals;
    return [
      0,
      mapMlTuple(w, mapPointEvals),
      mapPointEvals(z),
      mapMlTuple(s, mapPointEvals),
      mapMlTuple(coeffs, mapPointEvals),
      MlOption.map(lookup, mapLookupEvals),
      mapPointEvals(genericSelector),
      mapPointEvals(poseidonSelector),
    ];
  };
}
