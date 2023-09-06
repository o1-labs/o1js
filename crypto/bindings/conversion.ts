/**
 * Implementation of Kimchi_bindings.Protocol.Gates
 */
import { MlArray, MlOption } from '../../../lib/ml/base.js';
import { MlTupleN } from './util.js';
import { Field } from './field.js';
import type {
  WasmFpOpeningProof,
  WasmFpOracles,
  WasmFpProverCommitments,
  WasmFpProverProof,
  WasmFpRandomOracles,
  WasmFqOpeningProof,
  WasmFqOracles,
  WasmFqProverCommitments,
  WasmFqProverProof,
  WasmFqRandomOracles,
  WasmVecVecFp,
  WasmVecVecFq,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import { OrInfinity } from './curve.js';
import {
  PolyComm,
  Oracles,
  ProverProof,
  ProofEvaluations,
  RandomOracles,
  ScalarChallenge,
  ProverCommitments,
  OpeningProof,
  RecursionChallenge,
} from './kimchi-types.js';
import {
  fieldFromRust,
  fieldToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
  maybeFieldToRust,
} from './conversion-base.js';
import {
  proofEvaluationsFromRust,
  proofEvaluationsToRust,
} from './conversion-proof.js';
import { ConversionCore, conversionCore } from './conversion-core.js';
import {
  VerifierIndexConversion,
  verifierIndexConversion,
} from './conversion-verifier-index.js';
import { OraclesConversion, oraclesConversion } from './conversion-oracles.js';

export { createRustConversion };

// wasm types

type wasm = typeof wasmNamespace;

type WasmProverCommitments = WasmFpProverCommitments | WasmFqProverCommitments;
type WasmOpeningProof = WasmFpOpeningProof | WasmFqOpeningProof;
type WasmProverProof = WasmFpProverProof | WasmFqProverProof;

// wasm class types

type WasmClasses = {
  ProverCommitments:
    | typeof WasmFpProverCommitments
    | typeof WasmFqProverCommitments;
  OpeningProof: typeof WasmFpOpeningProof | typeof WasmFqOpeningProof;
  VecVec: typeof WasmVecVecFp | typeof WasmVecVecFq;
  ProverProof: typeof WasmFpProverProof | typeof WasmFqProverProof;
};

function createRustConversion(wasm: wasm) {
  function perField(
    core: ConversionCore,
    verifierIndex: VerifierIndexConversion,
    oracles: OraclesConversion,
    { ProverCommitments, OpeningProof, VecVec, ProverProof }: WasmClasses
  ) {
    let self = {
      ...core,
      ...verifierIndex,
      ...oracles,
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
        let prevChallengeComms = self.polyCommsToRust(prevChallengeCommsMl);
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
        let [, ...prevChallengeComms] = self.polyCommsFromRust(
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

    function commitmentsToRust(
      commitments: ProverCommitments
    ): WasmProverCommitments {
      let wComm = self.polyCommsToRust(commitments[1]);
      let zComm = self.polyCommToRust(commitments[2]);
      let tComm = self.polyCommToRust(commitments[3]);
      // TODO lookup
      return new ProverCommitments(wComm, zComm, tComm);
    }
    function commitmentsFromRust(
      commitments: WasmProverCommitments
    ): ProverCommitments {
      let wComm = self.polyCommsFromRust(commitments.w_comm);
      let zComm = self.polyCommFromRust(commitments.z_comm);
      let tComm = self.polyCommFromRust(commitments.t_comm);
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
        self.pointsToRust(l),
        self.pointsToRust(r),
        self.pointToRust(delta),
        fieldToRust(z1),
        fieldToRust(z2),
        self.pointToRust(sg)
      );
    }
    function openingProofFromRust(proof: WasmOpeningProof): OpeningProof {
      let [, ...l] = self.pointsFromRust(proof.lr_0);
      let [, ...r] = self.pointsFromRust(proof.lr_1);
      let n = l.length;
      if (n !== r.length)
        throw Error('openingProofFromRust: l and r length mismatch.');
      let lr = l.map<[0, OrInfinity, OrInfinity]>((li, i) => [0, li, r[i]]);
      let delta = self.pointFromRust(proof.delta);
      let z1 = fieldFromRust(proof.z1);
      let z2 = fieldFromRust(proof.z2);
      let sg = self.pointFromRust(proof.sg);
      proof.free();
      return [0, [0, ...lr], delta, z1, z2, sg];
    }

    return self;
  }

  let core = conversionCore(wasm);
  let verifierIndex = verifierIndexConversion(wasm, core);
  let oracles = oraclesConversion(wasm);

  const fp = perField(core.fp, verifierIndex.fp, oracles.fp, {
    ProverCommitments: wasm.WasmFpProverCommitments,
    OpeningProof: wasm.WasmFpOpeningProof,
    VecVec: wasm.WasmVecVecFp,
    ProverProof: wasm.WasmFpProverProof,
  });
  const fq = perField(core.fq, verifierIndex.fq, oracles.fq, {
    ProverCommitments: wasm.WasmFqProverCommitments,
    OpeningProof: wasm.WasmFqOpeningProof,
    VecVec: wasm.WasmVecVecFq,
    ProverProof: wasm.WasmFqProverProof,
  });

  return {
    fp,
    fq,
    fieldsToRustFlat,
    fieldsFromRustFlat,
    wireToRust: core.wireToRust,
    mapMlArrayToRustVector: core.mapMlArrayToRustVector,
  };
}
