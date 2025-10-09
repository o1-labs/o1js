/**
 * Regression testing framework for individual ZkProgram examples.
 *
 * Stores and compares metadata such as compile & proving times.
 * Can run in two modes:
 * - **Dump**: write baseline results into
 *   {@link tests/perf-regression/perf-regression.json}
 * - **Check**: validate current results against the stored baselines
 *
 * For regression testing of constraint systems (CS) and zkApps,
 * see {@link tests/perf-regression/perf-regression.ts}.
 */

import { ConstraintSystemSummary } from '../provable/core/provable-context.js';
import fs from 'fs';
import path from 'path';

export { Performance, PerfRegressionEntry };

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
  label?: 'compile' | 'prove' | string;
  programName?: string;
  methodsSummary?: Record<string, ConstraintSystemSummary>;
  methodName?: string; // required for prove; optional for compile
};

const FILE_PATH = path.join(process.cwd(), './tests/perf-regression/perf-regression.json');
const DUMP = flag('--dump');
const CHECK = flag('--check');

// Stops the process after the N-th end() call, if STOP_AFTER env is set.
// If STOP_AFTER is not set or invalid, the script runs through normally.
const STOP_AFTER = Number.isFinite(Number(process.env.STOP_AFTER ?? ''))
  ? Number(process.env.STOP_AFTER)
  : undefined;

/**
 * Create a new performance tracking session for a contract.
 *
 * @param programName Name of the program (key in perf-regression.json)
 * @param methodsSummary Optional methods analysis (required for prove checks)
 * @returns An object with `start()` and `end()` methods
 */
function createPerformanceSession(
  programName?: string,
  methodsSummary?: Record<string, ConstraintSystemSummary>,
  log = true
) {
  const perfStack: PerfStack[] = [];
  let endCounter = 0;

  function maybeStop() {
    if (STOP_AFTER && STOP_AFTER > 0) {
      endCounter++;
      if (endCounter >= STOP_AFTER) {
        process.exit(0);
      }
    }
  }

  return {
    /**
     * Start measuring performance for a given phase.
     *
     * @param label The phase label: `'compile' | 'prove' | string`
     * @param methodName Method name (required for `prove`)
     */
    start(label?: 'compile' | 'prove' | string, methodName?: string) {
      perfStack.push({
        label,
        start: performance.now(),
        programName,
        methodsSummary,
        methodName,
      });
    },

    /**
     * End the most recent measurement and:
     * - Optionally log results to console
     * - Dump into baseline JSON (if `--dump`)
     * - Check against baseline (if `--check`)
     */
    end() {
      const frame = perfStack.pop()!;
      const { label, start, programName } = frame;
      let { methodsSummary: cs, methodName } = frame;

      const time = (performance.now() - start) / 1000;

      // Base logging — only if log is enabled
      //              — shows contract.method for prove
      if (log && label) {
        console.log(
          `${label} ${programName ?? ''}${
            label === 'prove' && methodName ? '.' + methodName : ''
          }... ${time.toFixed(3)} sec`
        );
      }

      // If neither --dump nor --check, just optionally log and honor STOP_AFTER
      if (!DUMP && !CHECK) {
        maybeStop();
        return;
      }

      // Only act for compile/prove with required context
      if (!programName || (label !== 'compile' && label !== 'prove')) {
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
            programName,
            label: 'compile', // compile checks don't use method/digest; pass empty strings
            methodName: '',
            digest: '',
            actualTime: time,
          });
          maybeStop();
          return;
        }

        // DUMP: update only contract-level compileTime
        if (DUMP) {
          const prev = perfRegressionJson[programName];
          const merged: PerfRegressionEntry = prev
            ? { ...prev, compileTime: time }
            : { compileTime: time, methods: {} };

          perfRegressionJson[programName] = merged;
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
          `The method "${methodName}" does not exist in the analyzed constraint systems for "${programName}". ` +
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
          programName,
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
        const prev = perfRegressionJson[programName];
        const merged: PerfRegressionEntry = prev
          ? { ...prev, methods: { ...prev.methods } }
          : { methods: {} };

        merged.methods[methodName] = {
          rows: info.rows,
          digest: info.digest,
          proveTime: time,
        };

        perfRegressionJson[programName] = merged;
        fs.writeFileSync(FILE_PATH, JSON.stringify(perfRegressionJson, null, 2));
        maybeStop();
        return;
      }

      // Fallback
      maybeStop();
    },
  };
}

const Performance = {
  /**
   * Initialize a new performance session.
   *
   * @param programName Optional identifier for the program or label.
   *   - When provided with a ZkProgram name and its `methodsSummary`, the session
   *     benchmarks compile and prove phases, storing or checking results against
   *     `perf-regression.json`.
   *   - When used without a ZkProgram, `programName` acts as a freeform label and
   *     the session can be used like `console.time` / `console.timeEnd` to log
   *     timestamps for arbitrary phases.
   * @param methodsSummary Optional analysis of ZkProgram methods, required when
   *   measuring prove performance.
   * @param log Optional boolean flag (default: `true`).
   *   When set to `false`, disables all console output for both general labels
   *   and compile/prove phase logs.
   */
  create(
    programName?: string,
    methodsSummary?: Record<string, ConstraintSystemSummary>,
    log?: boolean
  ) {
    return createPerformanceSession(programName, methodsSummary, log);
  },
};

// HELPERS

function flag(name: string) {
  return process.argv.includes(name);
}

/**
 * Compare a measured time/digest against stored baselines.
 * Throws an error if regression exceeds tolerance.
 */
function checkAgainstBaseline(params: {
  perfRegressionJson: Record<string, PerfRegressionEntry>;
  programName: string;
  label: 'compile' | 'prove';
  methodName: string;
  digest: string;
  actualTime: number;
}) {
  const { perfRegressionJson, programName, label, methodName, digest, actualTime } = params;

  const baseline = perfRegressionJson[programName];
  if (!baseline) {
    throw new Error(`No baseline for "${programName}". Seed it with --dump first.`);
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
        `No baseline compileTime for "${programName}". Run --dump (compile) to set it.`
      );
    }
    const tol = expected < 5e-5 ? compileTiny : compileTol;
    const allowedPct = (tol - 1) * 100;

    if (actualTime > expected * tol) {
      const regressionPct = ((actualTime - expected) / expected) * 100;
      throw new Error(
        `Compile regression for ${programName}\n` +
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
      `No baseline method entry for ${programName}.${methodName}. Run --dump (prove) to add it.`
    );
  }
  if (baseMethod.digest !== digest) {
    throw new Error(
      `Digest mismatch for ${programName}.${methodName}\n` +
        `  Actual:   ${digest}\n` +
        `  Expected: ${baseMethod.digest}\n`
    );
  }
  const expected = baseMethod.proveTime;
  if (expected == null) {
    throw new Error(
      `No baseline proveTime for ${programName}.${methodName}. Run --dump (prove) to set it.`
    );
  }
  const tol = expected < 0.2 ? proveTolSmall : proveTolDefault;
  const allowedPct = (tol - 1) * 100;

  if (actualTime > expected * tol) {
    const regressionPct = ((actualTime - expected) / expected) * 100;
    throw new Error(
      `Prove regression for ${programName}.${methodName}\n` +
        `  Actual:   ${actualTime.toFixed(3)}s\n` +
        `  Regression: +${regressionPct.toFixed(2)}% (allowed +${allowedPct.toFixed(0)}%)`
    );
  }
}
