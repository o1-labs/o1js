"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.oraclesConversion = void 0;
const base_js_1 = require("../../../lib/ml/base.js");
const conversion_base_js_1 = require("./conversion-base.js");
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
exports.oraclesConversion = oraclesConversion;
function oraclesConversionPerField({ RandomOracles, Oracles }) {
    function randomOraclesToRust(ro) {
        let jointCombinerMl = base_js_1.MlOption.from(ro[1]);
        let jointCombinerChal = (0, conversion_base_js_1.maybeFieldToRust)(jointCombinerMl?.[1][1]);
        let jointCombiner = (0, conversion_base_js_1.maybeFieldToRust)(jointCombinerMl?.[2]);
        let beta = (0, conversion_base_js_1.fieldToRust)(ro[2]);
        let gamma = (0, conversion_base_js_1.fieldToRust)(ro[3]);
        let alphaChal = (0, conversion_base_js_1.fieldToRust)(ro[4][1]);
        let alpha = (0, conversion_base_js_1.fieldToRust)(ro[5]);
        let zeta = (0, conversion_base_js_1.fieldToRust)(ro[6]);
        let v = (0, conversion_base_js_1.fieldToRust)(ro[7]);
        let u = (0, conversion_base_js_1.fieldToRust)(ro[8]);
        let zetaChal = (0, conversion_base_js_1.fieldToRust)(ro[9][1]);
        let vChal = (0, conversion_base_js_1.fieldToRust)(ro[10][1]);
        let uChal = (0, conversion_base_js_1.fieldToRust)(ro[11][1]);
        return new RandomOracles(jointCombinerChal, jointCombiner, beta, gamma, alphaChal, alpha, zeta, v, u, zetaChal, vChal, uChal);
    }
    function randomOraclesFromRust(ro) {
        let jointCombinerChal = ro.joint_combiner_chal;
        let jointCombiner = ro.joint_combiner;
        let jointCombinerOption = (0, base_js_1.MlOption)(jointCombinerChal &&
            jointCombiner && [0, [0, (0, conversion_base_js_1.fieldFromRust)(jointCombinerChal)], (0, conversion_base_js_1.fieldFromRust)(jointCombiner)]);
        let mlRo = [
            0,
            jointCombinerOption,
            (0, conversion_base_js_1.fieldFromRust)(ro.beta),
            (0, conversion_base_js_1.fieldFromRust)(ro.gamma),
            [0, (0, conversion_base_js_1.fieldFromRust)(ro.alpha_chal)],
            (0, conversion_base_js_1.fieldFromRust)(ro.alpha),
            (0, conversion_base_js_1.fieldFromRust)(ro.zeta),
            (0, conversion_base_js_1.fieldFromRust)(ro.v),
            (0, conversion_base_js_1.fieldFromRust)(ro.u),
            [0, (0, conversion_base_js_1.fieldFromRust)(ro.zeta_chal)],
            [0, (0, conversion_base_js_1.fieldFromRust)(ro.v_chal)],
            [0, (0, conversion_base_js_1.fieldFromRust)(ro.u_chal)],
        ];
        // TODO: do we not want to free?
        // ro.free();
        return mlRo;
    }
    return {
        oraclesToRust(oracles) {
            let [, o, pEval, openingPrechallenges, digestBeforeEvaluations] = oracles;
            return new Oracles(randomOraclesToRust(o), (0, conversion_base_js_1.fieldToRust)(pEval[1]), (0, conversion_base_js_1.fieldToRust)(pEval[2]), (0, conversion_base_js_1.fieldsToRustFlat)(openingPrechallenges), (0, conversion_base_js_1.fieldToRust)(digestBeforeEvaluations));
        },
        oraclesFromRust(oracles) {
            let mlOracles = [
                0,
                randomOraclesFromRust(oracles.o),
                [0, (0, conversion_base_js_1.fieldFromRust)(oracles.p_eval0), (0, conversion_base_js_1.fieldFromRust)(oracles.p_eval1)],
                (0, conversion_base_js_1.fieldsFromRustFlat)(oracles.opening_prechallenges),
                (0, conversion_base_js_1.fieldFromRust)(oracles.digest_before_evaluations),
            ];
            // TODO: do we not want to free?
            // oracles.free();
            return mlOracles;
        },
    };
}
