"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proofConversion = void 0;
const base_js_1 = require("../../../lib/ml/base.js");
const conversion_base_js_1 = require("./conversion-base.js");
const conversion_core_js_1 = require("./conversion-core.js");
const fieldToRust_ = (x) => (0, conversion_base_js_1.fieldToRust)(x);
const proofEvaluationsToRust = mapProofEvaluations(fieldToRust_);
const proofEvaluationsFromRust = mapProofEvaluations(conversion_base_js_1.fieldFromRust);
const pointEvalsOptionToRust = mapPointEvalsOption(fieldToRust_);
const pointEvalsOptionFromRust = mapPointEvalsOption(conversion_base_js_1.fieldFromRust);
function proofConversion(wasm, core) {
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
exports.proofConversion = proofConversion;
function proofConversionPerField(core, { ProverCommitments, OpeningProof, VecVec, ProverProof, LookupCommitments, RuntimeTable, RuntimeTableCfg, LookupTable, }) {
    function commitmentsToRust(commitments) {
        let wComm = core.polyCommsToRust(commitments[1]);
        let zComm = core.polyCommToRust(commitments[2]);
        let tComm = core.polyCommToRust(commitments[3]);
        let lookup = base_js_1.MlOption.mapFrom(commitments[4], lookupCommitmentsToRust);
        return new ProverCommitments(wComm, zComm, tComm, lookup);
    }
    function commitmentsFromRust(commitments) {
        let wComm = core.polyCommsFromRust(commitments.w_comm);
        let zComm = core.polyCommFromRust(commitments.z_comm);
        let tComm = core.polyCommFromRust(commitments.t_comm);
        let lookup = base_js_1.MlOption.mapTo(commitments.lookup, lookupCommitmentsFromRust);
        commitments.free();
        return [0, wComm, zComm, tComm, lookup];
    }
    function lookupCommitmentsToRust(lookup) {
        let sorted = core.polyCommsToRust(lookup[1]);
        let aggreg = core.polyCommToRust(lookup[2]);
        let runtime = base_js_1.MlOption.mapFrom(lookup[3], core.polyCommToRust);
        return new LookupCommitments(sorted, aggreg, runtime);
    }
    function lookupCommitmentsFromRust(lookup) {
        let sorted = core.polyCommsFromRust(lookup.sorted);
        let aggreg = core.polyCommFromRust(lookup.aggreg);
        let runtime = base_js_1.MlOption.mapTo(lookup.runtime, core.polyCommFromRust);
        lookup.free();
        return [0, sorted, aggreg, runtime];
    }
    function openingProofToRust(proof) {
        let [_, [, ...lr], delta, z1, z2, sg] = proof;
        // We pass l and r as separate vectors over the FFI
        let l = [0];
        let r = [0];
        for (let [, li, ri] of lr) {
            l.push(li);
            r.push(ri);
        }
        return new OpeningProof(core.pointsToRust(l), core.pointsToRust(r), core.pointToRust(delta), (0, conversion_base_js_1.fieldToRust)(z1), (0, conversion_base_js_1.fieldToRust)(z2), core.pointToRust(sg));
    }
    function openingProofFromRust(proof) {
        let [, ...l] = core.pointsFromRust(proof.lr_0);
        let [, ...r] = core.pointsFromRust(proof.lr_1);
        let n = l.length;
        if (n !== r.length)
            throw Error('openingProofFromRust: l and r length mismatch.');
        let lr = l.map((li, i) => [0, li, r[i]]);
        let delta = core.pointFromRust(proof.delta);
        let z1 = (0, conversion_base_js_1.fieldFromRust)(proof.z1);
        let z2 = (0, conversion_base_js_1.fieldFromRust)(proof.z2);
        let sg = core.pointFromRust(proof.sg);
        proof.free();
        return [0, [0, ...lr], delta, z1, z2, sg];
    }
    function runtimeTableToRust([, id, data]) {
        return new RuntimeTable(id, core.vectorToRust(data));
    }
    function runtimeTableCfgToRust([, id, firstColumn]) {
        return new RuntimeTableCfg(id, core.vectorToRust(firstColumn));
    }
    function lookupTableToRust([, id, [, ...data]]) {
        let n = data.length;
        let wasmData = new VecVec(n);
        for (let i = 0; i < n; i++) {
            wasmData.push((0, conversion_base_js_1.fieldsToRustFlat)(data[i]));
        }
        return new LookupTable(id, wasmData);
    }
    return {
        proofToRust([, public_evals, proof]) {
            let commitments = commitmentsToRust(proof[1]);
            let openingProof = openingProofToRust(proof[2]);
            let [, ...evals] = proofEvaluationsToRust(proof[3]);
            let publicEvals = pointEvalsOptionToRust(public_evals);
            // TODO typed as `any` in wasm-bindgen, this has the correct type
            let evalsActual = [0, publicEvals, ...evals];
            let ftEval1 = (0, conversion_base_js_1.fieldToRust)(proof[4]);
            let public_ = (0, conversion_base_js_1.fieldsToRustFlat)(proof[5]);
            let [, ...prevChallenges] = proof[6];
            let n = prevChallenges.length;
            let prevChallengeScalars = new VecVec(n);
            let prevChallengeCommsMl = [0];
            for (let [, scalars, comms] of prevChallenges) {
                prevChallengeScalars.push((0, conversion_base_js_1.fieldsToRustFlat)(scalars));
                prevChallengeCommsMl.push(comms);
            }
            let prevChallengeComms = core.polyCommsToRust(prevChallengeCommsMl);
            return new ProverProof(commitments, openingProof, evalsActual, ftEval1, public_, prevChallengeScalars, prevChallengeComms);
        },
        proofFromRust(wasmProof) {
            let commitments = commitmentsFromRust(wasmProof.commitments);
            let openingProof = openingProofFromRust(wasmProof.proof);
            // TODO typed as `any` in wasm-bindgen, this is the correct type
            let [, wasmPublicEvals, ...wasmEvals] = wasmProof.evals;
            let publicEvals = pointEvalsOptionFromRust(wasmPublicEvals);
            let evals = proofEvaluationsFromRust([0, ...wasmEvals]);
            let ftEval1 = (0, conversion_base_js_1.fieldFromRust)(wasmProof.ft_eval1);
            let public_ = (0, conversion_base_js_1.fieldsFromRustFlat)(wasmProof.public_);
            let prevChallengeScalars = wasmProof.prev_challenges_scalars;
            let [, ...prevChallengeComms] = core.polyCommsFromRust(wasmProof.prev_challenges_comms);
            let prevChallenges = prevChallengeComms.map((comms, i) => {
                let scalars = (0, conversion_base_js_1.fieldsFromRustFlat)(prevChallengeScalars.get(i));
                return [0, scalars, comms];
            });
            wasmProof.free();
            let proof = [
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
        runtimeTablesToRust([, ...tables]) {
            return (0, conversion_core_js_1.mapToUint32Array)(tables, (table) => (0, conversion_core_js_1.unwrap)(runtimeTableToRust(table)));
        },
        runtimeTableCfgsToRust([, ...tableCfgs]) {
            return (0, conversion_core_js_1.mapToUint32Array)(tableCfgs, (tableCfg) => (0, conversion_core_js_1.unwrap)(runtimeTableCfgToRust(tableCfg)));
        },
        lookupTablesToRust([, ...tables]) {
            return (0, conversion_core_js_1.mapToUint32Array)(tables, (table) => (0, conversion_core_js_1.unwrap)(lookupTableToRust(table)));
        },
    };
}
function createMapPointEvals(map) {
    return (evals) => {
        let [, zeta, zeta_omega] = evals;
        return [0, base_js_1.MlArray.map(zeta, map), base_js_1.MlArray.map(zeta_omega, map)];
    };
}
function mapPointEvalsOption(map) {
    return (evals) => base_js_1.MlOption.map(evals, createMapPointEvals(map));
}
function mapProofEvaluations(map) {
    const mapPointEvals = createMapPointEvals(map);
    const mapPointEvalsOption = (evals) => base_js_1.MlOption.map(evals, mapPointEvals);
    return function mapProofEvaluations(evals) {
        let [, w, z, s, coeffs, genericSelector, poseidonSelector, completeAddSelector, mulSelector, emulSelector, endomulScalarSelector, rangeCheck0Selector, rangeCheck1Selector, foreignFieldAddSelector, foreignFieldMulSelector, xorSelector, rotSelector, lookupAggregation, lookupTable, lookupSorted, runtimeLookupTable, runtimeLookupTableSelector, xorLookupSelector, lookupGateLookupSelector, rangeCheckLookupSelector, foreignFieldMulLookupSelector,] = evals;
        return [
            0,
            base_js_1.MlTuple.map(w, mapPointEvals),
            mapPointEvals(z),
            base_js_1.MlTuple.map(s, mapPointEvals),
            base_js_1.MlTuple.map(coeffs, mapPointEvals),
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
            base_js_1.MlArray.map(lookupSorted, mapPointEvalsOption),
            mapPointEvalsOption(runtimeLookupTable),
            mapPointEvalsOption(runtimeLookupTableSelector),
            mapPointEvalsOption(xorLookupSelector),
            mapPointEvalsOption(lookupGateLookupSelector),
            mapPointEvalsOption(rangeCheckLookupSelector),
            mapPointEvalsOption(foreignFieldMulLookupSelector),
        ];
    };
}
