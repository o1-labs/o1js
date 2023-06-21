import { Context } from './global-context.js';
import { Gate, JsonGate, Snarky } from '../snarky.js';
import { bytesToBigInt } from '../bindings/crypto/bigint-helpers.js';
import { prettifyStacktrace } from './errors.js';

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
    return { rows, digest, result: result! as T, gates, publicInputSize };
  } catch (error) {
    throw prettifyStacktrace(error);
  } finally {
    snarkContext.leave(id);
  }
}

// helpers

function gatesFromJson(cs: { gates: JsonGate[]; public_input_size: number }) {
  let gates: Gate[] = cs.gates.map(({ typ, wires, coeffs: byteCoeffs }) => {
    let coeffs = [];
    for (let coefficient of byteCoeffs) {
      let arr = new Uint8Array(coefficient);
      coeffs.push(bytesToBigInt(arr).toString());
    }
    return { type: typ, wires, coeffs };
  });
  return { publicInputSize: cs.public_input_size, gates };
}
