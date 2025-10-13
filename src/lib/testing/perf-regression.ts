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
 *
 * @note
 * Command-line arguments:
 * - `--dump` (alias `-d`): dump performance data into the baseline file.
 * - `--check` (alias `-c`): check performance against the existing baseline.
 * - `--file` (alias `-f`): specify a custom JSON path (default: `./tests/perf-regression/perf-regression.json`).
 * - `--silent`: suppress all console output.
 *
 * These flags are mutually exclusive for modes (`--dump` and `--check` cannot be used together).
 * When neither is provided, the script runs in log-only mode.
 */

import fs from 'fs';
import minimist from 'minimist';
import path from 'path';
import { ConstraintSystemSummary } from '../provable/core/provable-context.js';

export { PerfRegressionEntry, Performance };

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

const argv = minimist(process.argv.slice(2), {
  boolean: ['dump', 'check', 'silent'],
  string: ['file'],
  alias: {
    f: 'file',
    d: 'dump',
    c: 'check',
  },
});

const DUMP = Boolean(argv.dump);
const CHECK = Boolean(argv.check);
const SILENT = Boolean(argv.silent);

// Cannot use both dump and check
if (DUMP && CHECK) {
  console.error('Error: You cannot use both --dump and --check at the same time!');
  process.exit(1);
}

const FILE_PATH = path.isAbsolute(argv.file ?? '')
  ? argv.file
  : path.join(
      process.cwd(),
      argv.file ? argv.file : './tests/perf-regression/perf-regression.json'
    );

// Create directory & file if missing (only on dump)
if (DUMP) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, '{}', 'utf8');
}

/**
 * Create a new performance tracking session for a program.
 *
 * @param programName Name of the program (key in perf-regression.json)
 * @param methodsSummary Optional methods analysis (required for prove checks)
 * @param log Optional boolean (default: true). If `--silent` is passed via CLI,
 *            it overrides this and disables all logs.
 * @returns An object with `start()` and `end()` methods
 */
function createPerformanceSession(
  programName?: string,
  methodsSummary?: Record<string, ConstraintSystemSummary>,
  log = true
) {
  const perfStack: PerfStack[] = [];
  const shouldLog = SILENT ? false : log;

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
     * - Logs results to the console by default. This can be disabled by setting `log` to `false`
     *   when creating the session, or by passing the `--silent` flag when running the file.
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
      if (shouldLog && label) {
        console.log(
          `${label} ${programName ?? ''}${
            label === 'prove' && methodName ? '.' + methodName : ''
          }... ${time.toFixed(3)} sec`
        );
      }

      // If neither --dump nor --check, just optionally log
      if (!DUMP && !CHECK) return;

      // Only act for compile/prove with required context
      if (!programName || (label !== 'compile' && label !== 'prove')) return;

      // Load the baseline JSON used for both DUMP and CHECK modes.
      // - In DUMP mode: merge new data with existing entries so multiple methods remain grouped.
      // - In CHECK mode: compare current results against stored baselines.
      const raw = fs.readFileSync(FILE_PATH, 'utf8');
      const perfRegressionJson: Record<string, PerfRegressionEntry> = JSON.parse(raw);

      if (label === 'compile') {
        // DUMP: update only contract-level compileTime
        if (DUMP) {
          dumpCompile(perfRegressionJson, programName, time);
          return;
        }

        // CHECK: validate against baseline (no writes)
        if (CHECK) {
          checkCompile(perfRegressionJson, programName, time);
          return;
        }
      }

      if (label === 'prove') {
        // Require analyzed methods summary when proving
        if (!cs) {
          throw new Error(
            'methodsSummary is required for "prove". Pass it to Performance.create(programName, methodsSummary).'
          );
        }

        // Require the specific method name
        if (!methodName) {
          throw new Error(
            'Please provide the method name you are proving (start("prove", methodName)).'
          );
        }

        // Look up the method; error if missing (also covers empty methodsSummary)
        const info = cs[methodName as keyof typeof cs];
        if (!info) {
          const available = Object.keys(cs);
          throw new Error(
            `The method "${methodName}" does not exist in the analyzed constraint system for "${programName}". ` +
              `Available: ${available.length ? available.join(', ') : '(none)'}`
          );
        }

        // DUMP: update per-method rows/digest and proveTime; leave compileTime untouched
        if (DUMP) {
          dumpProve(perfRegressionJson, programName, methodName, info, time);
          return;
        }

        // CHECK: validate only, no writes
        if (CHECK) {
          checkProve(perfRegressionJson, programName, methodName, info.digest, time);
          return;
        }
      }
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
   *   - When set to `false`, disables all console output for both general labels
   *     and compile/prove phase logs.
   *   - When the `--silent` flag is provided, it overrides this setting and disables
   *     all logging regardless of the `log` value.
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

function dumpCompile(
  perfRegressionJson: Record<string, PerfRegressionEntry>,
  programName: string,
  time: number
) {
  const prev = perfRegressionJson[programName];
  const merged: PerfRegressionEntry = prev
    ? { ...prev, compileTime: time }
    : { compileTime: time, methods: {} };

  perfRegressionJson[programName] = merged;
  fs.writeFileSync(FILE_PATH, JSON.stringify(perfRegressionJson, null, 2));
}

function dumpProve(
  perfRegressionJson: Record<string, PerfRegressionEntry>,
  programName: string,
  methodName: string,
  info: ConstraintSystemSummary,
  time: number
) {
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
}

function checkCompile(
  perfRegressionJson: Record<string, PerfRegressionEntry>,
  programName: string,
  actualTime: number
) {
  checkAgainstBaseline({
    perfRegressionJson,
    programName,
    label: 'compile', // compile checks don't use method/digest; pass empty strings
    methodName: '',
    digest: '',
    actualTime,
  });
}

function checkProve(
  perfRegressionJson: Record<string, PerfRegressionEntry>,
  programName: string,
  methodName: string,
  digest: string,
  actualTime: number
) {
  checkAgainstBaseline({
    perfRegressionJson,
    programName,
    label: 'prove',
    methodName,
    digest,
    actualTime,
  });
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
