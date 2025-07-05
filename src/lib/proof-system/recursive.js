import { Provable } from '../provable/provable.js';
import { ProvableType } from '../provable/types/provable-intf.js';
import { Proof } from './proof.js';
import { mapObject, mapToObject, zip } from '../util/arrays.js';
import { Undefined, Void } from './zkprogram.js';
import { Bool } from '../provable/bool.js';
export { Recursive };
function Recursive(zkprogram) {
    let { publicInputType, publicOutputType, privateInputTypes: privateInputs, rawMethods: methods, } = zkprogram;
    let hasPublicInput = publicInputType !== Undefined && publicInputType !== Void;
    class SelfProof extends Proof {
    }
    SelfProof.publicInputType = publicInputType;
    SelfProof.publicOutputType = publicOutputType;
    SelfProof.tag = () => zkprogram;
    let methodKeys = Object.keys(methods);
    let regularRecursiveProvers = mapToObject(methodKeys, (key, i) => {
        return async function proveRecursively_(conditionAndConfig, publicInput, ...args) {
            let condition = conditionAndConfig instanceof Bool ? conditionAndConfig : conditionAndConfig.condition;
            // create the base proof in a witness block
            let proof = await Provable.witnessAsync(SelfProof, async () => {
                // move method args to constants
                let constInput = Provable.toConstant(publicInputType, publicInputType.fromValue(publicInput));
                let constArgs = zip(args, privateInputs[key]).map(([arg, type]) => Provable.toConstant(type, ProvableType.get(type).fromValue(arg)));
                if (!condition.toBoolean()) {
                    let publicOutput = ProvableType.synthesize(publicOutputType);
                    let maxProofsVerified = await zkprogram.maxProofsVerified();
                    return SelfProof.dummy(publicInput, publicOutput, maxProofsVerified, conditionAndConfig instanceof Bool ? undefined : conditionAndConfig.domainLog2);
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
                Provable.assertEqual(publicInputType, proof.publicInput, publicInput);
            }
            // declare and verify the proof, and return its public output
            proof.declare();
            proof.verifyIf(condition);
            return proof.publicOutput;
        };
    });
    return mapObject(regularRecursiveProvers, (prover) => {
        if (!hasPublicInput) {
            return Object.assign(((...args) => prover(new Bool(true), undefined, ...args)), {
                if: (condition, ...args) => prover(condition, undefined, ...args),
            });
        }
        else {
            return Object.assign(((pi, ...args) => prover(new Bool(true), pi, ...args)), {
                if: (condition, pi, ...args) => prover(condition, pi, ...args),
            });
        }
    });
}
