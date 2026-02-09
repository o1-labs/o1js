import { MlArray, MlOption, MlTuple } from '../../../lib/ml/base.js';
import {
  fieldFromRust,
  fieldToRust,
  fieldsFromRustFlat,
  fieldsToRustFlat,
} from '../bindings/conversion-base.js';
import {
  proofEvaluationsToRust,
  proofEvaluationsFromRust,
  pointEvalsOptionToRust,
  pointEvalsOptionFromRust,
} from '../bindings/conversion-proof-shared.js';
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
} from '../bindings/kimchi-types.js';
import { ConversionCore, ConversionCores } from './napi-conversion-core.js';
import {
  arrayFrom,
  castCtor,
  type Ctor,
} from './napi-ffi.js';
import type {
  Napi,
  NapiLookupCommitments,
  NapiOpeningProof,
  NapiPoint,
  NapiPointEvaluationsObject,
  NapiPointEvaluationsObjectOption,
  NapiPoints,
  NapiPolyComm,
  NapiPolyComms,
  NapiProofClasses,
  NapiProverCommitments,
  NapiProverProof,
  NapiProofEvaluationsObject,
  NapiRuntimeTable,
  NapiRuntimeTableCfg,
  NapiLookupTable,
  NapiVecVec,
} from './napi-wrappers.js';

export { napiProofConversion };

function napiProofConversion(napi: Napi, core: ConversionCores) {
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
  }: NapiProofClasses
) {
  type NapiProverCommitmentsCtor = Ctor<
    [NapiPolyComms, NapiPolyComm, NapiPolyComm, NapiLookupCommitments | undefined],
    NapiProverCommitments
  >;
  type NapiOpeningProofCtor = Ctor<
    [NapiPoints, NapiPoints, NapiPoint, Uint8Array, Uint8Array, NapiPoint],
    NapiOpeningProof
  >;
  type NapiLookupCommitmentsCtor = Ctor<
    [NapiPolyComms, NapiPolyComm, NapiPolyComm | undefined],
    NapiLookupCommitments
  >;
  type NapiProverProofCtor = Ctor<
    [
      NapiProverCommitments,
      NapiOpeningProof,
      NapiProofEvaluationsObject,
      Uint8Array,
      Uint8Array,
      NapiVecVec,
      NapiPolyComms,
    ],
    NapiProverProof
  >;

  const ProverCommitmentsCtor = castCtor<NapiProverCommitmentsCtor>(ProverCommitments);
  const OpeningProofCtor = castCtor<NapiOpeningProofCtor>(OpeningProof);
  const LookupCommitmentsCtor = castCtor<NapiLookupCommitmentsCtor>(LookupCommitments);
  const ProverProofCtor = castCtor<NapiProverProofCtor>(ProverProof);

  function commitmentsToRust(commitments: ProverCommitments): NapiProverCommitments {
    let wComm = core.polyCommsToRust(commitments[1]);
    let zComm = core.polyCommToRust(commitments[2]);
    let tComm = core.polyCommToRust(commitments[3]);
    let lookup = MlOption.mapFrom(commitments[4], lookupCommitmentsToRust);
    return new ProverCommitmentsCtor(wComm, zComm, tComm, lookup);
  }
  function commitmentsFromRust(commitments: NapiProverCommitments): ProverCommitments {
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
    return new LookupCommitmentsCtor(sorted, aggreg, runtime);
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
    return new OpeningProofCtor(
      core.pointsToRust(l),
      core.pointsToRust(r),
      core.pointToRust(delta),
      fieldToRust(z1),
      fieldToRust(z2),
      core.pointToRust(sg)
    );
  }
  function openingProofFromRust(proof: NapiOpeningProof): OpeningProof {
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

      const pointEvalsTupleToObject = (
        pe: PointEvaluations<Uint8Array>
      ): NapiPointEvaluationsObject => {
        const [, zeta, zeta_omega] = pe;
        return {
          zeta: MlArray.from(zeta),
          zetaOmega: MlArray.from(zeta_omega),
        };
      };

      const optionPointEvalsToObject = (
        opt: MlOption<PointEvaluations<Uint8Array>>
      ): NapiPointEvaluationsObjectOption => {
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
      ] = evalsTuple;

      const lookupSortedObjs = MlArray.mapFrom(lookupSorted, (opt) =>
        opt === 0 ? undefined : pointEvalsTupleToObject(opt[1])
      );

      const evalsActual: NapiProofEvaluationsObject = {
        public: publicObj,
        w: MlTuple.mapFrom(w, pointEvalsTupleToObject),
        z: pointEvalsTupleToObject(z),
        s: MlTuple.mapFrom(s, pointEvalsTupleToObject),
        coefficients: MlTuple.mapFrom(coefficients, pointEvalsTupleToObject),

        genericSelector: pointEvalsTupleToObject(genericSelector),
        poseidonSelector: pointEvalsTupleToObject(poseidonSelector),
        completeAddSelector: pointEvalsTupleToObject(completeAddSelector),
        mulSelector: pointEvalsTupleToObject(mulSelector),
        emulSelector: pointEvalsTupleToObject(emulSelector),
        endomulScalarSelector: pointEvalsTupleToObject(endomulScalarSelector),

        rangeCheck0Selector: optionPointEvalsToObject(rangeCheck0Selector),
        rangeCheck1Selector: optionPointEvalsToObject(rangeCheck1Selector),
        foreignFieldAddSelector: optionPointEvalsToObject(foreignFieldAddSelector),
        foreignFieldMulSelector: optionPointEvalsToObject(foreignFieldMulSelector),
        xorSelector: optionPointEvalsToObject(xorSelector),
        rotSelector: optionPointEvalsToObject(rotSelector),

        lookupAggregation: optionPointEvalsToObject(lookupAggregation),
        lookupTable: optionPointEvalsToObject(lookupTable),
        lookupSorted: lookupSortedObjs,
        runtimeLookupTable: optionPointEvalsToObject(runtimeLookupTable),
        runtimeLookupTableSelector: optionPointEvalsToObject(runtimeLookupTableSelector),
        xorLookupSelector: optionPointEvalsToObject(xorLookupSelector),
        lookupGateLookupSelector: optionPointEvalsToObject(lookupGateLookupSelector),
        rangeCheckLookupSelector: optionPointEvalsToObject(rangeCheckLookupSelector),
        foreignFieldMulLookupSelector: optionPointEvalsToObject(foreignFieldMulLookupSelector),
      };

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
      return new ProverProofCtor(
        commitments,
        openingProof,
        evalsActual,
        ftEval1,
        public_,
        prevChallengeScalars,
        prevChallengeComms
      );
    },
    proofFromRust(
      napiProof: NapiProverProof
    ): ProofWithPublic {
      // If we received the full prover proof (with commitments field), use it directly.
      // Otherwise fall back to an older wrapper shape `{ proof, public_input }`.

      let commitments = commitmentsFromRust(napiProof.commitments);
      let openingProof = openingProofFromRust(napiProof.proof);
      // NAPI returns `evals` as an object with getters; convert it into the OCaml tuple shape
      // expected by `proofEvaluationsFromRust`.
      const evalsSource = napiProof.evals as NapiProofEvaluationsObject | undefined;
      const toPointEvals = (
        pe?: NapiPointEvaluationsObject | null
      ): PointEvaluations<Uint8Array> => {
        const zeta = MlArray.to(arrayFrom<Uint8Array>(pe?.zeta));
        const zetaOmega = MlArray.to(arrayFrom<Uint8Array>(pe?.zetaOmega));
        return [0, zeta, zetaOmega];
      };
      const toMlOption = <T,>(
        value: T | null | undefined,
        f: (x: T) => PointEvaluations<Uint8Array>
      ) => MlOption.mapTo(value ?? undefined, f);

      const publicEvalsBytes = toMlOption(evalsSource?.public, toPointEvals);
      const publicEvals = pointEvalsOptionFromRust(publicEvalsBytes);

      const w = MlArray.to(
        arrayFrom<NapiPointEvaluationsObject | null | undefined>(evalsSource?.w).map(
          toPointEvals
        )
      ) as MlTuple<
        PointEvaluations<Uint8Array>,
        15
      >;
      const z = toPointEvals(evalsSource?.z);
      const s = MlArray.to(
        arrayFrom<NapiPointEvaluationsObject | null | undefined>(evalsSource?.s).map(
          toPointEvals
        )
      ) as MlTuple<
        PointEvaluations<Uint8Array>,
        6
      >;
      const coefficients = MlArray.to(
        arrayFrom<NapiPointEvaluationsObject | null | undefined>(evalsSource?.coefficients).map(
          toPointEvals
        )
      ) as MlTuple<PointEvaluations<Uint8Array>, 15>;

      const lookupSorted = MlArray.mapFrom(
        [
          0,
          ...arrayFrom<NapiPointEvaluationsObject | null | undefined>(evalsSource?.lookupSorted),
        ] as MlArray<NapiPointEvaluationsObject | null | undefined>,
        (x) => toMlOption(x, toPointEvals)
      ) as MlArray<MlOption<PointEvaluations<Uint8Array>>>;

      const evalsBytes: ProofEvaluations<Uint8Array> = [
        0,
        w,
        z,
        s,
        coefficients,
        toPointEvals(evalsSource?.genericSelector),
        toPointEvals(evalsSource?.poseidonSelector),
        toPointEvals(evalsSource?.completeAddSelector),
        toPointEvals(evalsSource?.mulSelector),
        toPointEvals(evalsSource?.emulSelector),
        toPointEvals(evalsSource?.endomulScalarSelector),
        toMlOption(evalsSource?.rangeCheck0Selector, toPointEvals),
        toMlOption(evalsSource?.rangeCheck1Selector, toPointEvals),
        toMlOption(evalsSource?.foreignFieldAddSelector, toPointEvals),
        toMlOption(evalsSource?.foreignFieldMulSelector, toPointEvals),
        toMlOption(evalsSource?.xorSelector, toPointEvals),
        toMlOption(evalsSource?.rotSelector, toPointEvals),
        toMlOption(evalsSource?.lookupAggregation, toPointEvals),
        toMlOption(evalsSource?.lookupTable, toPointEvals),
        lookupSorted,
        toMlOption(evalsSource?.runtimeLookupTable, toPointEvals),
        toMlOption(
          evalsSource?.runtimeLookupTableSelector,
          toPointEvals
        ),
        toMlOption(evalsSource?.xorLookupSelector, toPointEvals),
        toMlOption(evalsSource?.lookupGateLookupSelector, toPointEvals),
        toMlOption(evalsSource?.rangeCheckLookupSelector, toPointEvals),
        toMlOption(evalsSource?.foreignFieldMulLookupSelector, toPointEvals),
      ];

      const evals = proofEvaluationsFromRust(evalsBytes);

      let ftEval1 = fieldFromRust(napiProof.ft_eval1);
      let public_ = fieldsFromRustFlat(napiProof.public_);
      let prevChallengeScalars = napiProof.prev_challenges_scalars;
      let [, ...prevChallengeComms] = core.polyCommsFromRust(
        napiProof.prev_challenges_comms
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

