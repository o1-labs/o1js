import { MlArray, MlOption, MlTuple } from '../../lib/ml/base.js';
import type * as napiNamespace from '../compiled/node_bindings/plonk_wasm.cjs';
import type {
  WasmFpLookupCommitments,
  WasmFpOpeningProof,
  WasmFpProverCommitments,
  WasmFpProverProof,
  WasmFpRuntimeTable,
  WasmFqLookupCommitments,
  WasmFqOpeningProof,
  WasmFqProverCommitments,
  WasmFqProverProof,
  WasmFqRuntimeTable,
  WasmPastaFpLookupTable,
  WasmPastaFpRuntimeTableCfg,
  WasmPastaFqLookupTable,
  WasmPastaFqRuntimeTableCfg,
  WasmVecVecFp,
  WasmVecVecFq,
} from '../compiled/node_bindings/plonk_wasm.cjs';
import {
  fieldFromRust,
  fieldToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from './bindings/conversion-base.js';
import type { Field } from './bindings/field.js';
import type {
  LookupCommitments,
  LookupTable,
  OpeningProof,
  OrInfinity,
  PointEvaluations,
  PolyComm,
  ProofEvaluations,
  ProofWithPublic,
  ProverCommitments,
  ProverProof,
  RecursionChallenge,
  RuntimeTable,
  RuntimeTableCfg,
} from './bindings/kimchi-types.js';
import { ConversionCore, ConversionCores } from './napi-conversion-core.js';

export { napiProofConversion };

const fieldToRust_ = (x: Field) => fieldToRust(x);
const proofEvaluationsToRust = mapProofEvaluations(fieldToRust_);
const proofEvaluationsFromRust = mapProofEvaluations(fieldFromRust);
const pointEvalsOptionToRust = mapPointEvalsOption(fieldToRust_);
const pointEvalsOptionFromRust = mapPointEvalsOption(fieldFromRust);

type NapiProofEvaluations = [
  0,
  MlOption<PointEvaluations<Uint8Array>>,
  ...RemoveLeadingZero<ProofEvaluations<Uint8Array>>,
];

type napi = typeof napiNamespace;

type NapiProverCommitments = WasmFpProverCommitments | WasmFqProverCommitments;
type NapiOpeningProof = WasmFpOpeningProof | WasmFqOpeningProof;
type NapiProverProof = WasmFpProverProof | WasmFqProverProof;
type NapiLookupCommitments = WasmFpLookupCommitments | WasmFqLookupCommitments;
type NapiRuntimeTable = WasmFpRuntimeTable | WasmFqRuntimeTable;
type NapiRuntimeTableCfg = WasmPastaFpRuntimeTableCfg | WasmPastaFqRuntimeTableCfg;
type NapiLookupTable = WasmPastaFpLookupTable | WasmPastaFqLookupTable;

type NapiClasses = {
  ProverCommitments: typeof WasmFpProverCommitments | typeof WasmFqProverCommitments;
  OpeningProof: typeof WasmFpOpeningProof | typeof WasmFqOpeningProof;
  VecVec: typeof WasmVecVecFp | typeof WasmVecVecFq;
  ProverProof: typeof WasmFpProverProof | typeof WasmFqProverProof;
  LookupCommitments: typeof WasmFpLookupCommitments | typeof WasmFqLookupCommitments;
  RuntimeTable: typeof WasmFpRuntimeTable | typeof WasmFqRuntimeTable;
  RuntimeTableCfg: typeof WasmPastaFpRuntimeTableCfg | typeof WasmPastaFqRuntimeTableCfg;
  LookupTable: typeof WasmPastaFpLookupTable | typeof WasmPastaFqLookupTable;
};

function napiProofConversion(napi: napi, core: ConversionCores) {
  return {
    fp: proofConversionPerField(core.fp, {
      ProverCommitments: napi.WasmFpProverCommitments,
      OpeningProof: napi.WasmFpOpeningProof,
      VecVec: napi.WasmVecVecFp,
      ProverProof: napi.WasmFpProverProof,
      LookupCommitments: napi.WasmFpLookupCommitments,
      RuntimeTable: napi.WasmFpRuntimeTable,
      RuntimeTableCfg: napi.WasmPastaFpRuntimeTableCfg,
      LookupTable: napi.WasmPastaFpLookupTable,
    }),
    fq: proofConversionPerField(core.fq, {
      ProverCommitments: napi.WasmFqProverCommitments,
      OpeningProof: napi.WasmFqOpeningProof,
      VecVec: napi.WasmVecVecFq,
      ProverProof: napi.WasmFqProverProof,
      LookupCommitments: napi.WasmFqLookupCommitments,
      RuntimeTable: napi.WasmFqRuntimeTable,
      RuntimeTableCfg: napi.WasmPastaFqRuntimeTableCfg,
      LookupTable: napi.WasmPastaFqLookupTable,
    }),
  };
}

function proofConversionPerField(
  core: ConversionCore,
  {
    ProverCommitments,
    OpeningProof,
    VecVec,
    ProverProof,
    LookupCommitments,
    RuntimeTable,
    RuntimeTableCfg,
    LookupTable,
  }: NapiClasses
) {
  function commitmentsToRust(commitments: ProverCommitments): NapiProverCommitments {
    let wComm = core.polyCommsToRust(commitments[1]);
    let zComm = core.polyCommToRust(commitments[2]);
    let tComm = core.polyCommToRust(commitments[3]);
    let lookup = MlOption.mapFrom(commitments[4], lookupCommitmentsToRust);
    return new ProverCommitments(wComm as any, zComm as any, tComm as any, lookup as any);
  }
  function commitmentsFromRust(commitments: NapiProverCommitments): ProverCommitments {
    let wComm = core.polyCommsFromRust(commitments.w_comm);
    let zComm = core.polyCommFromRust(commitments.z_comm);
    let tComm = core.polyCommFromRust(commitments.t_comm);
    let lookup = MlOption.mapTo(commitments.lookup, lookupCommitmentsFromRust);
    commitments.free();
    return [0, wComm as MlTuple<PolyComm, 15>, zComm, tComm, lookup];
  }

  function lookupCommitmentsToRust(lookup: LookupCommitments): NapiLookupCommitments {
    let sorted = core.polyCommsToRust(lookup[1]);
    let aggreg = core.polyCommToRust(lookup[2]);
    let runtime = MlOption.mapFrom(lookup[3], core.polyCommToRust);
    return new LookupCommitments(sorted as any, aggreg as any, runtime as any);
  }
  function lookupCommitmentsFromRust(lookup: NapiLookupCommitments): LookupCommitments {
    let sorted = core.polyCommsFromRust(lookup.sorted);
    let aggreg = core.polyCommFromRust(lookup.aggreg);
    let runtime = MlOption.mapTo(lookup.runtime, core.polyCommFromRust);
    lookup.free();
    return [0, sorted, aggreg, runtime];
  }

  function openingProofToRust(proof: OpeningProof): NapiOpeningProof {
    let [_, [, ...lr], delta, z1, z2, sg] = proof;
    // We pass l and r as separate vectors over the FFI
    let l: MlArray<OrInfinity> = [0];
    let r: MlArray<OrInfinity> = [0];
    for (let [, li, ri] of lr) {
      l.push(li);
      r.push(ri);
    }
    return new OpeningProof(
      core.pointsToRust(l) as any,
      core.pointsToRust(r) as any,
      core.pointToRust(delta),
      fieldToRust(z1),
      fieldToRust(z2),
      core.pointToRust(sg)
    );
  }
  function openingProofFromRust(proof: any): OpeningProof {
    let [, ...l] = core.pointsFromRust(proof.lr_0);
    let [, ...r] = core.pointsFromRust(proof.lr_1);
    let n = l.length;
    if (n !== r.length) throw Error('openingProofFromRust: l and r length mismatch.');
    let lr = l.map<[0, OrInfinity, OrInfinity]>((li, i) => [0, li, r[i]]);
    let delta = core.pointFromRust(proof.delta);
    let z1 = fieldFromRust(proof.z1);
    let z2 = fieldFromRust(proof.z2);
    let sg = core.pointFromRust(proof.sg);
    proof.free();
    return [0, [0, ...lr], delta, z1, z2, sg];
  }

  function runtimeTableToRust([, id, data]: RuntimeTable): NapiRuntimeTable {
    console.log('runtime table');
    return new RuntimeTable(id, core.vectorToRust(data));
  }

  function runtimeTableCfgToRust([, id, firstColumn]: RuntimeTableCfg): NapiRuntimeTableCfg {
    return new RuntimeTableCfg(id, core.vectorToRust(firstColumn));
  }

  function lookupTableToRust([, id, [, ...data]]: LookupTable): NapiLookupTable {
    let n = data.length;
    let wasmData = new VecVec(n);
    for (let i = 0; i < n; i++) {
      wasmData.push(fieldsToRustFlat(data[i]));
    }
    return new LookupTable(id, wasmData);
  }

  return {
    proofToRust([, public_evals, proof]: ProofWithPublic): NapiProverProof {
      let commitments = commitmentsToRust(proof[1]);
      let openingProof = openingProofToRust(proof[2]);
      let [, ...evals] = proofEvaluationsToRust(proof[3]);
      let publicEvals = pointEvalsOptionToRust(public_evals);
      // TODO typed as `any` in wasm-bindgen, this has the correct type
      let evalsActual: NapiProofEvaluations = [0, publicEvals, ...evals];

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
        evalsActual,
        ftEval1,
        public_,
        prevChallengeScalars,
        prevChallengeComms as any
      );
    },
    proofFromRust(wasmProof: NapiProverProof): ProofWithPublic {
      let commitments = commitmentsFromRust(wasmProof.commitments);
      let openingProof = openingProofFromRust(wasmProof.proof);
      // TODO typed as `any` in wasm-bindgen, this is the correct type
      let [, wasmPublicEvals, ...wasmEvals]: NapiProofEvaluations = wasmProof.evals;
      let publicEvals = pointEvalsOptionFromRust(wasmPublicEvals);
      let evals = proofEvaluationsFromRust([0, ...wasmEvals]);

      let ftEval1 = fieldFromRust(wasmProof.ft_eval1);
      let public_ = fieldsFromRustFlat(wasmProof.public_);
      let prevChallengeScalars = wasmProof.prev_challenges_scalars;
      let [, ...prevChallengeComms] = core.polyCommsFromRust(wasmProof.prev_challenges_comms);
      let prevChallenges = prevChallengeComms.map<RecursionChallenge>((comms, i) => {
        let scalars = fieldsFromRustFlat(prevChallengeScalars.get(i));
        return [0, scalars, comms];
      });
      let proof: ProverProof = [
        0,
        commitments,
        openingProof,
        evals,
        ftEval1,
        public_,
        [0, ...prevChallenges],
      ];
      return [0, publicEvals, proof];
    },

    runtimeTablesToRust([, ...tables]: MlArray<RuntimeTable>): NapiRuntimeTable[] {
      return tables.map(runtimeTableToRust);
    },

    runtimeTableCfgsToRust([, ...tableCfgs]: MlArray<RuntimeTableCfg>): NapiRuntimeTableCfg[] {
      return tableCfgs.map(runtimeTableCfgToRust);
    },

    lookupTablesToRust([, ...tables]: MlArray<LookupTable>): NapiLookupTable[] {
      return tables.map(lookupTableToRust);
    },
  };
}

function createMapPointEvals<Field1, Field2>(map: (x: Field1) => Field2) {
  return (evals: PointEvaluations<Field1>): PointEvaluations<Field2> => {
    let [, zeta, zeta_omega] = evals;
    return [0, MlArray.map(zeta, map), MlArray.map(zeta_omega, map)];
  };
}

function mapPointEvalsOption<Field1, Field2>(map: (x: Field1) => Field2) {
  return (evals: MlOption<PointEvaluations<Field1>>) =>
    MlOption.map(evals, createMapPointEvals(map));
}

function mapProofEvaluations<Field1, Field2>(map: (x: Field1) => Field2) {
  const mapPointEvals = createMapPointEvals(map);

  const mapPointEvalsOption = (
    evals: MlOption<PointEvaluations<Field1>>
  ): MlOption<PointEvaluations<Field2>> => MlOption.map(evals, mapPointEvals);

  return function mapProofEvaluations(evals: ProofEvaluations<Field1>): ProofEvaluations<Field2> {
    let [
      ,
      w,
      z,
      s,
      coeffs,
      genericSelector,
      poseidonSelector,
      completeAddSelector,
      mulSelector,
      emulSelector,
      endomulScalarSelector,
      rangeCheck0Selector,
      rangeCheck1Selector,
      foreignFieldAddSelector,
      foreignFieldMulSelector,
      xorSelector,
      rotSelector,
      lookupAggregation,
      lookupTable,
      lookupSorted,
      runtimeLookupTable,
      runtimeLookupTableSelector,
      xorLookupSelector,
      lookupGateLookupSelector,
      rangeCheckLookupSelector,
      foreignFieldMulLookupSelector,
    ] = evals;
    return [
      0,
      MlTuple.map(w, mapPointEvals),
      mapPointEvals(z),
      MlTuple.map(s, mapPointEvals),
      MlTuple.map(coeffs, mapPointEvals),
      mapPointEvals(genericSelector),
      mapPointEvals(poseidonSelector),
      mapPointEvals(completeAddSelector),
      mapPointEvals(mulSelector),
      mapPointEvals(emulSelector),
      mapPointEvals(endomulScalarSelector),
      mapPointEvalsOption(rangeCheck0Selector),
      mapPointEvalsOption(rangeCheck1Selector),
      mapPointEvalsOption(foreignFieldAddSelector),
      mapPointEvalsOption(foreignFieldMulSelector),
      mapPointEvalsOption(xorSelector),
      mapPointEvalsOption(rotSelector),
      mapPointEvalsOption(lookupAggregation),
      mapPointEvalsOption(lookupTable),
      MlArray.map(lookupSorted, mapPointEvalsOption),
      mapPointEvalsOption(runtimeLookupTable),
      mapPointEvalsOption(runtimeLookupTableSelector),
      mapPointEvalsOption(xorLookupSelector),
      mapPointEvalsOption(lookupGateLookupSelector),
      mapPointEvalsOption(rangeCheckLookupSelector),
      mapPointEvalsOption(foreignFieldMulLookupSelector),
    ];
  };
}

// helper

type RemoveLeadingZero<T extends [0, ...any]> = T extends [0, ...infer U] ? U : never;
