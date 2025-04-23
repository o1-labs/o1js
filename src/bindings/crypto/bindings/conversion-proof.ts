import type {
  WasmFpLookupCommitments,
  WasmPastaFpLookupTable,
  WasmFpOpeningProof,
  WasmFpProverCommitments,
  WasmFpProverProof,
  WasmFpRuntimeTable,
  WasmPastaFpRuntimeTableCfg,
  WasmFqLookupCommitments,
  WasmFqOpeningProof,
  WasmFqProverCommitments,
  WasmPastaFqLookupTable,
  WasmFqProverProof,
  WasmFqRuntimeTable,
  WasmPastaFqRuntimeTableCfg,
  WasmVecVecFp,
  WasmVecVecFq,
} from '../../compiled/node_bindings/plonk_wasm.cjs';
import type * as wasmNamespace from '../../compiled/node_bindings/plonk_wasm.cjs';
import type {
  OrInfinity,
  PointEvaluations,
  PolyComm,
  ProverProof,
  ProofWithPublic,
  ProofEvaluations,
  ProverCommitments,
  OpeningProof,
  RecursionChallenge,
  LookupCommitments,
  RuntimeTable,
  RuntimeTableCfg,
  LookupTable,
  Field,
} from './kimchi-types.js';
import { MlArray, MlOption, MlTuple } from '../../../lib/ml/base.js';
import {
  fieldToRust,
  fieldFromRust,
  fieldsToRustFlat,
  fieldsFromRustFlat,
} from './conversion-base.js';
import {
  ConversionCore,
  ConversionCores,
  mapToUint32Array,
  unwrap,
} from './conversion-core.js';

export { proofConversion };

const fieldToRust_ = (x: Field) => fieldToRust(x);
const proofEvaluationsToRust = mapProofEvaluations(fieldToRust_);
const proofEvaluationsFromRust = mapProofEvaluations(fieldFromRust);
const pointEvalsOptionToRust = mapPointEvalsOption(fieldToRust_);
const pointEvalsOptionFromRust = mapPointEvalsOption(fieldFromRust);

type WasmProofEvaluations = [
  0,
  MlOption<PointEvaluations<Uint8Array>>,
  ...RemoveLeadingZero<ProofEvaluations<Uint8Array>>
];

type wasm = typeof wasmNamespace;

type WasmProverCommitments = WasmFpProverCommitments | WasmFqProverCommitments;
type WasmOpeningProof = WasmFpOpeningProof | WasmFqOpeningProof;
type WasmProverProof = WasmFpProverProof | WasmFqProverProof;
type WasmLookupCommitments = WasmFpLookupCommitments | WasmFqLookupCommitments;
type WasmRuntimeTable = WasmFpRuntimeTable | WasmFqRuntimeTable;
type WasmRuntimeTableCfg =
  | WasmPastaFpRuntimeTableCfg
  | WasmPastaFqRuntimeTableCfg;
type WasmLookupTable = WasmPastaFpLookupTable | WasmPastaFqLookupTable;

type WasmClasses = {
  ProverCommitments:
    | typeof WasmFpProverCommitments
    | typeof WasmFqProverCommitments;
  OpeningProof: typeof WasmFpOpeningProof | typeof WasmFqOpeningProof;
  VecVec: typeof WasmVecVecFp | typeof WasmVecVecFq;
  ProverProof: typeof WasmFpProverProof | typeof WasmFqProverProof;
  LookupCommitments:
    | typeof WasmFpLookupCommitments
    | typeof WasmFqLookupCommitments;
  RuntimeTable: typeof WasmFpRuntimeTable | typeof WasmFqRuntimeTable;
  RuntimeTableCfg:
    | typeof WasmPastaFpRuntimeTableCfg
    | typeof WasmPastaFqRuntimeTableCfg;
  LookupTable: typeof WasmPastaFpLookupTable | typeof WasmPastaFqLookupTable;
};

function proofConversion(wasm: wasm, core: ConversionCores) {
  return {
    fp: proofConversionPerField(core.fp, {
      ProverCommitments: wasm.WasmFpProverCommitments,
      OpeningProof: wasm.WasmFpOpeningProof,
      VecVec: wasm.WasmVecVecFp,
      ProverProof: wasm.WasmFpProverProof,
      LookupCommitments: wasm.WasmFpLookupCommitments,
      RuntimeTable: wasm.WasmFpRuntimeTable,
      RuntimeTableCfg: wasm.WasmPastaFpRuntimeTableCfg,
      LookupTable: wasm.WasmPastaFpLookupTable,
    }),
    fq: proofConversionPerField(core.fq, {
      ProverCommitments: wasm.WasmFqProverCommitments,
      OpeningProof: wasm.WasmFqOpeningProof,
      VecVec: wasm.WasmVecVecFq,
      ProverProof: wasm.WasmFqProverProof,
      LookupCommitments: wasm.WasmFqLookupCommitments,
      RuntimeTable: wasm.WasmFqRuntimeTable,
      RuntimeTableCfg: wasm.WasmPastaFqRuntimeTableCfg,
      LookupTable: wasm.WasmPastaFqLookupTable,
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
  }: WasmClasses
) {
  function commitmentsToRust(
    commitments: ProverCommitments
  ): WasmProverCommitments {
    let wComm = core.polyCommsToRust(commitments[1]);
    let zComm = core.polyCommToRust(commitments[2]);
    let tComm = core.polyCommToRust(commitments[3]);
    let lookup = MlOption.mapFrom(commitments[4], lookupCommitmentsToRust);
    return new ProverCommitments(wComm, zComm, tComm, lookup);
  }
  function commitmentsFromRust(
    commitments: WasmProverCommitments
  ): ProverCommitments {
    let wComm = core.polyCommsFromRust(commitments.w_comm);
    let zComm = core.polyCommFromRust(commitments.z_comm);
    let tComm = core.polyCommFromRust(commitments.t_comm);
    let lookup = MlOption.mapTo(commitments.lookup, lookupCommitmentsFromRust);
    commitments.free();
    return [0, wComm as MlTuple<PolyComm, 15>, zComm, tComm, lookup];
  }

  function lookupCommitmentsToRust(
    lookup: LookupCommitments
  ): WasmLookupCommitments {
    let sorted = core.polyCommsToRust(lookup[1]);
    let aggreg = core.polyCommToRust(lookup[2]);
    let runtime = MlOption.mapFrom(lookup[3], core.polyCommToRust);
    return new LookupCommitments(sorted, aggreg, runtime);
  }
  function lookupCommitmentsFromRust(
    lookup: WasmLookupCommitments
  ): LookupCommitments {
    let sorted = core.polyCommsFromRust(lookup.sorted);
    let aggreg = core.polyCommFromRust(lookup.aggreg);
    let runtime = MlOption.mapTo(lookup.runtime, core.polyCommFromRust);
    lookup.free();
    return [0, sorted, aggreg, runtime];
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

  function runtimeTableToRust([, id, data]: RuntimeTable): WasmRuntimeTable {
    return new RuntimeTable(id, core.vectorToRust(data));
  }

  function runtimeTableCfgToRust([
    ,
    id,
    firstColumn,
  ]: RuntimeTableCfg): WasmRuntimeTableCfg {
    return new RuntimeTableCfg(id, core.vectorToRust(firstColumn));
  }

  function lookupTableToRust([
    ,
    id,
    [, ...data],
  ]: LookupTable): WasmLookupTable {
    let n = data.length;
    let wasmData = new VecVec(n);
    for (let i = 0; i < n; i++) {
      wasmData.push(fieldsToRustFlat(data[i]));
    }
    return new LookupTable(id, wasmData);
  }

  return {
    proofToRust([, public_evals, proof]: ProofWithPublic): WasmProverProof {
      let commitments = commitmentsToRust(proof[1]);
      let openingProof = openingProofToRust(proof[2]);
      let [, ...evals] = proofEvaluationsToRust(proof[3]);
      let publicEvals = pointEvalsOptionToRust(public_evals);
      // TODO typed as `any` in wasm-bindgen, this has the correct type
      let evalsActual: WasmProofEvaluations = [0, publicEvals, ...evals];

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
        prevChallengeComms
      );
    },
    proofFromRust(wasmProof: WasmProverProof): ProofWithPublic {
      let commitments = commitmentsFromRust(wasmProof.commitments);
      let openingProof = openingProofFromRust(wasmProof.proof);
      // TODO typed as `any` in wasm-bindgen, this is the correct type
      let [, wasmPublicEvals, ...wasmEvals]: WasmProofEvaluations =
        wasmProof.evals;
      let publicEvals = pointEvalsOptionFromRust(wasmPublicEvals);
      let evals = proofEvaluationsFromRust([0, ...wasmEvals]);

      let ftEval1 = fieldFromRust(wasmProof.ft_eval1);
      let public_ = fieldsFromRustFlat(wasmProof.public_);
      let prevChallengeScalars = wasmProof.prev_challenges_scalars;
      let [, ...prevChallengeComms] = core.polyCommsFromRust(
        wasmProof.prev_challenges_comms
      );
      let prevChallenges = prevChallengeComms.map<RecursionChallenge>(
        (comms, i) => {
          let scalars = fieldsFromRustFlat(prevChallengeScalars.get(i));
          return [0, scalars, comms];
        }
      );
      wasmProof.free();
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

    runtimeTablesToRust([, ...tables]: MlArray<RuntimeTable>): Uint32Array {
      return mapToUint32Array(tables, (table) =>
        unwrap(runtimeTableToRust(table))
      );
    },

    runtimeTableCfgsToRust([
      ,
      ...tableCfgs
    ]: MlArray<RuntimeTableCfg>): Uint32Array {
      return mapToUint32Array(tableCfgs, (tableCfg) =>
        unwrap(runtimeTableCfgToRust(tableCfg))
      );
    },

    lookupTablesToRust([, ...tables]: MlArray<LookupTable>) {
      return mapToUint32Array(tables, (table) =>
        unwrap(lookupTableToRust(table))
      );
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

  return function mapProofEvaluations(
    evals: ProofEvaluations<Field1>
  ): ProofEvaluations<Field2> {
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

type RemoveLeadingZero<T extends [0, ...any]> = T extends [0, ...infer U]
  ? U
  : never;
