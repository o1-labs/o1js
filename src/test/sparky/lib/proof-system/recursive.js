"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recursive = void 0;
const provable_js_1 = require("../provable/provable.js");
const provable_intf_js_1 = require("../provable/types/provable-intf.js");
const proof_js_1 = require("./proof.js");
const arrays_js_1 = require("../util/arrays.js");
const zkprogram_js_1 = require("./zkprogram.js");
const bool_js_1 = require("../provable/bool.js");
function Recursive(zkprogram) {
    let { publicInputType, publicOutputType, privateInputTypes: privateInputs, rawMethods: methods, } = zkprogram;
    let hasPublicInput = publicInputType !== zkprogram_js_1.Undefined && publicInputType !== zkprogram_js_1.Void;
    class SelfProof extends proof_js_1.Proof {
        static publicInputType = publicInputType;
        static publicOutputType = publicOutputType;
        static tag = () => zkprogram;
    }
    let methodKeys = Object.keys(methods);
    let regularRecursiveProvers = (0, arrays_js_1.mapToObject)(methodKeys, (key, i) => {
        return async function proveRecursively_(conditionAndConfig, publicInput, ...args) {
            let condition = conditionAndConfig instanceof bool_js_1.Bool ? conditionAndConfig : conditionAndConfig.condition;
            // create the base proof in a witness block
            let proof = await provable_js_1.Provable.witnessAsync(SelfProof, async () => {
                // move method args to constants
                let constInput = provable_js_1.Provable.toConstant(publicInputType, publicInputType.fromValue(publicInput));
                let constArgs = (0, arrays_js_1.zip)(args, privateInputs[key]).map(([arg, type]) => provable_js_1.Provable.toConstant(type, provable_intf_js_1.ProvableType.get(type).fromValue(arg)));
                if (!condition.toBoolean()) {
                    let publicOutput = provable_intf_js_1.ProvableType.synthesize(publicOutputType);
                    let maxProofsVerified = await zkprogram.maxProofsVerified();
                    return SelfProof.dummy(publicInput, publicOutput, maxProofsVerified, conditionAndConfig instanceof bool_js_1.Bool ? undefined : conditionAndConfig.domainLog2);
                }
                let prover = zkprogram[key];
                if (hasPublicInput) {
                    let { proof } = await prover(constInput, ...constArgs);
                    return proof;
                }
                else {
                    let { proof } = await prover(...constArgs);
                    return proof;
                }
            });
            // assert that the witnessed proof has the correct public input (which will be used by Pickles as part of verification)
            if (hasPublicInput) {
                provable_js_1.Provable.assertEqual(publicInputType, proof.publicInput, publicInput);
            }
            // declare and verify the proof, and return its public output
            proof.declare();
            proof.verifyIf(condition);
            return proof.publicOutput;
        };
    });
    return (0, arrays_js_1.mapObject)(regularRecursiveProvers, (prover) => {
        if (!hasPublicInput) {
            return Object.assign(((...args) => prover(new bool_js_1.Bool(true), undefined, ...args)), {
                if: (condition, ...args) => prover(condition, undefined, ...args),
            });
        }
        else {
            return Object.assign(((pi, ...args) => prover(new bool_js_1.Bool(true), pi, ...args)), {
                if: (condition, pi, ...args) => prover(condition, pi, ...args),
            });
        }
    });
}
exports.Recursive = Recursive;
