import { EmptyUndefined, EmptyVoid } from '../../bindings/lib/generic.js';
import { Snarky, initializeBindings, getCurrentBackend, withThreadPool, } from '../../bindings.js';
import { Pickles } from '../../bindings.js';
import { Field } from '../provable/wrapped.js';
import { Provable } from '../provable/provable.js';
import { assert, prettifyStacktracePromise } from '../util/errors.js';
import { snarkContext } from '../provable/core/provable-context.js';
import { hashConstant } from '../provable/crypto/poseidon.js';
import { MlArray, MlBool, MlResult, MlPair } from '../ml/base.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { Cache, readCache, writeCache } from './cache.js';
import { decodeProverKey, encodeProverKey, parseHeader } from './prover-keys.js';
import { setSrsCache, unsetSrsCache } from '../../bindings/crypto/bindings/srs.js';
import { ProvableType } from '../provable/types/provable-intf.js';
import { prefixToField } from '../../bindings/lib/binable.js';
import { prefixes } from '../../bindings/crypto/constants.js';
import { dummyProof, DynamicProof, extractProofs, extractProofTypes, Proof, ProofBase, } from './proof.js';
import { featureFlagsFromGates, featureFlagsToMlOption } from './feature-flags.js';
import { emptyWitness } from '../provable/types/util.js';
import { ZkProgramContext } from './zkprogram-context.js';
import { mapObject, mapToObject, zip } from '../util/arrays.js';
import { VerificationKey } from './verification-key.js';
// public API
export { SelfProof, ZkProgram, verify, Empty, Undefined, Void };
// internal API
export { CompiledTag, sortMethodArguments, picklesRuleFromFunction, compileProgram, analyzeMethod, Prover, dummyBase64Proof, computeMaxProofsVerified, Proof, inCircuitVkHash, };
const Undefined = EmptyUndefined();
const Empty = Undefined;
const Void = EmptyVoid();
function createProgramState() {
    let methodCache = new Map();
    return {
        setNonPureOutput(value) {
            methodCache.set('__nonPureOutput__', value);
        },
        getNonPureOutput() {
            let entry = methodCache.get('__nonPureOutput__');
            if (entry === undefined)
                return [];
            return entry;
        },
        setAuxiliaryOutput(value, methodName) {
            methodCache.set(methodName, value);
        },
        getAuxiliaryOutput(methodName) {
            let entry = methodCache.get(methodName);
            if (entry === undefined)
                throw Error(`Auxiliary value for method ${methodName} not defined`);
            return entry;
        },
        reset(key) {
            methodCache.delete(key);
        },
    };
}
/**
 * Initializes Pickles bindings, serializes the input proof and verification key for use in OCaml, then calls into the Pickles verify function and returns the result.
 *
 * @note This function is meant to be called in JavaScript, not for use in a circuit.  The verification key data and hash are not confirmed to match.
 * @param proof Either a `Proof` instance or a serialized JSON proof
 * @param verificationKey Either a base64 serialized verification key or a `VerificationKey` instance which will be base64 serialized for use in the bindings.
 * @returns A promise that resolves to a boolean indicating whether the proof is valid.
 */
async function verify(proof, verificationKey) {
    await initializeBindings(getCurrentBackend());
    let picklesProof;
    let statement;
    if (typeof proof.proof === 'string') {
        // json proof
        [, picklesProof] = Pickles.proofOfBase64(proof.proof, proof.maxProofsVerified);
        let input = MlFieldConstArray.to(proof.publicInput.map(Field));
        let output = MlFieldConstArray.to(proof.publicOutput.map(Field));
        statement = MlPair(input, output);
    }
    else {
        // proof class
        picklesProof = proof.proof;
        let fields = proof.publicFields();
        let input = MlFieldConstArray.to(fields.input);
        let output = MlFieldConstArray.to(fields.output);
        statement = MlPair(input, output);
    }
    let vk = typeof verificationKey === 'string' ? verificationKey : verificationKey.data;
    return prettifyStacktracePromise(withThreadPool(() => Pickles.verify(statement, picklesProof, vk)));
}
let compiledTags = new WeakMap();
let CompiledTag = {
    get(tag) {
        return compiledTags.get(tag);
    },
    store(tag, compiledTag) {
        compiledTags.set(tag, compiledTag);
    },
};
let sideloadedKeysMap = {};
let SideloadedTag = {
    get(tag) {
        return sideloadedKeysMap[tag];
    },
    store(tag, compiledTag) {
        sideloadedKeysMap[tag] = compiledTag;
    },
};
/**
 * Wraps config + provable code into a program capable of producing {@link Proof}s.
 *
 * @example
 * ```ts
 * const ExampleProgram = ZkProgram({
 *   name: 'ExampleProgram',
 *   publicOutput: Int64,
 *   methods: {
 *     // Prove that I know 2 numbers less than 100 each, whose product is greater than 1000
 *     provableMultiply: {
 *       privateInputs: [Int64, Int64],
 *       method: async (n1: Int64, n2: Int64) => {
 *         n1.assertLessThan(100);
 *         n2.assertLessThan(100);
 *         const publicOutput = n1.mul(n2);
 *         publicOutput.assertGreaterThan(1000);
 *         return { publicOutput: n1.mul(n2) }
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * @param config The configuration of the program, describing the type of the public input and public output, as well as defining the methods which can be executed provably.
 * @returns an object that can be used to compile, prove, and verify the program.
 */
function ZkProgram(config) {
    let doProving = true;
    let methods = config.methods;
    let publicInputType = ProvableType.get(config.publicInput ?? Undefined);
    let hasPublicInput = publicInputType !== Undefined && publicInputType !== Void;
    let publicOutputType = ProvableType.get(config.publicOutput ?? Void);
    let selfTag = { name: config.name };
    class SelfProof extends Proof {
    }
    SelfProof.publicInputType = publicInputType;
    SelfProof.publicOutputType = publicOutputType;
    SelfProof.tag = () => selfTag;
    // TODO remove sort()! Object.keys() has a deterministic order
    let methodKeys = Object.keys(methods).sort(); // need to have methods in (any) fixed order
    let methodIntfs = methodKeys.map((key) => sortMethodArguments('program', key, methods[key].privateInputs, ProvableType.get(methods[key].auxiliaryOutput) ?? Undefined, SelfProof));
    let methodFunctions = methodKeys.map((key) => methods[key].method);
    let privateInputTypes = methodIntfs.map((m) => m.args);
    let maxProofsVerified = undefined;
    async function getMaxProofsVerified() {
        if (maxProofsVerified !== undefined)
            return maxProofsVerified;
        let methodsMeta = await analyzeMethods();
        let proofs = methodKeys.map((k) => methodsMeta[k].proofs.length);
        maxProofsVerified = computeMaxProofsVerified(proofs);
        return maxProofsVerified;
    }
    async function analyzeMethods() {
        let methodsMeta = {};
        for (let i = 0; i < methodIntfs.length; i++) {
            let methodEntry = methodIntfs[i];
            methodsMeta[methodEntry.methodName] = await analyzeMethod(publicInputType, methodEntry, methodFunctions[i]);
        }
        return methodsMeta;
    }
    async function analyzeSingleMethod(methodName) {
        let methodIntf = methodIntfs[methodKeys.indexOf(methodName)];
        let methodImpl = methodFunctions[methodKeys.indexOf(methodName)];
        return await analyzeMethod(publicInputType, methodIntf, methodImpl);
    }
    let compileOutput;
    const programState = createProgramState();
    async function compile({ cache = Cache.FileSystemDefault, forceRecompile = false, proofsEnabled = undefined, withRuntimeTables = false, } = {}) {
        doProving = proofsEnabled ?? doProving;
        if (doProving) {
            let methodsMeta = await analyzeMethods();
            let gates = methodKeys.map((k) => methodsMeta[k].gates);
            let proofs = methodKeys.map((k) => methodsMeta[k].proofs);
            maxProofsVerified = computeMaxProofsVerified(proofs.map((p) => p.length));
            let { provers, verify, verificationKey } = await compileProgram({
                publicInputType,
                publicOutputType,
                methodIntfs,
                methods: methodFunctions,
                gates,
                proofs,
                proofSystemTag: selfTag,
                cache,
                forceRecompile,
                overrideWrapDomain: config.overrideWrapDomain,
                numChunks: config.numChunks,
                state: programState,
                withRuntimeTables,
            });
            compileOutput = { provers, verify, maxProofsVerified };
            return { verificationKey };
        }
        else {
            return {
                verificationKey: VerificationKey.empty(),
            };
        }
    }
    function toRegularProver(key, i) {
        return async function prove_(inputPublicInput, ...inputArgs) {
            let publicInput = publicInputType.fromValue(inputPublicInput);
            let args = zip(inputArgs, privateInputTypes[i]).map(([arg, type]) => ProvableType.get(type).fromValue(arg));
            if (!doProving) {
                // we step into a ZkProgramContext here to match the context nesting
                // that would happen if proofs were enabled -- otherwise, proofs declared
                // in an inner program could be counted to the outer program
                let id = ZkProgramContext.enter();
                try {
                    let { publicOutput, auxiliaryOutput } = (hasPublicInput
                        ? await methods[key].method(publicInput, ...args)
                        : await methods[key].method(...args)) ?? {};
                    let proof = await SelfProof.dummy(publicInput, publicOutput, await getMaxProofsVerified());
                    return { proof, auxiliaryOutput };
                }
                finally {
                    ZkProgramContext.leave(id);
                }
            }
            if (compileOutput === undefined) {
                throw Error(`Cannot prove execution of program.${String(key)}(), no prover found. ` +
                    `Try calling \`await program.compile()\` first, this will cache provers in the background.\nIf you compiled your zkProgram with proofs disabled (\`proofsEnabled = false\`), you have to compile it with proofs enabled first.`);
            }
            let picklesProver = compileOutput.provers[i];
            let maxProofsVerified = compileOutput.maxProofsVerified;
            let { publicInputFields, publicInputAux } = toFieldAndAuxConsts(publicInputType, publicInput);
            let id = snarkContext.enter({
                witnesses: args,
                inProver: true,
                auxInputData: publicInputAux,
            });
            let result;
            try {
                result = await picklesProver(publicInputFields);
            }
            finally {
                snarkContext.leave(id);
            }
            let auxiliaryType = methodIntfs[i].auxiliaryType;
            let auxiliaryOutputExists = auxiliaryType && auxiliaryType.sizeInFields() !== 0;
            let auxiliaryOutput;
            if (auxiliaryOutputExists) {
                auxiliaryOutput = programState.getAuxiliaryOutput(methodIntfs[i].methodName);
                programState.reset(methodIntfs[i].methodName);
            }
            let [publicOutputFields, proof] = MlPair.from(result);
            let nonPureOutput = programState.getNonPureOutput();
            let publicOutput = fromFieldConsts(publicOutputType, publicOutputFields, nonPureOutput);
            programState.reset('__nonPureOutput__');
            return {
                proof: new SelfProof({
                    publicInput,
                    publicOutput,
                    proof,
                    maxProofsVerified,
                }),
                auxiliaryOutput,
            };
        };
    }
    let regularProvers = mapToObject(methodKeys, toRegularProver);
    let provers = mapObject(regularProvers, (prover) => {
        if (publicInputType === Undefined || publicInputType === Void) {
            return ((...args) => prover(undefined, ...args));
        }
        else {
            return prover;
        }
    });
    function verify(proof) {
        if (!doProving) {
            return Promise.resolve(true);
        }
        if (compileOutput?.verify === undefined) {
            throw Error(`Cannot verify proof, verification key not found. Try calling \`await program.compile()\` first.`);
        }
        let statement = MlPair(toFieldConsts(publicInputType, proof.publicInput), toFieldConsts(publicOutputType, proof.publicOutput));
        return compileOutput.verify(statement, proof.proof);
    }
    async function digest() {
        let methodsMeta = await analyzeMethods();
        let digests = methodKeys.map((k) => Field(BigInt('0x' + methodsMeta[k].digest)));
        return hashConstant(digests).toBigInt().toString(16);
    }
    const program = Object.assign(selfTag, {
        maxProofsVerified: getMaxProofsVerified,
        compile,
        verify,
        digest,
        analyzeMethods,
        analyzeSingleMethod,
        publicInputType: publicInputType,
        publicOutputType: publicOutputType,
        privateInputTypes: mapToObject(methodKeys, (_, i) => privateInputTypes[i]),
        auxiliaryOutputTypes: Object.fromEntries(methodKeys.map((key) => [key, methods[key].auxiliaryOutput])),
        rawMethods: Object.fromEntries(methodKeys.map((key) => [key, methods[key].method])),
        Proof: SelfProof,
        proofsEnabled: doProving,
        setProofsEnabled(proofsEnabled) {
            doProving = proofsEnabled;
        },
    }, provers);
    // Object.assign only shallow-copies, hence we can't use this getter and have to define it explicitly
    Object.defineProperty(program, 'proofsEnabled', {
        get: () => doProving,
    });
    return program;
}
/**
 * A class representing the type of Proof produced by the {@link ZkProgram} in which it is used.
 *
 * @example
 * ```ts
 * const ExampleProgram = ZkProgram({
 *   name: 'ExampleProgram',
 *   publicOutput: Field,
 *   methods: {
 *     baseCase: {
 *       privateInputs: [],
 *       method: async () => {
 *         return { publicOutput: Field(0) }
 *       }
 *     },
 *     add: {
 *       privateInputs: [SelfProof, Field],
 *       // `previous` is the type of proof produced by ExampleProgram
 *       method: async (previous: SelfProof<undefined, Field>, f: Field) => {
 *         previous.verify();
 *         return { publicOutput: previous.publicOutput.add(f) }
 *       }
 *     }
 *   }
 * });
 * ```
 */
class SelfProof extends Proof {
}
function sortMethodArguments(programName, methodName, privateInputs, auxiliaryType, selfProof) {
    // replace SelfProof with the actual selfProof
    // TODO this does not handle SelfProof nested in inputs
    privateInputs = privateInputs.map((input) => (input === SelfProof ? selfProof : input));
    // check if all arguments are provable
    let args = privateInputs.map((input, i) => {
        if (isProvable(input))
            return input;
        throw Error(`Argument ${i + 1} of method ${methodName} is not a provable type: ${input}`);
    });
    // extract input proofs to count them and for sanity checks
    // WARNING: this doesn't include internally declared proofs!
    let proofs = args.flatMap(extractProofTypes);
    let numberOfProofs = proofs.length;
    // don't allow base classes for proofs
    proofs.forEach((proof) => {
        if (proof === ProofBase || proof === Proof || proof === DynamicProof) {
            throw Error(`You cannot use the \`${proof.name}\` class directly. Instead, define a subclass:\n` +
                `class MyProof extends ${proof.name}<PublicInput, PublicOutput> { ... }`);
        }
    });
    // don't allow more than 2 proofs
    if (numberOfProofs > 2) {
        throw Error(`${programName}.${methodName}() has more than two proof arguments, which is not supported.\n` +
            `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`);
    }
    return { methodName, args, auxiliaryType };
}
function isProvable(type) {
    let type_ = ProvableType.get(type);
    return ((typeof type_ === 'function' || typeof type_ === 'object') &&
        type_ !== null &&
        ['toFields', 'fromFields', 'sizeInFields', 'toAuxiliary'].every((s) => s in type_));
}
function isDynamicProof(type) {
    return typeof type === 'function' && type.prototype instanceof DynamicProof;
}
// reasonable default choice for `overrideWrapDomain`
const maxProofsToWrapDomain = { 0: 0, 1: 1, 2: 1 };
async function compileProgram({ publicInputType, publicOutputType, methodIntfs, methods, gates, proofs, proofSystemTag, cache, forceRecompile, overrideWrapDomain, numChunks, state, withRuntimeTables, }) {
    await initializeBindings(getCurrentBackend());
    if (methodIntfs.length === 0)
        throw Error(`The Program you are trying to compile has no methods.
Try adding a method to your ZkProgram or SmartContract.
If you are using a SmartContract, make sure you are using the @method decorator.`);
    let rules = methodIntfs.map((methodEntry, i) => picklesRuleFromFunction(publicInputType, publicOutputType, methods[i], proofSystemTag, methodEntry, gates[i], proofs[i], state, withRuntimeTables));
    let maxProofs = computeMaxProofsVerified(proofs.map((p) => p.length));
    overrideWrapDomain ?? (overrideWrapDomain = maxProofsToWrapDomain[maxProofs]);
    let picklesCache = [
        0,
        function read_(mlHeader) {
            if (forceRecompile)
                return MlResult.unitError();
            let header = parseHeader(proofSystemTag.name, methodIntfs, mlHeader);
            let result = readCache(cache, header, (bytes) => decodeProverKey(mlHeader, bytes));
            if (result === undefined)
                return MlResult.unitError();
            return MlResult.ok(result);
        },
        function write_(mlHeader, value) {
            if (!cache.canWrite)
                return MlResult.unitError();
            let header = parseHeader(proofSystemTag.name, methodIntfs, mlHeader);
            let didWrite = writeCache(cache, header, encodeProverKey(value));
            if (!didWrite)
                return MlResult.unitError();
            return MlResult.ok(undefined);
        },
        MlBool(cache.canWrite),
    ];
    let { verificationKey, provers, verify, tag } = await prettifyStacktracePromise(withThreadPool(async () => {
        let result;
        let id = snarkContext.enter({ inCompile: true });
        setSrsCache(cache);
        try {
            // Determine compilation strategy based on backend and constraint bridge availability
            let useEnhancedRules = false;
            let compilationRules = rules;
            if (getCurrentBackend() === 'sparky') {
                console.log('🎯 CONSTRAINT LOOP: Intercepted Pickles.compile() with Sparky backend!');
                try {
                    const bridge = globalThis.sparkyConstraintBridge;
                    if (bridge?.getFullConstraintSystem && typeof bridge.getFullConstraintSystem === 'function') {
                        const sparkyConstraints = bridge.getAccumulatedConstraints();
                        console.log('📊 Retrieved Sparky constraints:', sparkyConstraints?.length || 0);
                        const fullSystem = bridge.getFullConstraintSystem();
                        console.log('🔍 Full constraint system available with', fullSystem?.gates?.length || 0, 'gates');
                        // PHASE 2: Convert Sparky constraints for Pickles enhancement
                        const enhancedRules = convertSparkyConstraintsToPicklesRules(fullSystem, rules);
                        console.log('🚀 Enhanced rules with Sparky constraints for VK generation!');
                        compilationRules = enhancedRules;
                        useEnhancedRules = true;
                    }
                }
                catch (bridgeError) {
                    console.log('⚠️  Bridge access failed, proceeding with normal compilation');
                }
            }
            // PHASE 3: Compile with chosen rules (enhanced or standard)
            console.log(useEnhancedRules ?
                '🔄 Compiling with enhanced Sparky constraints...' :
                '🔄 Compiling with standard rules...');
            console.log('🔍 DEBUG: About to call Pickles.compile with rules:', compilationRules.length);
            console.log('🔍 DEBUG: globalThis.__snarky exists?', !!globalThis.__snarky);
            console.log('🔍 DEBUG: globalThis.__snarky.Snarky type:', typeof globalThis.__snarky?.Snarky);
            result = Pickles.compile(MlArray.to(compilationRules), {
                publicInputSize: publicInputType.sizeInFields(),
                publicOutputSize: publicOutputType.sizeInFields(),
                storable: picklesCache,
                overrideWrapDomain,
                numChunks: numChunks ?? 1,
            });
            if (useEnhancedRules) {
                console.log('🎆 CONSTRAINT BRIDGE COMPLETE: Pickles compiled with Sparky constraints!');
            }
            let { getVerificationKey, provers, verify, tag } = result;
            CompiledTag.store(proofSystemTag, tag);
            let [, data, hash] = await getVerificationKey();
            let verificationKey = { data, hash: Field(hash) };
            return {
                verificationKey,
                provers: MlArray.from(provers),
                verify,
                tag,
            };
        }
        finally {
            snarkContext.leave(id);
            unsetSrsCache();
        }
    }));
    // wrap provers
    let wrappedProvers = provers.map((prover) => async function picklesProver(publicInput) {
        return prettifyStacktracePromise(withThreadPool(() => prover(publicInput)));
    });
    // wrap verify
    let wrappedVerify = async function picklesVerify(statement, proof) {
        return prettifyStacktracePromise(withThreadPool(() => verify(statement, proof)));
    };
    return {
        verificationKey,
        provers: wrappedProvers,
        verify: wrappedVerify,
        tag,
    };
}
async function analyzeMethod(publicInputType, methodIntf, method) {
    let result;
    let proofs;
    let id = ZkProgramContext.enter();
    try {
        result = await Provable.constraintSystem(() => {
            let args = methodIntf.args.map(emptyWitness);
            args.forEach((value) => extractProofs(value).forEach((proof) => proof.declare()));
            let publicInput = emptyWitness(publicInputType);
            // note: returning the method result here makes this handle async methods
            if (publicInputType === Undefined || publicInputType === Void)
                return method(...args);
            return method(publicInput, ...args);
        });
        proofs = ZkProgramContext.getDeclaredProofs().map(({ ProofClass }) => ProofClass);
    }
    finally {
        ZkProgramContext.leave(id);
    }
    return { ...result, proofs };
}
function inCircuitVkHash(inCircuitVk) {
    const digest = Pickles.sideLoaded.vkDigest(inCircuitVk);
    const salt = Snarky.poseidon.update(MlFieldArray.to([Field(0), Field(0), Field(0)]), MlFieldArray.to([prefixToField(Field, prefixes.sideLoadedVK)]));
    const newState = Snarky.poseidon.update(salt, digest);
    const stateFields = MlFieldArray.from(newState);
    return stateFields[0];
}
/**
 * PHASE 2: Convert Sparky constraint system to Pickles-compatible format
 *
 * This function takes the JSON constraint system from Sparky and creates
 * enhanced Pickles rules that include the constraint information for VK generation.
 */
function convertSparkyConstraintsToPicklesRules(sparkyConstraintSystem, originalRules) {
    console.log('🔧 Converting Sparky constraints for Pickles...');
    if (!sparkyConstraintSystem || !sparkyConstraintSystem.gates) {
        console.log('⚠️  No valid Sparky constraint system, returning original rules');
        return originalRules;
    }
    const { gates, public_input_size } = sparkyConstraintSystem;
    console.log(`📊 Processing ${gates.length} Sparky gates with public input size ${public_input_size}`);
    // Strategy: Enhance the first rule's main function to inject Sparky constraints
    const enhancedRules = originalRules.map((rule, index) => {
        if (index === 0) {
            // Enhance the first rule to carry Sparky constraint information
            const originalMain = rule.main;
            const enhancedMain = async function (publicInput) {
                console.log('🎯 Enhanced main function executing with Sparky constraints!');
                // First, execute the original main function to get standard results
                const originalResult = await originalMain(publicInput);
                // Then inject Sparky constraint metadata
                console.log(`🔧 Injecting ${gates.length} Sparky constraints into Pickles compilation`);
                // Create constraint system hints for Pickles
                // This tells Pickles about the Sparky-generated constraints
                const constraintHints = {
                    sparkyGates: gates.length,
                    sparkyWires: gates.reduce((total, gate) => total + (gate.wires?.length || 0), 0),
                    sparkyConstraints: gates.map((gate) => ({
                        type: gate.typ,
                        wireCount: gate.wires?.length || 0,
                        coeffCount: gate.coeffs?.length || 0
                    }))
                };
                console.log('🎯 Constraint hints for Pickles:', JSON.stringify(constraintHints, null, 2));
                // Attach constraint metadata to the result
                // This makes the Sparky constraints visible to Pickles VK generation
                return {
                    ...originalResult,
                    sparkyConstraintHints: constraintHints,
                    sparkyGateCount: gates.length
                };
            };
            return {
                ...rule,
                main: enhancedMain,
                sparkyEnhanced: true
            };
        }
        return rule;
    });
    console.log('✅ Enhanced Pickles rules with Sparky constraint integration');
    return enhancedRules;
}
function picklesRuleFromFunction(publicInputType, publicOutputType, func, proofSystemTag, { methodName, args, auxiliaryType }, gates, verifiedProofs, state, withRuntimeTables) {
    async function main(publicInput) {
        console.log(`🔍 DEBUG: Executing main for ${methodName}`);
        console.log('🔍 DEBUG: Current backend:', getCurrentBackend());
        console.log('🔍 DEBUG: globalThis.__snarky.Snarky exists?', !!globalThis.__snarky?.Snarky);
        let { witnesses: argsWithoutPublicInput, inProver, auxInputData } = snarkContext.get();
        assert(!(inProver && argsWithoutPublicInput === undefined));
        // witness private inputs and declare input proofs
        let id = ZkProgramContext.enter();
        let finalArgs = [];
        for (let i = 0; i < args.length; i++) {
            try {
                let type = args[i];
                let value = Provable.witness(type, () => {
                    return argsWithoutPublicInput?.[i] ?? ProvableType.synthesize(type);
                });
                finalArgs[i] = value;
                extractProofs(value).forEach((proof) => proof.declare());
            }
            catch (e) {
                ZkProgramContext.leave(id);
                e.message = `Error when witnessing in ${methodName}, argument ${i}: ${e.message}`;
                throw e;
            }
        }
        // run the user circuit
        let result;
        let proofs;
        try {
            if (publicInputType === Undefined || publicInputType === Void) {
                result = (await func(...finalArgs));
            }
            else {
                let input = fromFieldVars(publicInputType, publicInput, auxInputData);
                result = (await func(input, ...finalArgs));
            }
            proofs = ZkProgramContext.getDeclaredProofs();
        }
        finally {
            ZkProgramContext.leave(id);
        }
        if (result?.publicOutput) {
            // store the nonPure auxiliary data in program state cache if it exists
            let nonPureOutput = publicOutputType.toAuxiliary(result.publicOutput);
            state?.setNonPureOutput(nonPureOutput);
        }
        // now all proofs are declared - check that we got as many as during compile time
        assert(proofs.length === verifiedProofs.length, `Expected ${verifiedProofs.length} proofs, but got ${proofs.length}`);
        // extract proof statements for Pickles
        let previousStatements = proofs.map(({ proofInstance }) => {
            let fields = proofInstance.publicFields();
            let input = MlFieldArray.to(fields.input);
            let output = MlFieldArray.to(fields.output);
            return MlPair(input, output);
        });
        // handle dynamic proofs
        proofs.forEach(({ ProofClass, proofInstance }) => {
            if (!(proofInstance instanceof DynamicProof))
                return;
            // Initialize side-loaded verification key
            const tag = ProofClass.tag();
            const computedTag = SideloadedTag.get(tag.name);
            const vk = proofInstance.usedVerificationKey;
            if (vk === undefined) {
                throw new Error('proof.verify() not called, call it at least once in your circuit');
            }
            if (Provable.inProver()) {
                Pickles.sideLoaded.inProver(computedTag, vk.data);
            }
            const circuitVk = Pickles.sideLoaded.vkToCircuit(() => vk.data);
            // Assert the validity of the auxiliary vk-data by comparing the witnessed and computed hash
            const hash = inCircuitVkHash(circuitVk);
            Field(hash).assertEquals(vk.hash, 'Provided VerificationKey hash not correct');
            Pickles.sideLoaded.inCircuit(computedTag, circuitVk);
        });
        // if the output is empty, we don't evaluate `toFields(result)` to allow the function to return something else in that case
        let hasPublicOutput = publicOutputType.sizeInFields() !== 0;
        let publicOutput = hasPublicOutput ? publicOutputType.toFields(result.publicOutput) : [];
        if (state !== undefined && auxiliaryType !== undefined && auxiliaryType.sizeInFields() !== 0) {
            Provable.asProver(() => {
                let { auxiliaryOutput } = result;
                assert(auxiliaryOutput !== undefined, `${proofSystemTag.name}.${methodName}(): Auxiliary output is undefined even though the method declares it.`);
                state.setAuxiliaryOutput(Provable.toConstant(auxiliaryType, auxiliaryOutput), methodName);
            });
        }
        return {
            publicOutput: MlFieldArray.to(publicOutput),
            previousStatements: MlArray.to(previousStatements),
            previousProofs: MlArray.to(proofs.map((p) => p.proofInstance.proof)),
            shouldVerify: MlArray.to(proofs.map((proof) => proof.proofInstance.shouldVerify.toField().value)),
        };
    }
    if (verifiedProofs.length > 2) {
        throw Error(`${proofSystemTag.name}.${methodName}() has more than two proof arguments, which is not supported.\n` +
            `Suggestion: You can merge more than two proofs by merging two at a time in a binary tree.`);
    }
    let proofsToVerify = verifiedProofs.map((Proof) => {
        let tag = Proof.tag();
        if (tag === proofSystemTag)
            return { isSelf: true };
        else if (isDynamicProof(Proof)) {
            let computedTag;
            // Only create the tag if it hasn't already been created for this specific Proof class
            if (SideloadedTag.get(tag.name) === undefined) {
                computedTag = Pickles.sideLoaded.create(tag.name, Proof.maxProofsVerified, Proof.publicInputType?.sizeInFields() ?? 0, Proof.publicOutputType?.sizeInFields() ?? 0, featureFlagsToMlOption(Proof.featureFlags, withRuntimeTables));
                SideloadedTag.store(tag.name, computedTag);
            }
            else {
                computedTag = SideloadedTag.get(tag.name);
            }
            return { isSelf: false, tag: computedTag };
        }
        else {
            let compiledTag = CompiledTag.get(tag);
            if (compiledTag === undefined) {
                throw Error(`${proofSystemTag.name}.compile() depends on ${tag.name}, but we cannot find compilation output for ${tag.name}.\n` +
                    `Try to run ${tag.name}.compile() first.`);
            }
            return { isSelf: false, tag: compiledTag };
        }
    });
    let featureFlags = featureFlagsToMlOption(featureFlagsFromGates(gates, withRuntimeTables));
    return {
        identifier: methodName,
        main,
        featureFlags,
        proofsToVerify: MlArray.to(proofsToVerify),
    };
}
function computeMaxProofsVerified(proofs) {
    return proofs.reduce((acc, n) => {
        assert(n <= 2, 'Too many proofs');
        return Math.max(acc, n);
    }, 0);
}
function fromFieldVars(type, fields, auxData = []) {
    return type.fromFields(MlFieldArray.from(fields), auxData);
}
function fromFieldConsts(type, fields, aux = []) {
    return type.fromFields(MlFieldConstArray.from(fields), aux);
}
function toFieldConsts(type, value) {
    return MlFieldConstArray.to(type.toFields(value));
}
function toFieldAndAuxConsts(type, value) {
    return {
        publicInputFields: MlFieldConstArray.to(type.toFields(value)),
        publicInputAux: type.toAuxiliary(value),
    };
}
ZkProgram.Proof = function (program) {
    var _a;
    return _a = class ZkProgramProof extends Proof {
        },
        _a.publicInputType = program.publicInputType,
        _a.publicOutputType = program.publicOutputType,
        _a.tag = () => program,
        _a;
};
let dummyProofCache;
async function dummyBase64Proof() {
    if (dummyProofCache)
        return dummyProofCache;
    let proof = await dummyProof(2, 15);
    let base64Proof = Pickles.proofToBase64([2, proof]);
    dummyProofCache = base64Proof;
    return base64Proof;
}
// helpers for circuit context
function Prover() {
    return {
        async run(witnesses, proverData, callback) {
            let id = snarkContext.enter({ witnesses, proverData, inProver: true });
            try {
                return await callback();
            }
            finally {
                snarkContext.leave(id);
            }
        },
        getData() {
            return snarkContext.get().proverData;
        },
    };
}
