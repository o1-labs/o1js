"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MlConstraintSystem = exports.summarizeGates = exports.printGates = exports.gatesFromJson = exports.inCompileMode = exports.inCompile = exports.inCheckedComputation = exports.inAnalyze = exports.inProver = exports.constraintSystem = exports.generateWitness = exports.synchronousRunners = exports.asProver = exports.snarkContext = void 0;
const global_context_js_1 = require("../../util/global-context.js");
const bindings_js_1 = require("../../../bindings.js");
const bigint_helpers_js_1 = require("../../../bindings/crypto/bigint-helpers.js");
const errors_js_1 = require("../../util/errors.js");
const finite_field_js_1 = require("../../../bindings/crypto/finite-field.js");
const base_js_1 = require("../../ml/base.js");
let snarkContext = global_context_js_1.Context.create({ default: {} });
exports.snarkContext = snarkContext;
class MlConstraintSystem {
}
exports.MlConstraintSystem = MlConstraintSystem;
// helpers to read circuit context
function inProver() {
    return !!snarkContext.get().inProver;
}
exports.inProver = inProver;
function inCheckedComputation() {
    let ctx = snarkContext.get();
    return !!ctx.inCompile || !!ctx.inProver || !!ctx.inCheckedComputation;
}
exports.inCheckedComputation = inCheckedComputation;
function inCompile() {
    return !!snarkContext.get().inCompile;
}
exports.inCompile = inCompile;
function inAnalyze() {
    return !!snarkContext.get().inAnalyze;
}
exports.inAnalyze = inAnalyze;
function inCompileMode() {
    let ctx = snarkContext.get();
    return !!ctx.inCompile || !!ctx.inAnalyze;
}
exports.inCompileMode = inCompileMode;
// runners for provable code
function asProver(f) {
    if (inCheckedComputation()) {
        // TODO make this start a "witness block" context
        bindings_js_1.Snarky.run.asProver(f);
    }
    else {
        f();
    }
}
exports.asProver = asProver;
async function generateWitness(f, { checkConstraints = true } = {}) {
    await (0, bindings_js_1.initializeBindings)();
    let id = snarkContext.enter({ inCheckedComputation: true });
    try {
        let finish = bindings_js_1.Snarky.run.enterGenerateWitness();
        if (!checkConstraints)
            bindings_js_1.Snarky.run.setEvalConstraints((0, base_js_1.MlBool)(false));
        await f();
        return finish();
    }
    catch (error) {
        throw (0, errors_js_1.prettifyStacktrace)(error);
    }
    finally {
        // Reset eval_constraints to default state (true for compatibility)
        bindings_js_1.Snarky.run.setEvalConstraints((0, base_js_1.MlBool)(true));
        snarkContext.leave(id);
    }
}
exports.generateWitness = generateWitness;
async function constraintSystem(f) {
    await (0, bindings_js_1.initializeBindings)();
    let id = snarkContext.enter({ inAnalyze: true, inCheckedComputation: true });
    // SPARKY CONSTRAINT BRIDGE FIX: Initialize constraint accumulation for Sparky backend
    // This makes Provable.constraintSystem() use the same constraint accumulation pattern
    // as ZkProgram.compile(), which is why the latter works but the former returns 0 constraints
    let isSparkyBackend = (0, bindings_js_1.getCurrentBackend)() === 'sparky';
    let sparkyBridge = isSparkyBackend ? globalThis.sparkyConstraintBridge : null;
    if (isSparkyBackend && sparkyBridge) {
        console.log('🔧 CONSTRAINT FIX: Calling startConstraintAccumulation() for Sparky backend');
        sparkyBridge.startConstraintAccumulation();
    }
    try {
        let finish = bindings_js_1.Snarky.run.enterConstraintSystem();
        await f();
        let cs = finish();
        return constraintSystemToJS(cs);
    }
    catch (error) {
        throw (0, errors_js_1.prettifyStacktrace)(error);
    }
    finally {
        // SPARKY CONSTRAINT BRIDGE FIX: Clean up constraint accumulation for Sparky backend
        if (isSparkyBackend && sparkyBridge) {
            console.log('🔧 CONSTRAINT FIX: Calling endConstraintAccumulation() for Sparky backend');
            sparkyBridge.endConstraintAccumulation();
        }
        snarkContext.leave(id);
    }
}
exports.constraintSystem = constraintSystem;
/**
 * helpers to run circuits in synchronous tests
 */
async function synchronousRunners() {
    await (0, bindings_js_1.initializeBindings)();
    function runAndCheckSync(f) {
        let id = snarkContext.enter({ inCheckedComputation: true });
        try {
            let finish = bindings_js_1.Snarky.run.enterGenerateWitness();
            f();
            finish();
        }
        catch (error) {
            throw (0, errors_js_1.prettifyStacktrace)(error);
        }
        finally {
            snarkContext.leave(id);
        }
    }
    function constraintSystemSync(f) {
        let id = snarkContext.enter({
            inAnalyze: true,
            inCheckedComputation: true,
        });
        // SPARKY CONSTRAINT BRIDGE FIX: Initialize constraint accumulation for Sparky backend (sync version)
        let isSparkyBackend = (0, bindings_js_1.getCurrentBackend)() === 'sparky';
        let sparkyBridge = isSparkyBackend ? globalThis.sparkyConstraintBridge : null;
        if (isSparkyBackend && sparkyBridge) {
            sparkyBridge.startConstraintAccumulation();
        }
        try {
            let finish = bindings_js_1.Snarky.run.enterConstraintSystem();
            f();
            let cs = finish();
            return constraintSystemToJS(cs);
        }
        catch (error) {
            throw (0, errors_js_1.prettifyStacktrace)(error);
        }
        finally {
            // SPARKY CONSTRAINT BRIDGE FIX: Clean up constraint accumulation for Sparky backend (sync version)
            if (isSparkyBackend && sparkyBridge) {
                sparkyBridge.endConstraintAccumulation();
            }
            snarkContext.leave(id);
        }
    }
    return { runAndCheckSync, constraintSystemSync };
}
exports.synchronousRunners = synchronousRunners;
function constraintSystemToJS(cs) {
    // toJson also "finalizes" the constraint system, which means
    // locking in a potential pending single generic gate
    let json = bindings_js_1.Snarky.constraintSystem.toJson(cs);
    let rows = bindings_js_1.Snarky.constraintSystem.rows(cs);
    let digest = bindings_js_1.Snarky.constraintSystem.digest(cs);
    let { gates, publicInputSize } = gatesFromJson(json);
    return {
        rows,
        digest,
        gates,
        publicInputSize,
        print() {
            printGates(gates);
        },
        summary() {
            return summarizeGates(gates);
        },
    };
}
// helpers
function gatesFromJson(cs) {
    let gates = cs.gates.map(({ typ, wires, coeffs: hexCoeffs }) => {
        let coeffs = hexCoeffs.map((hex) => (0, bigint_helpers_js_1.parseHexString32)(hex).toString());
        return { type: typ, wires, coeffs };
    });
    return { publicInputSize: cs.public_input_size, gates };
}
exports.gatesFromJson = gatesFromJson;
// collect a summary of the constraint system
function summarizeGates(gates) {
    let gateTypes = {};
    gateTypes['Total rows'] = gates.length;
    for (let gate of gates) {
        gateTypes[gate.type] ??= 0;
        gateTypes[gate.type]++;
    }
    return gateTypes;
}
exports.summarizeGates = summarizeGates;
// print a constraint system
function printGates(gates) {
    for (let i = 0, n = gates.length; i < n; i++) {
        let { type, wires, coeffs } = gates[i];
        console.log(i.toString().padEnd(4, ' '), type.padEnd(15, ' '), coeffsToPretty(type, coeffs).padEnd(30, ' '), wiresToPretty(wires, i));
    }
    console.log();
}
exports.printGates = printGates;
let minusRange = finite_field_js_1.Fp.modulus - (1n << 64n);
function coeffsToPretty(type, coeffs) {
    if (coeffs.length === 0)
        return '';
    if (type === 'Generic' && coeffs.length > 5) {
        let first = coeffsToPretty(type, coeffs.slice(0, 5));
        let second = coeffsToPretty(type, coeffs.slice(5));
        return `${first} ${second}`;
    }
    if (type === 'Poseidon' && coeffs.length > 3) {
        return `${coeffsToPretty(type, coeffs.slice(0, 3)).slice(0, -1)} ...]`;
    }
    let str = coeffs
        .map((c) => {
        let c0 = BigInt(c);
        if (c0 > minusRange)
            c0 -= finite_field_js_1.Fp.modulus;
        let cStr = c0.toString();
        if (cStr.length > 4)
            return `${cStr.slice(0, 4)}..`;
        return cStr;
    })
        .join(' ');
    return `[${str}]`;
}
function wiresToPretty(wires, row) {
    let strWires = [];
    let n = wires.length;
    for (let col = 0; col < n; col++) {
        let wire = wires[col];
        if (wire.row === row && wire.col === col)
            continue;
        if (wire.row === row) {
            strWires.push(`${col}->${wire.col}`);
        }
        else {
            strWires.push(`${col}->(${wire.row},${wire.col})`);
        }
    }
    return strWires.join(', ');
}
