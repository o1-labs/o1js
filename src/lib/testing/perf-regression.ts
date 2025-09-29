import { ConstraintSystemSummary } from '../provable/core/provable-context.js';
import fs from 'fs';
import path from 'path';

export { perfStart, perfEnd, PerfRegressionEntry };

type MethodsSummary = Record<string, ConstraintSystemSummary>;

type MethodsInfo = Record<
  string,
  {
    rows: number;
    digest: string;
    proveTime?: number;
  }
>;

type PerfRegressionEntry = {
  digest?: string;
  compileTime?: number;
  methods: MethodsInfo;
};

type PerfStack = {
  start: number;
  label?: string;
  contractName?: string;
  methodsSummary?: MethodsSummary;
  methodName?: string; // required for prove; optional for compile
};

const FILE_PATH = path.join(process.cwd(), './tests/perf-regression/perf-regression.json');

const DUMP = flag('--dump');
const CHECK = flag('--check');

const perfStack: PerfStack[] = [];

function perfStart(
  label?: string,
  contractName?: string,
  methodsSummary?: MethodsSummary,
  methodName?: string
) {
  perfStack.push({ label, start: performance.now(), contractName, methodsSummary, methodName });
}

// Stops the process after the N-th end() call, if STOP_AFTER env is set.
// If STOP_AFTER is not set or invalid, the script runs through normally.
const STOP_AFTER = Number.isFinite(Number(process.env.STOP_AFTER ?? ''))
  ? Number(process.env.STOP_AFTER)
  : undefined;
let __endCounter = 0;

function maybeStop() {
  if (typeof STOP_AFTER === 'number' && STOP_AFTER > 0) {
    __endCounter++;
    if (__endCounter >= STOP_AFTER) {
      process.exit(0);
    }
  }
}

function perfEnd() {
  const frame = perfStack.pop()!;
  const { label, start, contractName } = frame;
  let { methodsSummary: cs, methodName } = frame;

  const time = (performance.now() - start) / 1000;

  // Base logging — show contract.method for prove
  if (label === 'prove' && contractName && methodName) {
    console.log(`${label} ${contractName}.${methodName}... ${time.toFixed(3)} sec`);
  } else if (label) {
    console.log(`${label} ${contractName ?? ''}... ${time.toFixed(3)} sec`);
  }

  // If neither --dump nor --check, just log and honor STOP_AFTER
  if (!DUMP && !CHECK) {
    maybeStop();
    return;
  }

  // Only act for compile/prove with required context
  if (!contractName || (label !== 'compile' && label !== 'prove')) {
    maybeStop();
    return;
  }

  // Read existing JSON (assumed to exist & non-empty by your workflow)
  const raw = fs.readFileSync(FILE_PATH, 'utf8');
  const perfRegressionJson: Record<string, PerfRegressionEntry> = JSON.parse(raw);

  if (label === 'compile') {
    // CHECK: validate against baseline (no writes)
    if (CHECK) {
      checkAgainstBaseline({
        perfRegressionJson,
        contractName,
        label: 'compile', // compile checks don't use method/digest; pass empty strings
        methodName: '',
        digest: '',
        actualTime: time,
      });
      maybeStop();
      return;
    }

    // DUMP: update only contract-level compileTime (does not touch methods)
    if (DUMP) {
      const prev = perfRegressionJson[contractName];
      const merged: PerfRegressionEntry = prev
        ? { ...prev, compileTime: time }
        : { compileTime: time, methods: {} };

      perfRegressionJson[contractName] = merged;
      fs.writeFileSync(FILE_PATH, JSON.stringify(perfRegressionJson, null, 2));
      maybeStop();
      return;
    }
  }

  // For prove we need the analyzed methods and a valid methodName
  if (!cs) {
    maybeStop();
    return;
  }

  const csMethodNames = Object.keys(cs);
  if (csMethodNames.length === 0) {
    maybeStop();
    return;
  }

  if (!methodName) {
    throw new Error(
      'Please provide the method name you are proving (pass it to start(..., methodName)).'
    );
  }
  if (!Object.prototype.hasOwnProperty.call(cs, methodName)) {
    throw new Error(
      `The method "${methodName}" does not exist in the analyzed constraint systems for "${contractName}". ` +
        `Available: ${csMethodNames.join(', ')}`
    );
  }

  const info = cs[methodName];
  if (!info) {
    maybeStop();
    return;
  }

  // CHECK: validate only, no writes
  if (CHECK) {
    checkAgainstBaseline({
      perfRegressionJson,
      contractName,
      label: 'prove',
      methodName,
      digest: info.digest,
      actualTime: time,
    });
    maybeStop();
    return;
  }

  // DUMP: update per-method rows/digest and proveTime; leave compileTime untouched
  if (DUMP) {
    const prev = perfRegressionJson[contractName];
    const merged: PerfRegressionEntry = prev
      ? { ...prev, methods: { ...(prev.methods ?? {}) } }
      : { methods: {} };

    const prevMethod = merged.methods[methodName] ?? {};
    merged.methods[methodName] = {
      rows: info.rows,
      digest: info.digest,
      proveTime: time,
    };

    perfRegressionJson[contractName] = merged;
    fs.writeFileSync(FILE_PATH, JSON.stringify(perfRegressionJson, null, 2));
    maybeStop();
    return;
  }

  // Fallback
  maybeStop();
}

// HELPERS

function flag(name: string) {
  return process.argv.includes(name);
}

// Compare against baseline; throw on mismatch/regression
function checkAgainstBaseline(params: {
  perfRegressionJson: Record<string, PerfRegressionEntry>;
  contractName: string;
  label: 'compile' | 'prove';
  methodName: string;
  digest: string;
  actualTime: number;
}) {
  const { perfRegressionJson, contractName, label, methodName, digest, actualTime } = params;

  const baseline = perfRegressionJson[contractName];
  if (!baseline) {
    throw new Error(`No baseline for "${contractName}". Seed it with --dump first.`);
  }

  // tolerances (same as other file)
  const compileTol = 1.05; // 5%
  const compileTiny = 1.08; // for near-zero baselines
  const proveTolDefault = 1.1; // 10%
  const proveTolSmall = 1.25; // 25% for very small times (<0.2s)

  if (label === 'compile') {
    const expected = baseline.compileTime;
    if (expected == null) {
      throw new Error(
        `No baseline compileTime for "${contractName}". Run --dump (compile) to set it.`
      );
    }
    const tol = expected < 5e-5 ? compileTiny : compileTol;
    const allowedPct = (tol - 1) * 100;

    if (actualTime > expected * tol) {
      const regressionPct = ((actualTime - expected) / expected) * 100;
      throw new Error(
        `Compile regression for ${contractName}\n` +
          `  Actual:   ${actualTime.toFixed(6)}s\n` +
          `  Regression: +${regressionPct.toFixed(2)}% (allowed +${allowedPct.toFixed(0)}%)`
      );
    }
    return;
  }

  // prove checks
  const baseMethod = baseline.methods?.[methodName];
  if (!baseMethod) {
    throw new Error(
      `No baseline method entry for ${contractName}.${methodName}. Run --dump (prove) to add it.`
    );
  }
  if (baseMethod.digest !== digest) {
    throw new Error(
      `Digest mismatch for ${contractName}.${methodName}\n` +
        `  Actual:   ${digest}\n` +
        `  Expected: ${baseMethod.digest}\n`
    );
  }
  const expected = baseMethod.proveTime;
  if (expected == null) {
    throw new Error(
      `No baseline proveTime for ${contractName}.${methodName}. Run --dump (prove) to set it.`
    );
  }
  const tol = expected < 0.2 ? proveTolSmall : proveTolDefault;
  const allowedPct = (tol - 1) * 100;

  if (actualTime > expected * tol) {
    const regressionPct = ((actualTime - expected) / expected) * 100;
    throw new Error(
      `Prove regression for ${contractName}.${methodName}\n` +
        `  Actual:   ${actualTime.toFixed(3)}s\n` +
        `  Regression: +${regressionPct.toFixed(2)}% (allowed +${allowedPct.toFixed(0)}%)`
    );
  }
}
