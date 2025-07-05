import { MlOption } from '../../../lib/ml/base.js';
import { fieldFromRust, fieldToRust, fieldsFromRustFlat, fieldsToRustFlat, maybeFieldToRust, } from './conversion-base.js';
export { oraclesConversion };
function oraclesConversion(wasm) {
    return {
        fp: oraclesConversionPerField({
            RandomOracles: wasm.WasmFpRandomOracles,
            Oracles: wasm.WasmFpOracles,
        }),
        fq: oraclesConversionPerField({
            RandomOracles: wasm.WasmFqRandomOracles,
            Oracles: wasm.WasmFqOracles,
        }),
    };
}
function oraclesConversionPerField({ RandomOracles, Oracles }) {
    function randomOraclesToRust(ro) {
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
        return new RandomOracles(jointCombinerChal, jointCombiner, beta, gamma, alphaChal, alpha, zeta, v, u, zetaChal, vChal, uChal);
    }
    function randomOraclesFromRust(ro) {
        let jointCombinerChal = ro.joint_combiner_chal;
        let jointCombiner = ro.joint_combiner;
        let jointCombinerOption = MlOption(jointCombinerChal &&
            jointCombiner && [0, [0, fieldFromRust(jointCombinerChal)], fieldFromRust(jointCombiner)]);
        let mlRo = [
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
    return {
        oraclesToRust(oracles) {
            let [, o, pEval, openingPrechallenges, digestBeforeEvaluations] = oracles;
            return new Oracles(randomOraclesToRust(o), fieldToRust(pEval[1]), fieldToRust(pEval[2]), fieldsToRustFlat(openingPrechallenges), fieldToRust(digestBeforeEvaluations));
        },
        oraclesFromRust(oracles) {
            let mlOracles = [
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
    };
}
