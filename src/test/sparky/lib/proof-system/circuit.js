"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationKey = exports.Proof = exports.Keypair = exports.Circuit = exports.circuitMain = exports.public_ = void 0;
require("reflect-metadata");
const bindings_js_1 = require("../../bindings.js");
const fields_js_1 = require("../ml/fields.js");
const bindings_js_2 = require("../../bindings.js");
const provable_js_1 = require("../provable/provable.js");
const provable_context_js_1 = require("../provable/core/provable-context.js");
const errors_js_1 = require("../util/errors.js");
class Circuit {
    // circuit-writing interface
    static _main;
    /**
     * Generates a proving key and a verification key for this circuit.
     * @example
     * ```ts
     * const keypair = await MyCircuit.generateKeypair();
     * ```
     */
    static async generateKeypair() {
        let main = mainFromCircuitData(this._main);
        let publicInputSize = this._main.publicInputType.sizeInFields();
        await (0, bindings_js_1.initializeBindings)();
        return (0, errors_js_1.prettifyStacktracePromise)((0, bindings_js_2.withThreadPool)(async () => {
            let keypair = bindings_js_1.Snarky.circuit.compile(main, publicInputSize);
            return new Keypair(keypair);
        }));
    }
    /**
     * Proves a statement using the private input, public input, and the {@link Keypair} of the circuit.
     * @example
     * ```ts
     * const keypair = await MyCircuit.generateKeypair();
     * const proof = await MyCircuit.prove(privateInput, publicInput, keypair);
     * ```
     */
    static async prove(privateInput, publicInput, keypair) {
        let main = mainFromCircuitData(this._main, privateInput);
        let publicInputSize = this._main.publicInputType.sizeInFields();
        let publicInputFields = this._main.publicInputType.toFields(publicInput);
        await (0, bindings_js_1.initializeBindings)();
        return (0, errors_js_1.prettifyStacktracePromise)((0, bindings_js_2.withThreadPool)(async () => {
            let proof = bindings_js_1.Snarky.circuit.prove(main, publicInputSize, fields_js_1.MlFieldConstArray.to(publicInputFields), keypair.value);
            return new Proof(proof);
        }));
    }
    /**
     * Verifies a proof using the public input, the proof, and the initial {@link Keypair} of the circuit.
     * @example
     * ```ts
     * const keypair = await MyCircuit.generateKeypair();
     * const proof = await MyCircuit.prove(privateInput, publicInput, keypair);
     * const isValid = await MyCircuit.verify(publicInput, keypair.vk, proof);
     * ```
     */
    static async verify(publicInput, verificationKey, proof) {
        let publicInputFields = this._main.publicInputType.toFields(publicInput);
        await (0, bindings_js_1.initializeBindings)();
        return (0, errors_js_1.prettifyStacktracePromise)((0, bindings_js_2.withThreadPool)(async () => bindings_js_1.Snarky.circuit.verify(fields_js_1.MlFieldConstArray.to(publicInputFields), proof.value, verificationKey.value)));
    }
}
exports.Circuit = Circuit;
class Keypair {
    value;
    constructor(value) {
        this.value = value;
    }
    verificationKey() {
        return new VerificationKey(bindings_js_1.Snarky.circuit.keypair.getVerificationKey(this.value));
    }
    /**
     * Returns a low-level JSON representation of the {@link Circuit} from its {@link Keypair}:
     * a list of gates, each of which represents a row in a table, with certain coefficients and wires to other (row, column) pairs
     * @example
     * ```ts
     * const keypair = await MyCircuit.generateKeypair();
     * const json = MyProvable.witnessFromKeypair(keypair);
     * ```
     */
    constraintSystem() {
        try {
            return (0, provable_context_js_1.gatesFromJson)(bindings_js_1.Snarky.circuit.keypair.getConstraintSystemJSON(this.value)).gates;
        }
        catch (error) {
            throw (0, errors_js_1.prettifyStacktrace)(error);
        }
    }
}
exports.Keypair = Keypair;
/**
 * Proofs can be verified using a {@link VerificationKey} and the public input.
 */
class Proof {
    value;
    constructor(value) {
        this.value = value;
    }
}
exports.Proof = Proof;
/**
 * Part of the circuit {@link Keypair}. A verification key can be used to verify a {@link Proof} when you provide the correct public input.
 */
class VerificationKey {
    value;
    constructor(value) {
        this.value = value;
    }
}
exports.VerificationKey = VerificationKey;
function public_(target, _key, index) {
    // const fieldType = Reflect.getMetadata('design:paramtypes', target, key);
    if (target._public === undefined) {
        target._public = [];
    }
    target._public.push(index);
}
exports.public_ = public_;
function mainFromCircuitData(data, privateInput) {
    return function main(publicInputFields) {
        let id = provable_context_js_1.snarkContext.enter({ inCheckedComputation: true });
        try {
            let publicInput = data.publicInputType.fromFields(fields_js_1.MlFieldArray.from(publicInputFields));
            let privateInput_ = provable_js_1.Provable.witness(data.privateInputType, () => privateInput);
            data.main(publicInput, privateInput_);
        }
        finally {
            provable_context_js_1.snarkContext.leave(id);
        }
    };
}
function circuitMain(target, propertyName, _descriptor) {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyName);
    const numArgs = paramTypes.length;
    const publicIndexSet = new Set(target._public);
    const witnessIndexSet = new Set();
    for (let i = 0; i < numArgs; ++i) {
        if (!publicIndexSet.has(i))
            witnessIndexSet.add(i);
    }
    target._main = {
        main(publicInput, privateInput) {
            let args = [];
            for (let i = 0; i < numArgs; ++i) {
                let nextInput = publicIndexSet.has(i) ? publicInput : privateInput;
                args.push(nextInput.shift());
            }
            return target[propertyName].apply(target, args);
        },
        publicInputType: provableFromTuple(Array.from(publicIndexSet).map((i) => paramTypes[i])),
        privateInputType: provableFromTuple(Array.from(witnessIndexSet).map((i) => paramTypes[i])),
    };
}
exports.circuitMain = circuitMain;
// TODO support auxiliary data
function provableFromTuple(inputTypes) {
    let types = inputTypes.map((t) => ('provable' in t ? t.provable : t));
    return {
        sizeInFields: () => {
            return types.reduce((acc, type) => acc + type.sizeInFields(), 0);
        },
        toFields: (t) => {
            if (t.length !== types.length) {
                throw new Error(`typOfArray: Expected ${types.length}, got ${t.length}`);
            }
            let res = [];
            for (let i = 0; i < t.length; ++i) {
                res.push(...types[i].toFields(t[i]));
            }
            return res;
        },
        toAuxiliary() {
            return [];
        },
        fromFields: (xs) => {
            let offset = 0;
            let res = [];
            types.forEach((typ) => {
                const n = typ.sizeInFields();
                res.push(typ.fromFields(xs.slice(offset, offset + n)));
                offset += n;
            });
            return res;
        },
        check(xs) {
            types.forEach((typ, i) => typ.check(xs[i]));
        },
        toCanonical(x) {
            return types.map((typ, i) => provable_js_1.Provable.toCanonical(typ, x[i]));
        },
        toValue(x) {
            return types.map((typ, i) => typ.toValue(x[i]));
        },
        fromValue(x) {
            return types.map((typ, i) => typ.fromValue(x[i]));
        },
    };
}
