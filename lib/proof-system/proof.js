"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractProofTypes = exports.extractProofs = exports.dummyProof = exports.DynamicProof = exports.Proof = exports.ProofBase = void 0;
const bindings_js_1 = require("../../bindings.js");
const bindings_js_2 = require("../../bindings.js");
const wrapped_js_1 = require("../provable/wrapped.js");
const feature_flags_js_1 = require("./feature-flags.js");
const assert_js_1 = require("../util/assert.js");
const unconstrained_js_1 = require("../provable/types/unconstrained.js");
const provable_intf_js_1 = require("../provable/types/provable-intf.js");
const zkprogram_context_js_1 = require("./zkprogram-context.js");
class ProofBase {
    /**
     * To verify a recursive proof inside a ZkProgram method, it has to be "declared" as part of
     * the method. This is done by calling `declare()` on the proof.
     *
     * Note: `declare()` is a low-level method that most users will not have to call directly.
     * For proofs that are inputs to the ZkProgram, it is done automatically.
     *
     * You can think of declaring a proof as a similar step as witnessing a variable, which introduces
     * that variable to the circuit. Declaring a proof will tell Pickles to add the additional constraints
     * for recursive proof verification.
     *
     * Similar to `Provable.witness()`, `declare()` is a no-op when run outside ZkProgram compilation or proving.
     * It returns `false` in that case, and `true` if the proof was actually declared.
     */
    declare() {
        if (!zkprogram_context_js_1.ZkProgramContext.has())
            return false;
        const ProofClass = this.constructor;
        zkprogram_context_js_1.ZkProgramContext.declareProof({ ProofClass, proofInstance: this });
        return true;
    }
    toJSON() {
        let fields = this.publicFields();
        return {
            publicInput: fields.input.map(String),
            publicOutput: fields.output.map(String),
            maxProofsVerified: this.maxProofsVerified,
            proof: bindings_js_2.Pickles.proofToBase64([this.maxProofsVerified, this.proof]),
        };
    }
    constructor({ proof, publicInput, publicOutput, maxProofsVerified, }) {
        this.shouldVerify = (0, wrapped_js_1.Bool)(false);
        this.publicInput = publicInput;
        this.publicOutput = publicOutput;
        this.proof = proof; // TODO optionally convert from string?
        this.maxProofsVerified = maxProofsVerified;
    }
    static get provable() {
        if (this.publicInputType === undefined || this.publicOutputType === undefined) {
            throw Error(`You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
                `class MyProof extends Proof<PublicInput, PublicOutput> { ... }`);
        }
        return provableProof(this, this.publicInputType, this.publicOutputType, this.maxProofsVerified);
    }
    static publicFields(value) {
        let fields = this.provable.toFields(value);
        let inputSize = this.publicInputType.sizeInFields();
        return {
            input: fields.slice(0, inputSize),
            output: fields.slice(inputSize),
        };
    }
    publicFields() {
        return this.constructor.publicFields(this);
    }
    static _proofFromBase64(proofString, maxProofsVerified) {
        assertBindingsInitialized();
        return bindings_js_2.Pickles.proofOfBase64(proofString, maxProofsVerified)[1];
    }
    static _proofToBase64(proof, maxProofsVerified) {
        assertBindingsInitialized();
        return bindings_js_2.Pickles.proofToBase64([maxProofsVerified, proof]);
    }
}
exports.ProofBase = ProofBase;
ProofBase.publicInputType = undefined;
ProofBase.publicOutputType = undefined;
ProofBase.tag = () => {
    throw Error(`You cannot use the \`Proof\` class directly. Instead, define a subclass:\n` +
        `class MyProof extends Proof<PublicInput, PublicOutput> { ... }`);
};
class Proof extends ProofBase {
    /**
     * Sets the `shouldVerify` flag to `true`
     * The downstream effect of this is that the proof will be verified when the circuit is run
     *
     * @note This method is meant to be called in a circuit.  Executing it outside of a circuit will have no effect.
     */
    verify() {
        this.shouldVerify = (0, wrapped_js_1.Bool)(true);
    }
    /**
     * Sets the `shouldVerify` flag to the given condition param
     * If set to `Bool(true)`, the proof will be verified when the circuit is run
     * If set to `Bool(false)`, the proof will not be verified when the circuit is run
     *
     * @note This method is meant to be called in a circuit.  Executing it outside of a circuit will have no effect.
     */
    verifyIf(condition) {
        this.shouldVerify = condition;
    }
    static async fromJSON({ maxProofsVerified, proof: proofString, publicInput: publicInputJson, publicOutput: publicOutputJson, }) {
        await (0, bindings_js_1.initializeBindings)();
        let [, proof] = bindings_js_2.Pickles.proofOfBase64(proofString, maxProofsVerified);
        let fields = publicInputJson.map(wrapped_js_1.Field).concat(publicOutputJson.map(wrapped_js_1.Field));
        return this.provable.fromFields(fields, [[], [], [proof, maxProofsVerified]]);
    }
    /**
     * Dummy proof. This can be useful for ZkPrograms that handle the base case in the same
     * method as the inductive case, using a pattern like this:
     *
     * ```ts
     * method(proof: SelfProof<I, O>, isRecursive: Bool) {
     *   proof.verifyIf(isRecursive);
     *   // ...
     * }
     * ```
     *
     * To use such a method in the base case, you need a dummy proof:
     *
     * ```ts
     * let dummy = await MyProof.dummy(publicInput, publicOutput, 1);
     * await myProgram.myMethod(dummy, Bool(false));
     * ```
     *
     * **Note**: The types of `publicInput` and `publicOutput`, as well as the `maxProofsVerified` parameter,
     * must match your ZkProgram. `maxProofsVerified` is the maximum number of proofs that any of your methods take as arguments.
     */
    static async dummy(publicInput, publicOutput, maxProofsVerified, domainLog2 = 14) {
        let dummyRaw = await dummyProof(maxProofsVerified, domainLog2);
        return new this({
            publicInput,
            publicOutput,
            proof: dummyRaw,
            maxProofsVerified,
        });
    }
    static get provable() {
        return super.provable;
    }
}
exports.Proof = Proof;
let sideloadedKeysCounter = 0;
/**
 * The `DynamicProof` class enables circuits to verify proofs using in-ciruit verification keys.
 * This is opposed to the baked-in verification keys of the `Proof` class.
 *
 * In order to use this, a subclass of DynamicProof that specifies the public input and output types along with the maxProofsVerified number has to be created.
 *
 * ```ts
 * export class SideloadedProgramProof extends DynamicProof<MyStruct, Field> {
 *   static publicInputType = MyStruct;
 *   static publicOutputType = Field;
 *   static maxProofsVerified = 0 as const;
 * }
 * ```
 *
 * The `maxProofsVerified` constant is a product of the child circuit and indicates the maximum number that that circuit verifies itself.
 * If you are unsure about what that is for you, you should use `2`.
 *
 * Any `DynamicProof` subclass can be used as private input to ZkPrograms or SmartContracts along with a `VerificationKey` input.
 * ```ts
 * proof.verify(verificationKey)
 * ```
 *
 * NOTE: In the case of `DynamicProof`s, the circuit makes no assertions about the verificationKey used on its own.
 * This is the responsibility of the application developer and should always implement appropriate checks.
 * This pattern differs a lot from the usage of normal `Proof`, where the verification key is baked into the compiled circuit.
 * @see {@link src/examples/zkprogram/dynamic-keys-merkletree.ts} for an example of how this can be done using merkle trees
 *
 * Assertions generally only happen using the vk hash that is part of the `VerificationKey` struct along with the raw vk data as auxiliary data.
 * When using verify() on a `DynamicProof`, Pickles makes sure that the verification key data matches the hash.
 * Therefore all manual assertions have to be made on the vk's hash and it can be assumed that the vk's data is checked to match the hash if it is used with verify().
 */
class DynamicProof extends ProofBase {
    static tag() {
        let counter;
        if (this.memoizedCounter !== undefined) {
            counter = this.memoizedCounter;
        }
        else {
            counter = sideloadedKeysCounter++;
            this.memoizedCounter = counter;
        }
        return { name: `o1js-sideloaded-${counter}` };
    }
    /**
     * Sets the `shouldVerify` flag to `true`
     * The downstream effect of this is that the proof will be verified when the circuit is run
     *
     * @param vk The verification key this proof will be verified against
     *
     * @note This method is meant to be called in a circuit.  Executing it outside of a circuit will have no effect.
     * @note The vk parameter will have its auxiliary data checked in the circuit, so the hash must match the data, or else the proof will fail
     */
    verify(vk) {
        this.shouldVerify = (0, wrapped_js_1.Bool)(true);
        this.usedVerificationKey = vk;
    }
    /**
     * Sets the `shouldVerify` flag to the given condition param
     * If set to `Bool(true)`, the proof will be verified when the circuit is run
     * If set to `Bool(false)`, the proof will not be verified when the circuit is run
     *
     * @param vk The verification key this proof will be verified against
     * @param condition The condition to set the shouldVerify flag to
     *
     * @note This method is meant to be called in a circuit.  Executing it outside of a circuit will have no effect.
     * @note The vk parameter will have its auxiliary data checked in the circuit, so the hash must match the data, or else the proof will fail
     */
    verifyIf(vk, condition) {
        this.shouldVerify = condition;
        this.usedVerificationKey = vk;
    }
    static async fromJSON({ maxProofsVerified, proof: proofString, publicInput: publicInputJson, publicOutput: publicOutputJson, }) {
        await (0, bindings_js_1.initializeBindings)();
        let [, proof] = bindings_js_2.Pickles.proofOfBase64(proofString, maxProofsVerified);
        let fields = publicInputJson.map(wrapped_js_1.Field).concat(publicOutputJson.map(wrapped_js_1.Field));
        return this.provable.fromFields(fields, [[], [], [proof, maxProofsVerified]]);
    }
    static async dummy(publicInput, publicOutput, maxProofsVerified, domainLog2 = 14) {
        return this.fromProof(await Proof.dummy(publicInput, publicOutput, maxProofsVerified, domainLog2));
    }
    /**
     * Converts a Proof into a DynamicProof carrying over all relevant data.
     * This method can be used to convert a Proof computed by a ZkProgram
     * into a DynamicProof that is accepted in a circuit that accepts DynamicProofs
     */
    static fromProof(proof) {
        return new this({
            publicInput: proof.publicInput,
            publicOutput: proof.publicOutput,
            maxProofsVerified: proof.maxProofsVerified,
            proof: proof.proof,
        });
    }
    static get provable() {
        return super.provable;
    }
}
exports.DynamicProof = DynamicProof;
/**
 * As the name indicates, feature flags are features of the proof system.
 *
 * If we want to side load proofs and verification keys, we first have to tell Pickles what _shape_ of proofs it should expect.
 *
 * For example, if we want to side load proofs that use foreign field arithmetic custom gates, we have to make Pickles aware of that by defining
 * these custom gates.
 *
 * _Note:_ Only proofs that use the exact same composition of custom gates which were expected by Pickles can be verified using side loading.
 * If you want to verify _any_ proof, no matter what custom gates it uses, you can use {@link FeatureFlags.allMaybe}. Please note that this might incur a significant overhead.
 *
 * You can also toggle specific feature flags manually by specifying them here.
 * Alternatively, you can use {@link FeatureFlags.fromZkProgram} to compute the set of feature flags that are compatible with a given program.
 */
DynamicProof.featureFlags = feature_flags_js_1.FeatureFlags.allNone;
async function dummyProof(maxProofsVerified, domainLog2) {
    await (0, bindings_js_1.initializeBindings)();
    return (0, bindings_js_1.withThreadPool)(async () => bindings_js_2.Pickles.dummyProof(maxProofsVerified, domainLog2)[1]);
}
exports.dummyProof = dummyProof;
function provableProof(Class, input, output, defaultMaxProofsVerified) {
    return {
        sizeInFields() {
            return input.sizeInFields() + output.sizeInFields();
        },
        toFields(value) {
            return input.toFields(value.publicInput).concat(output.toFields(value.publicOutput));
        },
        toAuxiliary(value) {
            let inputAux = input.toAuxiliary(value?.publicInput);
            let outputAux = output.toAuxiliary(value?.publicOutput);
            let proofAux = [
                value?.proof ?? undefined,
                value?.maxProofsVerified ?? defaultMaxProofsVerified ?? 0,
            ];
            return [inputAux, outputAux, proofAux];
        },
        fromFields(fields, aux) {
            let inputFields = fields.slice(0, input.sizeInFields());
            let outputFields = fields.slice(input.sizeInFields());
            (0, assert_js_1.assert)(outputFields.length === output.sizeInFields());
            let [inputAux, outputAux, [proof, maxProofsVerified]] = aux;
            let publicInput = input.fromFields(inputFields, inputAux);
            let publicOutput = output.fromFields(outputFields, outputAux);
            return new Class({
                publicInput,
                publicOutput,
                proof,
                maxProofsVerified,
            });
        },
        check(value) {
            input.check(value.publicInput);
            output.check(value.publicOutput);
        },
        toValue(value) {
            let inputV = input.toValue(value.publicInput);
            let outputV = output.toValue(value.publicOutput);
            return {
                publicInput: inputV,
                publicOutput: outputV,
                proof: value.proof,
                maxProofsVerified: value.maxProofsVerified,
            };
        },
        fromValue(value) {
            let inputT = input.fromValue(value.publicInput);
            let outputT = output.fromValue(value.publicOutput);
            return new Class({
                publicInput: inputT,
                publicOutput: outputT,
                proof: value.proof,
                maxProofsVerified: value.maxProofsVerified,
            });
        },
    };
}
function extractProofs(value) {
    if (value instanceof ProofBase) {
        return [value];
    }
    if (value instanceof unconstrained_js_1.Unconstrained)
        return [];
    if (value instanceof wrapped_js_1.Field)
        return [];
    if (value instanceof wrapped_js_1.Bool)
        return [];
    if (Array.isArray(value)) {
        return value.flatMap((item) => extractProofs(item));
    }
    if (value === null)
        return [];
    if (typeof value === 'object') {
        return extractProofs(Object.values(value));
    }
    // functions, primitives
    return [];
}
exports.extractProofs = extractProofs;
function extractProofTypes(type) {
    let value = provable_intf_js_1.ProvableType.synthesize(type);
    let proofValues = extractProofs(value);
    return proofValues.map((proof) => proof.constructor);
}
exports.extractProofTypes = extractProofTypes;
function assertBindingsInitialized() {
    (0, assert_js_1.assert)(bindings_js_1.areBindingsInitialized, 'Bindings are not initialized. Try calling `await initializeBindings()` first.');
}
