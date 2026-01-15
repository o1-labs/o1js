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
    console.log('commitments from rust', commitments);
    let wComm = core.polyCommsFromRust(commitments.w_comm);
    let zComm = core.polyCommFromRust(commitments.z_comm);
    let tComm = core.polyCommFromRust(commitments.t_comm);
    // Normalize optional lookup to an MlOption; mapTo expects a value or undefined.
    let lookup = MlOption.mapTo(
      commitments.lookup ?? undefined,
      (lk) => lookupCommitmentsFromRust(lk)!
    );
    return [0, wComm as MlTuple<PolyComm, 15>, zComm, tComm, lookup];
  }

  function lookupCommitmentsToRust(lookup: LookupCommitments): NapiLookupCommitments {
    let sorted = core.polyCommsToRust(lookup[1]);
    let aggreg = core.polyCommToRust(lookup[2]);
    let runtime = MlOption.mapFrom(lookup[3], core.polyCommToRust);
    return new LookupCommitments(sorted as any, aggreg as any, runtime as any);
  }
  function lookupCommitmentsFromRust(
    lookup: NapiLookupCommitments | null | undefined
  ): LookupCommitments | undefined {
    if (lookup == null) return undefined;
    let sorted = core.polyCommsFromRust(lookup.sorted);
    let aggreg = core.polyCommFromRust(lookup.aggreg);
    let runtime = MlOption.mapTo(lookup.runtime ?? undefined, core.polyCommFromRust);
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
      // NAPI expects proof evaluations as a plain object (camelCase keys), not an OCaml tuple.
      // This matches the `#[napi(object)] Wasm*ProofEvaluationsObject` accepted by Rust via
      // `FromNapiValue` for `Wasm*ProofEvaluations`.
      const evalsTuple = proofEvaluationsToRust(proof[3]);
      const publicEvalsTuple = pointEvalsOptionToRust(public_evals);

      const pointEvalsTupleToObject = (pe: any) => {
        const [, zeta, zeta_omega] = pe as any;
        const zetaOmega = MlArray.from(zeta_omega);
        return {
          zeta: MlArray.from(zeta),
          // napi-rs `#[napi(object)]` usually exposes `zeta_omega` as `zetaOmega`, but
          // accept both spellings to be robust across versions/bindings.
          zetaOmega,
          zeta_omega: zetaOmega,
        };
      };

      const optionPointEvalsToObject = (opt: any) => {
        if (opt == null || opt === 0) return undefined;
        return pointEvalsTupleToObject(opt[1]);
      };

      const publicObj =
        publicEvalsTuple === 0 ? undefined : pointEvalsTupleToObject(publicEvalsTuple[1]);

      const [
        ,
        w,
        z,
        s,
        coefficients,
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
      ] = evalsTuple as any;

      const evalsActual = {
        public: publicObj,
        w: (w as any[]).slice(1).map(pointEvalsTupleToObject),
        z: pointEvalsTupleToObject(z),
        s: (s as any[]).slice(1).map(pointEvalsTupleToObject),
        coefficients: (coefficients as any[]).slice(1).map(pointEvalsTupleToObject),

        // Include both camelCase and snake_case keys so `#[napi(object)]` decoding works
        // regardless of whether the binding expects renaming.
        genericSelector: pointEvalsTupleToObject(genericSelector),
        generic_selector: pointEvalsTupleToObject(genericSelector),
        poseidonSelector: pointEvalsTupleToObject(poseidonSelector),
        poseidon_selector: pointEvalsTupleToObject(poseidonSelector),
        completeAddSelector: pointEvalsTupleToObject(completeAddSelector),
        complete_add_selector: pointEvalsTupleToObject(completeAddSelector),
        mulSelector: pointEvalsTupleToObject(mulSelector),
        mul_selector: pointEvalsTupleToObject(mulSelector),
        emulSelector: pointEvalsTupleToObject(emulSelector),
        emul_selector: pointEvalsTupleToObject(emulSelector),
        endomulScalarSelector: pointEvalsTupleToObject(endomulScalarSelector),
        endomul_scalar_selector: pointEvalsTupleToObject(endomulScalarSelector),

        rangeCheck0Selector: optionPointEvalsToObject(rangeCheck0Selector),
        range_check0_selector: optionPointEvalsToObject(rangeCheck0Selector),
        rangeCheck1Selector: optionPointEvalsToObject(rangeCheck1Selector),
        range_check1_selector: optionPointEvalsToObject(rangeCheck1Selector),
        foreignFieldAddSelector: optionPointEvalsToObject(foreignFieldAddSelector),
        foreign_field_add_selector: optionPointEvalsToObject(foreignFieldAddSelector),
        foreignFieldMulSelector: optionPointEvalsToObject(foreignFieldMulSelector),
        foreign_field_mul_selector: optionPointEvalsToObject(foreignFieldMulSelector),
        xorSelector: optionPointEvalsToObject(xorSelector),
        xor_selector: optionPointEvalsToObject(xorSelector),
        rotSelector: optionPointEvalsToObject(rotSelector),
        rot_selector: optionPointEvalsToObject(rotSelector),

        lookupAggregation: optionPointEvalsToObject(lookupAggregation),
        lookup_aggregation: optionPointEvalsToObject(lookupAggregation),
        lookupTable: optionPointEvalsToObject(lookupTable),
        lookup_table: optionPointEvalsToObject(lookupTable),
        lookupSorted: MlArray.from(lookupSorted).map((opt: any) =>
          opt === 0 ? undefined : pointEvalsTupleToObject(opt[1])
        ),
        lookup_sorted: MlArray.from(lookupSorted).map((opt: any) =>
          opt === 0 ? undefined : pointEvalsTupleToObject(opt[1])
        ),
        runtimeLookupTable: optionPointEvalsToObject(runtimeLookupTable),
        runtime_lookup_table: optionPointEvalsToObject(runtimeLookupTable),
        runtimeLookupTableSelector: optionPointEvalsToObject(runtimeLookupTableSelector),
        runtime_lookup_table_selector: optionPointEvalsToObject(runtimeLookupTableSelector),
        xorLookupSelector: optionPointEvalsToObject(xorLookupSelector),
        xor_lookup_selector: optionPointEvalsToObject(xorLookupSelector),
        lookupGateLookupSelector: optionPointEvalsToObject(lookupGateLookupSelector),
        lookup_gate_lookup_selector: optionPointEvalsToObject(lookupGateLookupSelector),
        rangeCheckLookupSelector: optionPointEvalsToObject(rangeCheckLookupSelector),
        range_check_lookup_selector: optionPointEvalsToObject(rangeCheckLookupSelector),
        foreignFieldMulLookupSelector: optionPointEvalsToObject(foreignFieldMulLookupSelector),
        foreign_field_mul_lookup_selector: optionPointEvalsToObject(foreignFieldMulLookupSelector),
      } as any;

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
      try {
        return new ProverProof(
          commitments,
          openingProof,
          evalsActual,
          ftEval1,
          public_,
          prevChallengeScalars,
          prevChallengeComms as any
        );
      } catch (err) {
        const w0 = (evalsActual as any)?.w?.[0];
        const z = (evalsActual as any)?.z;
        console.error('napi-conversion-proof: ProverProof ctor failed', {
          err,
          evalsKeys: Object.keys(evalsActual ?? {}),
          wIsArray: Array.isArray((evalsActual as any)?.w),
          wLen: (evalsActual as any)?.w?.length,
          w0Keys: w0 ? Object.keys(w0) : undefined,
          w0ZetaIsArray: Array.isArray(w0?.zeta),
          w0ZetaOmegaIsArray: Array.isArray(w0?.zetaOmega),
          zKeys: z ? Object.keys(z) : undefined,
          zZetaIsArray: Array.isArray(z?.zeta),
          zZetaOmegaIsArray: Array.isArray(z?.zetaOmega),
          lookupSortedIsArray: Array.isArray((evalsActual as any)?.lookupSorted),
          lookupSortedLen: (evalsActual as any)?.lookupSorted?.length,
        });
        throw err;
      }
    },
    proofFromRust(wasmProof: any): ProofWithPublic {
      // If we received the full prover proof (with commitments field), use it directly.
      // Otherwise fall back to an older wrapper shape `{ proof, public_input }`.
      console.log('wasmProof', wasmProof);
      const innerProof =
        wasmProof && wasmProof.commitments ? wasmProof : wasmProof.proof ?? wasmProof;
      console.log('innerProof', innerProof);
      let commitments = commitmentsFromRust(innerProof.commitments);
      let openingProof = openingProofFromRust(innerProof.proof);
      // NAPI returns `evals` as an object with getters; convert it into the OCaml tuple shape
      // expected by `proofEvaluationsFromRust`.
      const evalsSource: any = innerProof.evals;
      console.log('evalsSource', evalsSource);
      // Avoid `getNapi`/`requireNapi` helpers; access fields directly.
      const toArray = (value: any): any[] => (value == null ? [] : Array.from(value));
      const toPointEvals = (pe: any) => {
        const zeta = MlArray.to(toArray((pe as any).zeta ?? (pe as any).zeta_));
        const zetaOmega = MlArray.to(
          toArray((pe as any).zeta_omega ?? (pe as any).zetaOmega ?? (pe as any).zetaomega)
        );
        return [0, zeta, zetaOmega] as any;
      };
      const toMlOption = (value: any, f: (x: any) => any) =>
        MlOption.mapTo(value ?? undefined, f);

      const publicEvalsBytes = toMlOption((evalsSource as any).public, toPointEvals);
      const publicEvals = pointEvalsOptionFromRust(publicEvalsBytes);

      const w = [0, ...toArray((evalsSource as any).w).map(toPointEvals)] as any;
      const z = toPointEvals((evalsSource as any).z);
      const s = [0, ...toArray((evalsSource as any).s).map(toPointEvals)] as any;
      const coefficients = [
        0,
        ...toArray((evalsSource as any).coefficients).map(toPointEvals),
      ] as any;

      const evalsBytes: ProofEvaluations<Uint8Array> = [
        0,
        w,
        z,
        s,
        coefficients,
        toPointEvals((evalsSource as any).generic_selector ?? (evalsSource as any).genericSelector),
        toPointEvals((evalsSource as any).poseidon_selector ?? (evalsSource as any).poseidonSelector),
        toPointEvals(
          (evalsSource as any).complete_add_selector ?? (evalsSource as any).completeAddSelector
        ),
        toPointEvals((evalsSource as any).mul_selector ?? (evalsSource as any).mulSelector),
        toPointEvals((evalsSource as any).emul_selector ?? (evalsSource as any).emulSelector),
        toPointEvals(
          (evalsSource as any).endomul_scalar_selector ??
            (evalsSource as any).endomulScalarSelector
        ),
        toMlOption(
          (evalsSource as any).range_check0_selector ?? (evalsSource as any).rangeCheck0Selector,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).range_check1_selector ?? (evalsSource as any).rangeCheck1Selector,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).foreign_field_add_selector ??
            (evalsSource as any).foreignFieldAddSelector,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).foreign_field_mul_selector ??
            (evalsSource as any).foreignFieldMulSelector,
          toPointEvals
        ),
        toMlOption((evalsSource as any).xor_selector ?? (evalsSource as any).xorSelector, toPointEvals),
        toMlOption((evalsSource as any).rot_selector ?? (evalsSource as any).rotSelector, toPointEvals),
        toMlOption(
          (evalsSource as any).lookup_aggregation ?? (evalsSource as any).lookupAggregation,
          toPointEvals
        ),
        toMlOption((evalsSource as any).lookup_table ?? (evalsSource as any).lookupTable, toPointEvals),
        [
          0,
          ...toArray((evalsSource as any).lookup_sorted ?? (evalsSource as any).lookupSorted).map(
            (x) => toMlOption(x, toPointEvals)
          ),
        ] as any,
        toMlOption(
          (evalsSource as any).runtime_lookup_table ?? (evalsSource as any).runtimeLookupTable,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).runtime_lookup_table_selector ??
            (evalsSource as any).runtimeLookupTableSelector,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).xor_lookup_selector ?? (evalsSource as any).xorLookupSelector,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).lookup_gate_lookup_selector ??
            (evalsSource as any).lookupGateLookupSelector,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).range_check_lookup_selector ??
            (evalsSource as any).rangeCheckLookupSelector,
          toPointEvals
        ),
        toMlOption(
          (evalsSource as any).foreign_field_mul_lookup_selector ??
            (evalsSource as any).foreignFieldMulLookupSelector,
          toPointEvals
        ),
      ];

      const evals = proofEvaluationsFromRust(evalsBytes);

      let ftEval1 = fieldFromRust(innerProof.ft_eval1);
      let public_ = fieldsFromRustFlat(innerProof.public_);
      let prevChallengeScalars = innerProof.prev_challenges_scalars;
      let [, ...prevChallengeComms] = core.polyCommsFromRust(
        innerProof.prev_challenges_comms
      );
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
