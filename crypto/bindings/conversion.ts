/**
 * Implementation of Kimchi_bindings.Protocol.Gates
 */
import { MlArray, MlOption } from '../../../lib/ml/base.js';
import { MlTupleN } from './util.js';
import { Field } from './field.js';
import type {
  WasmFpDomain,
  WasmFpOpeningProof,
  WasmFpOracles,
  WasmFpPlonkVerificationEvals,
  WasmFpPlonkVerifierIndex,
  WasmFpProverCommitments,
  WasmFpProverProof,
  WasmFpRandomOracles,
  WasmFpShifts,
  WasmFqDomain,
  WasmFqOpeningProof,
  WasmFqOracles,
  WasmFqPlonkVerificationEvals,
  WasmFqPlonkVerifierIndex,
  WasmFqProverCommitments,
  WasmFqProverProof,
  WasmFqRandomOracles,
  WasmFqShifts,
  WasmVecVecFp,
  WasmVecVecFq,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import { OrInfinity } from './curve.js';
import {
  PolyComm,
  VerifierIndex,
  Oracles,
  ProverProof,
  ProofEvaluations,
  Domain,
  VerificationEvals,
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
import {
  ConversionCore,
  conversionCore,
  freeOnFinalize,
} from './conversion-core.js';

export { createRustConversion };

// wasm types

type wasm = typeof wasmNamespace;

type WasmDomain = WasmFpDomain | WasmFqDomain;
type WasmVerificationEvals =
  | WasmFpPlonkVerificationEvals
  | WasmFqPlonkVerificationEvals;
type WasmShifts = WasmFpShifts | WasmFqShifts;
type WasmVerifierIndex = WasmFpPlonkVerifierIndex | WasmFqPlonkVerifierIndex;
type WasmRandomOracles = WasmFpRandomOracles | WasmFqRandomOracles;
type WasmOracles = WasmFpOracles | WasmFqOracles;
type WasmProverCommitments = WasmFpProverCommitments | WasmFqProverCommitments;
type WasmOpeningProof = WasmFpOpeningProof | WasmFqOpeningProof;
type WasmProverProof = WasmFpProverProof | WasmFqProverProof;

// wasm class types

type WasmClasses = {
  Domain: typeof WasmFpDomain | typeof WasmFqDomain;
  VerificationEvals:
    | typeof WasmFpPlonkVerificationEvals
    | typeof WasmFqPlonkVerificationEvals;
  Shifts: typeof WasmFpShifts | typeof WasmFqShifts;
  VerifierIndex:
    | typeof WasmFpPlonkVerifierIndex
    | typeof WasmFqPlonkVerifierIndex;
  RandomOracles: typeof WasmFpRandomOracles | typeof WasmFqRandomOracles;
  Oracles: typeof WasmFpOracles | typeof WasmFqOracles;
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
    {
      Domain,
      VerificationEvals,
      Shifts,
      VerifierIndex,
      RandomOracles,
      Oracles,
      ProverCommitments,
      OpeningProof,
      VecVec,
      ProverProof,
    }: WasmClasses
  ) {
    let self = {
      ...core,
      shiftsToRust([, ...shifts]: MlArray<Field>): WasmShifts {
        let s = shifts.map(fieldToRust);
        return new Shifts(s[0], s[1], s[2], s[3], s[4], s[5], s[6]);
      },
      shiftsFromRust(s: WasmShifts): MlArray<Field> {
        let shifts = [s.s0, s.s1, s.s2, s.s3, s.s4, s.s5, s.s6];
        s.free();
        return [0, ...shifts.map(fieldFromRust)];
      },

      verifierIndexToRust(vk: VerifierIndex): WasmVerifierIndex {
        let domain = domainToRust(vk[1]);
        let maxPolySize = vk[2];
        let nPublic = vk[3];
        let prevChallenges = vk[4];
        let srs = vk[5];
        let evals = verificationEvalsToRust(vk[6]);
        let shifts = self.shiftsToRust(vk[7]);
        return new VerifierIndex(
          domain,
          maxPolySize,
          nPublic,
          prevChallenges,
          srs,
          evals,
          shifts
        );
      },
      verifierIndexFromRust(vk: WasmVerifierIndex): VerifierIndex {
        let lookupIndex = 0 as 0; // None
        let mlVk: VerifierIndex = [
          0,
          domainFromRust(vk.domain),
          vk.max_poly_size,
          vk.public_,
          vk.prev_challenges,
          freeOnFinalize(vk.srs),
          verificationEvalsFromRust(vk.evals),
          self.shiftsFromRust(vk.shifts),
          lookupIndex,
        ];
        vk.free();
        return mlVk;
      },

      oraclesToRust(oracles: Oracles): WasmOracles {
        let [, o, pEval, openingPrechallenges, digestBeforeEvaluations] =
          oracles;
        return new Oracles(
          randomOraclesToRust(o),
          fieldToRust(pEval[1]),
          fieldToRust(pEval[2]),
          fieldsToRustFlat(openingPrechallenges),
          fieldToRust(digestBeforeEvaluations)
        );
      },
      oraclesFromRust(oracles: WasmOracles): Oracles {
        let mlOracles: Oracles = [
          0,
          randomOraclesFromRust(oracles.o),
          [0, fieldFromRust(oracles.p_eval0), fieldFromRust(oracles.p_eval1)],
          fieldsFromRustFlat(oracles.opening_prechallenges),
          fieldFromRust(oracles.digest_before_evaluations),
        ];
        // TODO: do we not want to free?
        // oracles.free();
        return mlOracles;
      },

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

    function domainToRust([, logSizeOfGroup, groupGen]: Domain): WasmDomain {
      return new Domain(logSizeOfGroup, fieldToRust(groupGen));
    }
    function domainFromRust(domain: WasmDomain): Domain {
      let logSizeOfGroup = domain.log_size_of_group;
      let groupGen = fieldFromRust(domain.group_gen);
      domain.free();
      return [0, logSizeOfGroup, groupGen];
    }

    function verificationEvalsToRust(
      evals: VerificationEvals
    ): WasmVerificationEvals {
      let sigmaComm = self.polyCommsToRust(evals[1]);
      let coefficientsComm = self.polyCommsToRust(evals[2]);
      let genericComm = self.polyCommToRust(evals[3]);
      let psmComm = self.polyCommToRust(evals[4]);
      let completeAddComm = self.polyCommToRust(evals[5]);
      let mulComm = self.polyCommToRust(evals[6]);
      let emulComm = self.polyCommToRust(evals[7]);
      let endomulScalarComm = self.polyCommToRust(evals[8]);
      return new VerificationEvals(
        sigmaComm,
        coefficientsComm,
        genericComm,
        psmComm,
        completeAddComm,
        mulComm,
        emulComm,
        endomulScalarComm
      );
    }
    function verificationEvalsFromRust(
      evals: WasmVerificationEvals
    ): VerificationEvals {
      let mlEvals: VerificationEvals = [
        0,
        self.polyCommsFromRust(evals.sigma_comm),
        self.polyCommsFromRust(evals.coefficients_comm),
        self.polyCommFromRust(evals.generic_comm),
        self.polyCommFromRust(evals.psm_comm),
        self.polyCommFromRust(evals.complete_add_comm),
        self.polyCommFromRust(evals.mul_comm),
        self.polyCommFromRust(evals.emul_comm),
        self.polyCommFromRust(evals.endomul_scalar_comm),
      ];
      evals.free();
      return mlEvals;
    }

    function randomOraclesToRust(ro: RandomOracles): WasmRandomOracles {
      let jointCombinerMl = MlOption.from(ro[1]);
      let jointCombinerChal = maybeFieldToRust(jointCombinerMl?.[1][1]);
      let jointCombiner = maybeFieldToRust(jointCombinerMl?.[2]);
      let beta = fieldToRust(ro[2]);
      let gamma = fieldToRust(ro[3]);
      let alphaChal = fieldToRust(ro[4][1]);
      let alpha = fieldToRust(ro[5]);
      let zeta = fieldToRust(ro[6]);
      let v = fieldToRust(ro[7]);
      let u = fieldToRust(ro[8]);
      let zetaChal = fieldToRust(ro[9][1]);
      let vChal = fieldToRust(ro[10][1]);
      let uChal = fieldToRust(ro[11][1]);
      return new RandomOracles(
        jointCombinerChal,
        jointCombiner,
        beta,
        gamma,
        alphaChal,
        alpha,
        zeta,
        v,
        u,
        zetaChal,
        vChal,
        uChal
      );
    }
    function randomOraclesFromRust(ro: WasmRandomOracles): RandomOracles {
      let jointCombinerChal = ro.joint_combiner_chal;
      let jointCombiner = ro.joint_combiner;
      let jointCombinerOption = MlOption<[0, ScalarChallenge, Field]>(
        jointCombinerChal &&
          jointCombiner && [
            0,
            [0, fieldFromRust(jointCombinerChal)],
            fieldFromRust(jointCombiner),
          ]
      );
      let mlRo: RandomOracles = [
        0,
        jointCombinerOption,
        fieldFromRust(ro.beta),
        fieldFromRust(ro.gamma),
        [0, fieldFromRust(ro.alpha_chal)],
        fieldFromRust(ro.alpha),
        fieldFromRust(ro.zeta),
        fieldFromRust(ro.v),
        fieldFromRust(ro.u),
        [0, fieldFromRust(ro.zeta_chal)],
        [0, fieldFromRust(ro.v_chal)],
        [0, fieldFromRust(ro.u_chal)],
      ];
      // TODO: do we not want to free?
      // ro.free();
      return mlRo;
    }

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

  const fp = perField(core.fp, {
    Domain: wasm.WasmFpDomain,
    VerificationEvals: wasm.WasmFpPlonkVerificationEvals,
    Shifts: wasm.WasmFpShifts,
    VerifierIndex: wasm.WasmFpPlonkVerifierIndex,
    RandomOracles: wasm.WasmFpRandomOracles,
    Oracles: wasm.WasmFpOracles,
    ProverCommitments: wasm.WasmFpProverCommitments,
    OpeningProof: wasm.WasmFpOpeningProof,
    VecVec: wasm.WasmVecVecFp,
    ProverProof: wasm.WasmFpProverProof,
  });
  const fq = perField(core.fq, {
    Domain: wasm.WasmFqDomain,
    VerificationEvals: wasm.WasmFqPlonkVerificationEvals,
    Shifts: wasm.WasmFqShifts,
    VerifierIndex: wasm.WasmFqPlonkVerifierIndex,
    RandomOracles: wasm.WasmFqRandomOracles,
    Oracles: wasm.WasmFqOracles,
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
