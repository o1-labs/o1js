import type {
  WasmFpDomain,
  WasmFpPlonkVerificationEvals,
  WasmFpPlonkVerifierIndex,
  WasmFpShifts,
  WasmFqDomain,
  WasmFqPlonkVerificationEvals,
  WasmFqPlonkVerifierIndex,
  WasmFqShifts,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import type { MlArray } from '../../../lib/ml/base.js';
import { VerifierIndex, Domain, VerificationEvals } from './kimchi-types.js';
import { fieldFromRust, fieldToRust } from './conversion-base-old.js';
import {
  ConversionCore,
  ConversionCores,
  freeOnFinalize,
} from './conversion-core.js';

export { verifierIndexConversion };

import { Field } from './kimchi-types.js';

type wasm = typeof wasmNamespace;

type WasmDomain = WasmFpDomain | WasmFqDomain;
type WasmVerificationEvals =
  | WasmFpPlonkVerificationEvals
  | WasmFqPlonkVerificationEvals;
type WasmShifts = WasmFpShifts | WasmFqShifts;
type WasmVerifierIndex = WasmFpPlonkVerifierIndex | WasmFqPlonkVerifierIndex;

type WasmClasses = {
  Domain: typeof WasmFpDomain | typeof WasmFqDomain;
  VerificationEvals:
    | typeof WasmFpPlonkVerificationEvals
    | typeof WasmFqPlonkVerificationEvals;
  Shifts: typeof WasmFpShifts | typeof WasmFqShifts;
  VerifierIndex:
    | typeof WasmFpPlonkVerifierIndex
    | typeof WasmFqPlonkVerifierIndex;
};

function verifierIndexConversion(wasm: wasm, core: ConversionCores) {
  return {
    fp: verifierIndexConversionPerField(core.fp, {
      Domain: wasm.WasmFpDomain,
      VerificationEvals: wasm.WasmFpPlonkVerificationEvals,
      Shifts: wasm.WasmFpShifts,
      VerifierIndex: wasm.WasmFpPlonkVerifierIndex,
    }),
    fq: verifierIndexConversionPerField(core.fq, {
      Domain: wasm.WasmFqDomain,
      VerificationEvals: wasm.WasmFqPlonkVerificationEvals,
      Shifts: wasm.WasmFqShifts,
      VerifierIndex: wasm.WasmFqPlonkVerifierIndex,
    }),
  };
}

function verifierIndexConversionPerField(
  core: ConversionCore,
  { Domain, VerificationEvals, Shifts, VerifierIndex }: WasmClasses
) {
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
    let sigmaComm = core.polyCommsToRust(evals[1]);
    let coefficientsComm = core.polyCommsToRust(evals[2]);
    let genericComm = core.polyCommToRust(evals[3]);
    let psmComm = core.polyCommToRust(evals[4]);
    let completeAddComm = core.polyCommToRust(evals[5]);
    let mulComm = core.polyCommToRust(evals[6]);
    let emulComm = core.polyCommToRust(evals[7]);
    let endomulScalarComm = core.polyCommToRust(evals[8]);
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
      core.polyCommsFromRust(evals.sigma_comm),
      core.polyCommsFromRust(evals.coefficients_comm),
      core.polyCommFromRust(evals.generic_comm),
      core.polyCommFromRust(evals.psm_comm),
      core.polyCommFromRust(evals.complete_add_comm),
      core.polyCommFromRust(evals.mul_comm),
      core.polyCommFromRust(evals.emul_comm),
      core.polyCommFromRust(evals.endomul_scalar_comm),
    ];
    evals.free();
    return mlEvals;
  }

  let self = {
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
  };

  return self;
}
