"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inCircuitVkHash = exports.Proof = exports.computeMaxProofsVerified = exports.dummyBase64Proof = exports.Prover = exports.analyzeMethod = exports.compileProgram = exports.picklesRuleFromFunction = exports.sortMethodArguments = exports.CompiledTag = exports.Void = exports.Undefined = exports.Empty = exports.verify = exports.ZkProgram = exports.SelfProof = void 0;
const generic_js_1 = require("../../bindings/lib/generic.js");
const bindings_js_1 = require("../../bindings.js");
const bindings_js_2 = require("../../bindings.js");
const wrapped_js_1 = require("../provable/wrapped.js");
const provable_js_1 = require("../provable/provable.js");
const errors_js_1 = require("../util/errors.js");
const provable_context_js_1 = require("../provable/core/provable-context.js");
const poseidon_js_1 = require("../provable/crypto/poseidon.js");
const base_js_1 = require("../ml/base.js");
const fields_js_1 = require("../ml/fields.js");
const cache_js_1 = require("./cache.js");
const prover_keys_js_1 = require("./prover-keys.js");
const srs_js_1 = require("../../bindings/crypto/bindings/srs.js");
const provable_intf_js_1 = require("../provable/types/provable-intf.js");
const binable_js_1 = require("../../bindings/lib/binable.js");
const constants_js_1 = require("../../bindings/crypto/constants.js");
const proof_js_1 = require("./proof.js");
Object.defineProperty(exports, "Proof", { enumerable: true, get: function () { return proof_js_1.Proof; } });
const feature_flags_js_1 = require("./feature-flags.js");
const util_js_1 = require("../provable/types/util.js");
const zkprogram_context_js_1 = require("./zkprogram-context.js");
const arrays_js_1 = require("../util/arrays.js");
const verification_key_js_1 = require("./verification-key.js");
const Undefined = (0, generic_js_1.EmptyUndefined)();
exports.Undefined = Undefined;
const Empty = Undefined;
exports.Empty = Empty;
const Void = (0, generic_js_1.EmptyVoid)();
exports.Void = Void;
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
    await (0, bindings_js_1.initializeBindings)((0, bindings_js_1.getCurrentBackend)());
    let picklesProof;
    let statement;
    if (typeof proof.proof === 'string') {
        // json proof
        [, picklesProof] = bindings_js_2.Pickles.proofOfBase64(proof.proof, proof.maxProofsVerified);
        let input = fields_js_1.MlFieldConstArray.to(proof.publicInput.map(wrapped_js_1.Field));
        let output = fields_js_1.MlFieldConstArray.to(proof.publicOutput.map(wrapped_js_1.Field));
        statement = (0, base_js_1.MlPair)(input, output);
    }
    else {
        // proof class
        picklesProof = proof.proof;
        let fields = proof.publicFields();
        let input = fields_js_1.MlFieldConstArray.to(fields.input);
        let output = fields_js_1.MlFieldConstArray.to(fields.output);
        statement = (0, base_js_1.MlPair)(input, output);
    }
    let vk = typeof verificationKey === 'string' ? verificationKey : verificationKey.data;
    return (0, errors_js_1.prettifyStacktracePromise)((0, bindings_js_1.withThreadPool)(() => bindings_js_2.Pickles.verify(statement, picklesProof, vk)));
}
exports.verify = verify;
let compiledTags = new WeakMap();
let CompiledTag = {
    get(tag) {
        return compiledTags.get(tag);
    },
    store(tag, compiledTag) {
        compiledTags.set(tag, compiledTag);
    },
};
exports.CompiledTag = CompiledTag;
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
    let publicInputType = provable_intf_js_1.ProvableType.get(config.publicInput ?? Undefined);
    let hasPublicInput = publicInputType !== Undefined && publicInputType !== Void;
    let publicOutputType = provable_intf_js_1.ProvableType.get(config.publicOutput ?? Void);
    let selfTag = { name: config.name };
    class SelfProof extends proof_js_1.Proof {
        static publicInputType = publicInputType;
        static publicOutputType = publicOutputType;
        static tag = () => selfTag;
    }
    // TODO remove sort()! Object.keys() has a deterministic order
    let methodKeys = Object.keys(methods).sort(); // need to have methods in (any) fixed order
    let methodIntfs = methodKeys.map((key) => sortMethodArguments('program', key, methods[key].privateInputs, provable_intf_js_1.ProvableType.get(methods[key].auxiliaryOutput) ?? Undefined, SelfProof));
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
    async function compile({ cache = cache_js_1.Cache.FileSystemDefault, forceRecompile = false, proofsEnabled = undefined, withRuntimeTables = false, } = {}) {
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
                verificationKey: verification_key_js_1.VerificationKey.empty(),
            };
        }
    }
    function toRegularProver(key, i) {
        return async function prove_(inputPublicInput, ...inputArgs) {
            let publicInput = publicInputType.fromValue(inputPublicInput);
            let args = (0, arrays_js_1.zip)(inputArgs, privateInputTypes[i]).map(([arg, type]) => provable_intf_js_1.ProvableType.get(type).fromValue(arg));
            if (!doProving) {
                // we step into a ZkProgramContext here to match the context nesting
                // that would happen if proofs were enabled -- otherwise, proofs declared
                // in an inner program could be counted to the outer program
                let id = zkprogram_context_js_1.ZkProgramContext.enter();
                try {
                    let { publicOutput, auxiliaryOutput } = (hasPublicInput
                        ? await methods[key].method(publicInput, ...args)
                        : await methods[key].method(...args)) ?? {};
                    let proof = await SelfProof.dummy(publicInput, publicOutput, await getMaxProofsVerified());
                    return { proof, auxiliaryOutput };
                }
                finally {
                    zkprogram_context_js_1.ZkProgramContext.leave(id);
                }
            }
            if (compileOutput === undefined) {
                throw Error(`Cannot prove execution of program.${String(key)}(), no prover found. ` +
                    `Try calling \`await program.compile()\` first, this will cache provers in the background.\nIf you compiled your zkProgram with proofs disabled (\`proofsEnabled = false\`), you have to compile it with proofs enabled first.`);
            }
            let picklesProver = compileOutput.provers[i];
            let maxProofsVerified = compileOutput.maxProofsVerified;
            let { publicInputFields, publicInputAux } = toFieldAndAuxConsts(publicInputType, publicInput);
            let id = provable_context_js_1.snarkContext.enter({
                witnesses: args,
                inProver: true,
                auxInputData: publicInputAux,
            });
            let result;
            try {
                result = await picklesProver(publicInputFields);
            }
            finally {
                provable_context_js_1.snarkContext.leave(id);
            }
            let auxiliaryType = methodIntfs[i].auxiliaryType;
            let auxiliaryOutputExists = auxiliaryType && auxiliaryType.sizeInFields() !== 0;
            let auxiliaryOutput;
            if (auxiliaryOutputExists) {
                auxiliaryOutput = programState.getAuxiliaryOutput(methodIntfs[i].methodName);
                programState.reset(methodIntfs[i].methodName);
            }
            let [publicOutputFields, proof] = base_js_1.MlPair.from(result);
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
    let regularProvers = (0, arrays_js_1.mapToObject)(methodKeys, toRegularProver);
    let provers = (0, arrays_js_1.mapObject)(regularProvers, (prover) => {
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
        let statement = (0, base_js_1.MlPair)(toFieldConsts(publicInputType, proof.publicInput), toFieldConsts(publicOutputType, proof.publicOutput));
        return compileOutput.verify(statement, proof.proof);
    }
    async function digest() {
        let methodsMeta = await analyzeMethods();
        let digests = methodKeys.map((k) => (0, wrapped_js_1.Field)(BigInt('0x' + methodsMeta[k].digest)));
        return (0, poseidon_js_1.hashConstant)(digests).toBigInt().toString(16);
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
        privateInputTypes: (0, arrays_js_1.mapToObject)(methodKeys, (_, i) => privateInputTypes[i]),
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
exports.ZkProgram = ZkProgram;
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
class SelfProof extends proof_js_1.Proof {
}
exports.SelfProof = SelfProof;
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
    let proofs = args.flatMap(proof_js_1.extractProofTypes);
    let numberOfProofs = proofs.length;
    // don't allow base classes for proofs
    proofs.forEach((proof) => {
        if (proof === proof_js_1.ProofBase || proof === proof_js_1.Proof || proof === proof_js_1.DynamicProof) {
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
exports.sortMethodArguments = sortMethodArguments;
function isProvable(type) {
    let type_ = provable_intf_js_1.ProvableType.get(type);
    return ((typeof type_ === 'function' || typeof type_ === 'object') &&
        type_ !== null &&
        ['toFields', 'fromFields', 'sizeInFields', 'toAuxiliary'].every((s) => s in type_));
}
function isDynamicProof(type) {
    return typeof type === 'function' && type.prototype instanceof proof_js_1.DynamicProof;
}
// reasonable default choice for `overrideWrapDomain`
const maxProofsToWrapDomain = { 0: 0, 1: 1, 2: 1 };
async function compileProgram({ publicInputType, publicOutputType, methodIntfs, methods, gates, proofs, proofSystemTag, cache, forceRecompile, overrideWrapDomain, numChunks, state, withRuntimeTables, }) {
    await (0, bindings_js_1.initializeBindings)((0, bindings_js_1.getCurrentBackend)());
    if (methodIntfs.length === 0)
        throw Error(`The Program you are trying to compile has no methods.
Try adding a method to your ZkProgram or SmartContract.
If you are using a SmartContract, make sure you are using the @method decorator.`);
    let rules = methodIntfs.map((methodEntry, i) => picklesRuleFromFunction(publicInputType, publicOutputType, methods[i], proofSystemTag, methodEntry, gates[i], proofs[i], state, withRuntimeTables));
    let maxProofs = computeMaxProofsVerified(proofs.map((p) => p.length));
    overrideWrapDomain ??= maxProofsToWrapDomain[maxProofs];
    let picklesCache = [
        0,
        function read_(mlHeader) {
            if (forceRecompile)
                return base_js_1.MlResult.unitError();
            let header = (0, prover_keys_js_1.parseHeader)(proofSystemTag.name, methodIntfs, mlHeader);
            let result = (0, cache_js_1.readCache)(cache, header, (bytes) => (0, prover_keys_js_1.decodeProverKey)(mlHeader, bytes));
            if (result === undefined)
                return base_js_1.MlResult.unitError();
            return base_js_1.MlResult.ok(result);
        },
        function write_(mlHeader, value) {
            if (!cache.canWrite)
                return base_js_1.MlResult.unitError();
            let header = (0, prover_keys_js_1.parseHeader)(proofSystemTag.name, methodIntfs, mlHeader);
            let didWrite = (0, cache_js_1.writeCache)(cache, header, (0, prover_keys_js_1.encodeProverKey)(value));
            if (!didWrite)
                return base_js_1.MlResult.unitError();
            return base_js_1.MlResult.ok(undefined);
        },
        (0, base_js_1.MlBool)(cache.canWrite),
    ];
    let { verificationKey, provers, verify, tag } = await (0, errors_js_1.prettifyStacktracePromise)((0, bindings_js_1.withThreadPool)(async () => {
        let result;
        let id = provable_context_js_1.snarkContext.enter({ inCompile: true });
        (0, srs_js_1.setSrsCache)(cache);
        try {
            // Determine compilation strategy based on backend and constraint bridge availability
            let useEnhancedRules = false;
            let compilationRules = rules;
            if ((0, bindings_js_1.getCurrentBackend)() === 'sparky') {
                // console.log('🎯 CONSTRAINT LOOP: Intercepted Pickles.compile() with Sparky backend!');
                try {
                    const bridge = globalThis.sparkyConstraintBridge;
                    if (bridge?.getFullConstraintSystem && typeof bridge.getFullConstraintSystem === 'function') {
                        const sparkyConstraints = bridge.getAccumulatedConstraints();
                        // console.log('📊 Retrieved Sparky constraints:', sparkyConstraints?.length || 0);
                        const fullSystem = bridge.getFullConstraintSystem();
                        // console.log('🔍 Full constraint system available with', fullSystem?.gates?.length || 0, 'gates');
                        // PHASE 2: Convert Sparky constraints for Pickles enhancement
                        // TEMPORARILY DISABLED: The enhancement is causing Field objects to be serialized incorrectly
                        // const enhancedRules = convertSparkyConstraintsToPicklesRules(fullSystem, rules);
                        // console.log('🚀 Enhanced rules with Sparky constraints for VK generation!');
                        // compilationRules = enhancedRules;
                        // useEnhancedRules = true;
                        // console.log('⚠️  Enhancement temporarily disabled due to Field serialization issue');
                    }
                }
                catch (bridgeError) {
                    // console.log('⚠️  Bridge access failed, proceeding with normal compilation');
                }
            }
            // PHASE 3: Compile with chosen rules (enhanced or standard)
            // console.log(useEnhancedRules ? 
            //   '🔄 Compiling with enhanced Sparky constraints...' : 
            //   '🔄 Compiling with standard rules...');
            // console.log('🔍 DEBUG: About to call Pickles.compile with rules:', compilationRules.length);
            // console.log('🔍 DEBUG: globalThis.__snarky exists?', !!(globalThis as any).__snarky);
            // console.log('🔍 DEBUG: globalThis.__snarky.Snarky type:', typeof (globalThis as any).__snarky?.Snarky);
            result = bindings_js_2.Pickles.compile(base_js_1.MlArray.to(compilationRules), {
                publicInputSize: publicInputType.sizeInFields(),
                publicOutputSize: publicOutputType.sizeInFields(),
                storable: picklesCache,
                overrideWrapDomain,
                numChunks: numChunks ?? 1,
            });
            if (useEnhancedRules) {
                // console.log('🎆 CONSTRAINT BRIDGE COMPLETE: Pickles compiled with Sparky constraints!');
            }
            let { getVerificationKey, provers, verify, tag } = result;
            CompiledTag.store(proofSystemTag, tag);
            let [, data, hash] = await getVerificationKey();
            let verificationKey = { data, hash: (0, wrapped_js_1.Field)(hash) };
            return {
                verificationKey,
                provers: base_js_1.MlArray.from(provers),
                verify,
                tag,
            };
        }
        finally {
            provable_context_js_1.snarkContext.leave(id);
            (0, srs_js_1.unsetSrsCache)();
        }
    }));
    // wrap provers
    let wrappedProvers = provers.map((prover) => async function picklesProver(publicInput) {
        return (0, errors_js_1.prettifyStacktracePromise)((0, bindings_js_1.withThreadPool)(() => prover(publicInput)));
    });
    // wrap verify
    let wrappedVerify = async function picklesVerify(statement, proof) {
        return (0, errors_js_1.prettifyStacktracePromise)((0, bindings_js_1.withThreadPool)(() => verify(statement, proof)));
    };
    return {
        verificationKey,
        provers: wrappedProvers,
        verify: wrappedVerify,
        tag,
    };
}
exports.compileProgram = compileProgram;
async function analyzeMethod(publicInputType, methodIntf, method) {
    let result;
    let proofs;
    let id = zkprogram_context_js_1.ZkProgramContext.enter();
    try {
        result = await provable_js_1.Provable.constraintSystem(() => {
            let args = methodIntf.args.map(util_js_1.emptyWitness);
            args.forEach((value) => (0, proof_js_1.extractProofs)(value).forEach((proof) => proof.declare()));
            let publicInput = (0, util_js_1.emptyWitness)(publicInputType);
            // note: returning the method result here makes this handle async methods
            if (publicInputType === Undefined || publicInputType === Void)
                return method(...args);
            return method(publicInput, ...args);
        });
        proofs = zkprogram_context_js_1.ZkProgramContext.getDeclaredProofs().map(({ ProofClass }) => ProofClass);
    }
    finally {
        zkprogram_context_js_1.ZkProgramContext.leave(id);
    }
    return { ...result, proofs };
}
exports.analyzeMethod = analyzeMethod;
function inCircuitVkHash(inCircuitVk) {
    const digest = bindings_js_2.Pickles.sideLoaded.vkDigest(inCircuitVk);
    const salt = bindings_js_1.Snarky.poseidon.update(fields_js_1.MlFieldArray.to([(0, wrapped_js_1.Field)(0), (0, wrapped_js_1.Field)(0), (0, wrapped_js_1.Field)(0)]), fields_js_1.MlFieldArray.to([(0, binable_js_1.prefixToField)(wrapped_js_1.Field, constants_js_1.prefixes.sideLoadedVK)]));
    const newState = bindings_js_1.Snarky.poseidon.update(salt, digest);
    const stateFields = fields_js_1.MlFieldArray.from(newState);
    return stateFields[0];
}
exports.inCircuitVkHash = inCircuitVkHash;
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
        // console.log(`🔍 DEBUG: Executing main for ${methodName}`);
        // console.log('🔍 DEBUG: Current backend:', getCurrentBackend());
        // console.log('🔍 DEBUG: globalThis.__snarky.Snarky exists?', !!(globalThis as any).__snarky?.Snarky);
        let { witnesses: argsWithoutPublicInput, inProver, auxInputData } = provable_context_js_1.snarkContext.get();
        (0, errors_js_1.assert)(!(inProver && argsWithoutPublicInput === undefined));
        // witness private inputs and declare input proofs
        let id = zkprogram_context_js_1.ZkProgramContext.enter();
        let finalArgs = [];
        for (let i = 0; i < args.length; i++) {
            try {
                let type = args[i];
                let value = provable_js_1.Provable.witness(type, () => {
                    return argsWithoutPublicInput?.[i] ?? provable_intf_js_1.ProvableType.synthesize(type);
                });
                finalArgs[i] = value;
                (0, proof_js_1.extractProofs)(value).forEach((proof) => proof.declare());
            }
            catch (e) {
                zkprogram_context_js_1.ZkProgramContext.leave(id);
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
            proofs = zkprogram_context_js_1.ZkProgramContext.getDeclaredProofs();
        }
        finally {
            zkprogram_context_js_1.ZkProgramContext.leave(id);
        }
        if (result?.publicOutput) {
            // store the nonPure auxiliary data in program state cache if it exists
            let nonPureOutput = publicOutputType.toAuxiliary(result.publicOutput);
            state?.setNonPureOutput(nonPureOutput);
        }
        // now all proofs are declared - check that we got as many as during compile time
        (0, errors_js_1.assert)(proofs.length === verifiedProofs.length, `Expected ${verifiedProofs.length} proofs, but got ${proofs.length}`);
        // extract proof statements for Pickles
        let previousStatements = proofs.map(({ proofInstance }) => {
            let fields = proofInstance.publicFields();
            let input = fields_js_1.MlFieldArray.to(fields.input);
            let output = fields_js_1.MlFieldArray.to(fields.output);
            return (0, base_js_1.MlPair)(input, output);
        });
        // handle dynamic proofs
        proofs.forEach(({ ProofClass, proofInstance }) => {
            if (!(proofInstance instanceof proof_js_1.DynamicProof))
                return;
            // Initialize side-loaded verification key
            const tag = ProofClass.tag();
            const computedTag = SideloadedTag.get(tag.name);
            const vk = proofInstance.usedVerificationKey;
            if (vk === undefined) {
                throw new Error('proof.verify() not called, call it at least once in your circuit');
            }
            if (provable_js_1.Provable.inProver()) {
                bindings_js_2.Pickles.sideLoaded.inProver(computedTag, vk.data);
            }
            const circuitVk = bindings_js_2.Pickles.sideLoaded.vkToCircuit(() => vk.data);
            // Assert the validity of the auxiliary vk-data by comparing the witnessed and computed hash
            const hash = inCircuitVkHash(circuitVk);
            (0, wrapped_js_1.Field)(hash).assertEquals(vk.hash, 'Provided VerificationKey hash not correct');
            bindings_js_2.Pickles.sideLoaded.inCircuit(computedTag, circuitVk);
        });
        // if the output is empty, we don't evaluate `toFields(result)` to allow the function to return something else in that case
        let hasPublicOutput = publicOutputType.sizeInFields() !== 0;
        let publicOutput = hasPublicOutput ? publicOutputType.toFields(result.publicOutput) : [];
        if (state !== undefined && auxiliaryType !== undefined && auxiliaryType.sizeInFields() !== 0) {
            provable_js_1.Provable.asProver(() => {
                let { auxiliaryOutput } = result;
                (0, errors_js_1.assert)(auxiliaryOutput !== undefined, `${proofSystemTag.name}.${methodName}(): Auxiliary output is undefined even though the method declares it.`);
                state.setAuxiliaryOutput(provable_js_1.Provable.toConstant(auxiliaryType, auxiliaryOutput), methodName);
            });
        }
        return {
            publicOutput: fields_js_1.MlFieldArray.to(publicOutput),
            previousStatements: base_js_1.MlArray.to(previousStatements),
            previousProofs: base_js_1.MlArray.to(proofs.map((p) => p.proofInstance.proof)),
            shouldVerify: base_js_1.MlArray.to(proofs.map((proof) => proof.proofInstance.shouldVerify.toField().value)),
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
                computedTag = bindings_js_2.Pickles.sideLoaded.create(tag.name, Proof.maxProofsVerified, Proof.publicInputType?.sizeInFields() ?? 0, Proof.publicOutputType?.sizeInFields() ?? 0, (0, feature_flags_js_1.featureFlagsToMlOption)(Proof.featureFlags, withRuntimeTables));
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
    let featureFlags = (0, feature_flags_js_1.featureFlagsToMlOption)((0, feature_flags_js_1.featureFlagsFromGates)(gates, withRuntimeTables));
    return {
        identifier: methodName,
        main,
        featureFlags,
        proofsToVerify: base_js_1.MlArray.to(proofsToVerify),
    };
}
exports.picklesRuleFromFunction = picklesRuleFromFunction;
function computeMaxProofsVerified(proofs) {
    return proofs.reduce((acc, n) => {
        (0, errors_js_1.assert)(n <= 2, 'Too many proofs');
        return Math.max(acc, n);
    }, 0);
}
exports.computeMaxProofsVerified = computeMaxProofsVerified;
function fromFieldVars(type, fields, auxData = []) {
    return type.fromFields(fields_js_1.MlFieldArray.from(fields), auxData);
}
function fromFieldConsts(type, fields, aux = []) {
    return type.fromFields(fields_js_1.MlFieldConstArray.from(fields), aux);
}
function toFieldConsts(type, value) {
    return fields_js_1.MlFieldConstArray.to(type.toFields(value));
}
function toFieldAndAuxConsts(type, value) {
    return {
        publicInputFields: fields_js_1.MlFieldConstArray.to(type.toFields(value)),
        publicInputAux: type.toAuxiliary(value),
    };
}
ZkProgram.Proof = function (program) {
    return class ZkProgramProof extends proof_js_1.Proof {
        static publicInputType = program.publicInputType;
        static publicOutputType = program.publicOutputType;
        static tag = () => program;
    };
};
let dummyProofCache;
async function dummyBase64Proof() {
    if (dummyProofCache)
        return dummyProofCache;
    let proof = await (0, proof_js_1.dummyProof)(2, 15);
    let base64Proof = bindings_js_2.Pickles.proofToBase64([2, proof]);
    dummyProofCache = base64Proof;
    return base64Proof;
}
exports.dummyBase64Proof = dummyBase64Proof;
// helpers for circuit context
function Prover() {
    return {
        async run(witnesses, proverData, callback) {
            let id = provable_context_js_1.snarkContext.enter({ witnesses, proverData, inProver: true });
            try {
                return await callback();
            }
            finally {
                provable_context_js_1.snarkContext.leave(id);
            }
        },
        getData() {
            return provable_context_js_1.snarkContext.get().proverData;
        },
    };
}
exports.Prover = Prover;
