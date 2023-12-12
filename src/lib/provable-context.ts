import { Context } from './global-context.js';
import { Gate, GateType, JsonGate, Snarky } from '../snarky.js';
import { parseHexString } from '../bindings/crypto/bigint-helpers.js';
import { prettifyStacktrace } from './errors.js';
import { Fp } from '../bindings/crypto/finite_field.js';

// internal API
export {
  snarkContext,
  SnarkContext,
  asProver,
  runAndCheck,
  runUnchecked,
  constraintSystem,
  inProver,
  inAnalyze,
  inCheckedComputation,
  inCompile,
  inCompileMode,
  gatesFromJson,
  printGates,
};

// global circuit-related context

type SnarkContext = {
  witnesses?: unknown[];
  proverData?: any;
  inProver?: boolean;
  inCompile?: boolean;
  inCheckedComputation?: boolean;
  inAnalyze?: boolean;
  inRunAndCheck?: boolean;
  inWitnessBlock?: boolean;
};
let snarkContext = Context.create<SnarkContext>({ default: {} });

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

function asProver(f: () => void) {
  if (inCheckedComputation()) {
    Snarky.run.asProver(f);
  } else {
    f();
  }
}

function runAndCheck(f: () => void) {
  let id = snarkContext.enter({ inCheckedComputation: true });
  try {
    Snarky.run.runAndCheck(f);
  } catch (error) {
    throw prettifyStacktrace(error);
  } finally {
    snarkContext.leave(id);
  }
}

function runUnchecked(f: () => void) {
  let id = snarkContext.enter({ inCheckedComputation: true });
  try {
    Snarky.run.runUnchecked(f);
  } catch (error) {
    throw prettifyStacktrace(error);
  } finally {
    snarkContext.leave(id);
  }
}

function constraintSystem<T>(f: () => T) {
  let id = snarkContext.enter({ inAnalyze: true, inCheckedComputation: true });
  try {
    let result: T;
    let { rows, digest, json } = Snarky.run.constraintSystem(() => {
      result = f();
    });
    let { gates, publicInputSize } = gatesFromJson(json);
    return {
      rows,
      digest,
      result: result! as T,
      gates,
      publicInputSize,
      print() {
        printGates(gates);
      },
      summary() {
        let gateTypes: Partial<Record<GateType | 'Total rows', number>> = {};
        gateTypes['Total rows'] = rows;
        for (let gate of gates) {
          gateTypes[gate.type] ??= 0;
          gateTypes[gate.type]!++;
        }
        return gateTypes;
      },
    };
  } catch (error) {
    throw prettifyStacktrace(error);
  } finally {
    snarkContext.leave(id);
  }
}

// helpers

function gatesFromJson(cs: { gates: JsonGate[]; public_input_size: number }) {
  let gates: Gate[] = cs.gates.map(({ typ, wires, coeffs: hexCoeffs }) => {
    let coeffs = hexCoeffs.map((hex) => parseHexString(hex).toString());
    return { type: typ, wires, coeffs };
  });
  return { publicInputSize: cs.public_input_size, gates };
}

// print a constraint system

function printGates(gates: Gate[]) {
  for (let i = 0, n = gates.length; i < n; i++) {
    let { type, wires, coeffs } = gates[i];
    console.log(
      i.toString().padEnd(4, ' '),
      type.padEnd(15, ' '),
      coeffsToPretty(type, coeffs).padEnd(30, ' '),
      wiresToPretty(wires, i)
    );
  }
  console.log();
}

let minusRange = Fp.modulus - (1n << 64n);

function coeffsToPretty(type: Gate['type'], coeffs: Gate['coeffs']): string {
  if (coeffs.length === 0) return '';
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
      if (c0 > minusRange) c0 -= Fp.modulus;
      let cStr = c0.toString();
      if (cStr.length > 4) return `${cStr.slice(0, 4)}..`;
      return cStr;
    })
    .join(' ');
  return `[${str}]`;
}

function wiresToPretty(wires: Gate['wires'], row: number) {
  let strWires: string[] = [];
  let n = wires.length;
  for (let col = 0; col < n; col++) {
    let wire = wires[col];
    if (wire.row === row && wire.col === col) continue;
    if (wire.row === row) {
      strWires.push(`${col}->${wire.col}`);
    } else {
      strWires.push(`${col}->(${wire.row},${wire.col})`);
    }
  }
  return strWires.join(', ');
}
