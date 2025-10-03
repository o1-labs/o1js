/**
 * Performance regression framework for constraint systems (CS) and zkApp
 * instances.
 *
 * This script benchmarks compile-time performance and validates digests for a
 * fixed set of zkApps and CS examples. It supports two modes:
 * - **Dump**: record baseline digests and compile times into
 *   {@link tests/perf-regression/perf-regression.json}
 * - **Check**: compare current results against stored baselines and fail on
 *   regressions or digest mismatches
 *
 * Unlike {@link src/lib/testing/perf-regression.ts}, which records results for
 * each ZkProgram examples separately, this file iterates over imported CS/zkApp
 * instances and updates their digests and compile times as a whole.
 */

import fs from 'fs';
import path from 'path';
import { Voting_ } from '../../src/examples/zkapps/voting/voting.js';
import { Membership_ } from '../../src/examples/zkapps/voting/membership.js';
import { HelloWorld } from '../../src/examples/zkapps/hello-world/hello-world.js';
import { TokenContract, createDex } from '../../src/examples/zkapps/dex/dex.js';
import {
  GroupCS,
  BitwiseCS,
  HashCS,
  BasicCS,
  CryptoCS,
} from '../vk-regression/plain-constraint-system.js';
import { tic, toc } from '../../src/lib/util/tic-toc.js';
import { PerfRegressionEntry } from '../../src/lib/testing/perf-regression.js';

// toggle to override caches
const forceRecompile = false;

// flags
const dump = process.argv.includes('--dump');
const check = process.argv.includes('--check');

// path arg: fallback to default
const maybePathIdx = Math.max(process.argv.indexOf('--dump'), 0) ? 5 : 4;
const jsonPath =
  process.argv[maybePathIdx] && process.argv[maybePathIdx].startsWith('--')
    ? undefined
    : process.argv[maybePathIdx];

let filePath = jsonPath ? jsonPath : './tests/perf-regression/perf-regression.json';

type MinimumConstraintSystem = {
  analyzeMethods(): Promise<Record<string, { rows: number; digest: string }>>;
  compile(options?: { forceRecompile?: boolean }): Promise<{
    verificationKey: { hash: { toString(): string }; data: string };
  }>;
  digest(): Promise<string>;
  name: string;
};

const ConstraintSystems: MinimumConstraintSystem[] = [
  Voting_,
  Membership_,
  HelloWorld,
  TokenContract,
  createDex().Dex,
  GroupCS,
  BitwiseCS,
  HashCS,
  BasicCS,
  CryptoCS,
];

// Load regression JSON (allow empty on dump, require on check)
let perfRegressionJson: Record<string, PerfRegressionEntry>;
try {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  filePath = resolved;
  perfRegressionJson = JSON.parse(fs.readFileSync(resolved, 'utf8'));
} catch (error) {
  if (!dump) {
    throw Error(
      `The requested file ${filePath} does not exist. Run with --dump first to create it.`
    );
  } else {
    perfRegressionJson = {};
  }
}

/**
 * CHECK compile-only:
 *  - Verify contract digest matches baseline
 *  - Check compileTime within tolerance
 */
async function checkPerf(contracts: MinimumConstraintSystem[]) {
  let errorStack = '';

  for await (const c of contracts) {
    const ref = perfRegressionJson[c.name];
    if (!ref) {
      errorStack += `\nNo baseline found for "${c.name}". Run with --dump to seed it.`;
      continue;
    }

    // contract digest check
    const actualDigest = await c.digest();
    if (ref.digest && actualDigest !== ref.digest) {
      errorStack += `\nDigest mismatch for ${c.name}
  Actual:   ${actualDigest}
  Expected: ${ref.digest}`;
    }

    // compile regression check
    tic(`compile (${c.name})`);
    await c.compile({ forceRecompile });
    const compileTime = toc();

    const expectedCompile = ref.compileTime;
    if (expectedCompile == null) {
      errorStack += `\nNo baseline compileTime for "${c.name}". Run with --dump to set it.`;
      continue;
    }

    const tolerance = expectedCompile < 5e-5 ? 1.08 : 1.05;
    const allowedPct = (tolerance - 1) * 100;

    if (compileTime > expectedCompile * tolerance) {
      const regressionPct = ((compileTime - expectedCompile) / expectedCompile) * 100;
      errorStack += `\n\nCompile regression for ${c.name}
  Actual:     ${compileTime.toFixed(6)}s
  Regression: +${regressionPct.toFixed(2)}% (allowed +${allowedPct.toFixed(0)}%)`;
    }
  }

  if (errorStack) throw Error(errorStack);
}

/**
 * DUMP compile-only:
 *  - Update contract digest + compileTime
 *  - Preserve existing methods/proveTime (from ZkPrograms)
 */
async function dumpPerf(contracts: MinimumConstraintSystem[]) {
  const out: Record<string, PerfRegressionEntry> = { ...perfRegressionJson };

  for await (const c of contracts) {
    const contractDigest = await c.digest();

    tic(`compile (${c.name})`);
    await c.compile({ forceRecompile });
    const compileTime = toc();

    const prev = out[c.name];
    const merged: PerfRegressionEntry = prev
      ? {
          ...prev,
          digest: contractDigest,
          compileTime,
        }
      : {
          digest: contractDigest,
          compileTime,
          methods: {},
        };

    out[c.name] = merged;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2));
}

if (dump) {
  await dumpPerf(ConstraintSystems);
} else if (check) {
  await checkPerf(ConstraintSystems);
} else {
  throw new Error('Please pass --dump or --check (compile-only performance).');
}
