import { Context } from '../../util/global-context.js';
import { Snarky, initializeBindings, getCurrentBackend } from '../../../bindings.js';
import { parseHexString32 } from '../../../bindings/crypto/bigint-helpers.js';
import { prettifyStacktrace } from '../../util/errors.js';
import { Fp } from '../../../bindings/crypto/finite-field.js';
import { MlBool } from '../../ml/base.js';
// internal API
export { snarkContext, asProver, synchronousRunners, generateWitness, constraintSystem, inProver, inAnalyze, inCheckedComputation, inCompile, inCompileMode, gatesFromJson, printGates, summarizeGates, MlConstraintSystem, };
let snarkContext = Context.create({ default: {} });
class MlConstraintSystem {
}
// helpers to read circuit context
function inProver() {
    return !!snarkContext.get().inProver;
}
function inCheckedComputation() {
    let ctx = snarkContext.get();
    return !!ctx.inCompile || !!ctx.inProver || !!ctx.inCheckedComputation;
}
function inCompile() {
    return !!snarkContext.get().inCompile;
}
function inAnalyze() {
    return !!snarkContext.get().inAnalyze;
}
function inCompileMode() {
    let ctx = snarkContext.get();
    return !!ctx.inCompile || !!ctx.inAnalyze;
}
// runners for provable code
function asProver(f) {
    if (inCheckedComputation()) {
        // TODO make this start a "witness block" context
        Snarky.run.asProver(f);
    }
    else {
        f();
    }
}
async function generateWitness(f, { checkConstraints = true } = {}) {
    await initializeBindings();
    let id = snarkContext.enter({ inCheckedComputation: true });
    try {
        let finish = Snarky.run.enterGenerateWitness();
        if (!checkConstraints)
            Snarky.run.setEvalConstraints(MlBool(false));
        await f();
        return finish();
    }
    catch (error) {
        throw prettifyStacktrace(error);
    }
    finally {
        // Reset eval_constraints to default state (true for compatibility)
        Snarky.run.setEvalConstraints(MlBool(true));
        snarkContext.leave(id);
    }
}
async function constraintSystem(f) {
    await initializeBindings();
    let id = snarkContext.enter({ inAnalyze: true, inCheckedComputation: true });
    // SPARKY CONSTRAINT BRIDGE FIX: Initialize constraint accumulation for Sparky backend
    // This makes Provable.constraintSystem() use the same constraint accumulation pattern
    // as ZkProgram.compile(), which is why the latter works but the former returns 0 constraints
    let isSparkyBackend = getCurrentBackend() === 'sparky';
    let sparkyBridge = isSparkyBackend ? globalThis.sparkyConstraintBridge : null;
    if (isSparkyBackend && sparkyBridge) {
        console.log('🔧 CONSTRAINT FIX: Calling startConstraintAccumulation() for Sparky backend');
        sparkyBridge.startConstraintAccumulation();
    }
    try {
        let finish = Snarky.run.enterConstraintSystem();
        await f();
        let cs = finish();
        return constraintSystemToJS(cs);
    }
    catch (error) {
        throw prettifyStacktrace(error);
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
/**
 * helpers to run circuits in synchronous tests
 */
async function synchronousRunners() {
    await initializeBindings();
    function runAndCheckSync(f) {
        let id = snarkContext.enter({ inCheckedComputation: true });
        try {
            let finish = Snarky.run.enterGenerateWitness();
            f();
            finish();
        }
        catch (error) {
            throw prettifyStacktrace(error);
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
        let isSparkyBackend = getCurrentBackend() === 'sparky';
        let sparkyBridge = isSparkyBackend ? globalThis.sparkyConstraintBridge : null;
        if (isSparkyBackend && sparkyBridge) {
            sparkyBridge.startConstraintAccumulation();
        }
        try {
            let finish = Snarky.run.enterConstraintSystem();
            f();
            let cs = finish();
            return constraintSystemToJS(cs);
        }
        catch (error) {
            throw prettifyStacktrace(error);
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
function constraintSystemToJS(cs) {
    // toJson also "finalizes" the constraint system, which means
    // locking in a potential pending single generic gate
    let json = Snarky.constraintSystem.toJson(cs);
    let rows = Snarky.constraintSystem.rows(cs);
    let digest = Snarky.constraintSystem.digest(cs);
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
        let coeffs = hexCoeffs.map((hex) => parseHexString32(hex).toString());
        return { type: typ, wires, coeffs };
    });
    return { publicInputSize: cs.public_input_size, gates };
}
// collect a summary of the constraint system
function summarizeGates(gates) {
    var _a;
    let gateTypes = {};
    gateTypes['Total rows'] = gates.length;
    for (let gate of gates) {
        gateTypes[_a = gate.type] ?? (gateTypes[_a] = 0);
        gateTypes[gate.type]++;
    }
    return gateTypes;
}
// print a constraint system
function printGates(gates) {
    for (let i = 0, n = gates.length; i < n; i++) {
        let { type, wires, coeffs } = gates[i];
        console.log(i.toString().padEnd(4, ' '), type.padEnd(15, ' '), coeffsToPretty(type, coeffs).padEnd(30, ' '), wiresToPretty(wires, i));
    }
    console.log();
}
let minusRange = Fp.modulus - (1n << 64n);
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
            c0 -= Fp.modulus;
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
