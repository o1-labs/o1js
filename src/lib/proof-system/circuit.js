import 'reflect-metadata';
import { Snarky, initializeBindings } from '../../bindings.js';
import { MlFieldArray, MlFieldConstArray } from '../ml/fields.js';
import { withThreadPool } from '../../bindings.js';
import { Provable } from '../provable/provable.js';
import { snarkContext, gatesFromJson } from '../provable/core/provable-context.js';
import { prettifyStacktrace, prettifyStacktracePromise } from '../util/errors.js';
// external API
export { public_, circuitMain, Circuit, Keypair, Proof, VerificationKey };
class Circuit {
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
        await initializeBindings();
        return prettifyStacktracePromise(withThreadPool(async () => {
            let keypair = Snarky.circuit.compile(main, publicInputSize);
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
        await initializeBindings();
        return prettifyStacktracePromise(withThreadPool(async () => {
            let proof = Snarky.circuit.prove(main, publicInputSize, MlFieldConstArray.to(publicInputFields), keypair.value);
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
        await initializeBindings();
        return prettifyStacktracePromise(withThreadPool(async () => Snarky.circuit.verify(MlFieldConstArray.to(publicInputFields), proof.value, verificationKey.value)));
    }
}
class Keypair {
    constructor(value) {
        this.value = value;
    }
    verificationKey() {
        return new VerificationKey(Snarky.circuit.keypair.getVerificationKey(this.value));
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
            return gatesFromJson(Snarky.circuit.keypair.getConstraintSystemJSON(this.value)).gates;
        }
        catch (error) {
            throw prettifyStacktrace(error);
        }
    }
}
/**
 * Proofs can be verified using a {@link VerificationKey} and the public input.
 */
class Proof {
    constructor(value) {
        this.value = value;
    }
}
/**
 * Part of the circuit {@link Keypair}. A verification key can be used to verify a {@link Proof} when you provide the correct public input.
 */
class VerificationKey {
    constructor(value) {
        this.value = value;
    }
}
function public_(target, _key, index) {
    // const fieldType = Reflect.getMetadata('design:paramtypes', target, key);
    if (target._public === undefined) {
        target._public = [];
    }
    target._public.push(index);
}
function mainFromCircuitData(data, privateInput) {
    return function main(publicInputFields) {
        let id = snarkContext.enter({ inCheckedComputation: true });
        try {
            let publicInput = data.publicInputType.fromFields(MlFieldArray.from(publicInputFields));
            let privateInput_ = Provable.witness(data.privateInputType, () => privateInput);
            data.main(publicInput, privateInput_);
        }
        finally {
            snarkContext.leave(id);
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
            return types.map((typ, i) => Provable.toCanonical(typ, x[i]));
        },
        toValue(x) {
            return types.map((typ, i) => typ.toValue(x[i]));
        },
        fromValue(x) {
            return types.map((typ, i) => typ.fromValue(x[i]));
        },
    };
}
