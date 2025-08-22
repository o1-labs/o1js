import fs from 'fs';
import { Voting_ } from '../../src/examples/zkapps/voting/voting.js';
import { Membership_ } from '../../src/examples/zkapps/voting/membership.js';
import { HelloWorld } from '../../src/examples/zkapps/hello-world/hello-world.js';
import { TokenContract, createDex } from '../../src/examples/zkapps/dex/dex.js';
import {
  ecdsa,
  keccakAndEcdsa,
  ecdsaEthers,
  Secp256k1,
  Bytes32,
  Ecdsa,
} from '../../src/examples/crypto/ecdsa/ecdsa.js';
import { SHA256Program, Bytes12 } from '../../src/examples/crypto/sha256/sha256.js';
import { BLAKE2BProgram } from '../../src/examples/crypto/blake2b/blake2b.js';
import {
  GroupCS,
  BitwiseCS,
  HashCS,
  BasicCS,
  CryptoCS,
} from '../vk-regression/plain-constraint-system.js';
import { diverse } from '../vk-regression/diverse-zk-program.js';
import { tic, toc } from '../../src/lib/util/tic-toc.js';
import { Keccak } from 'o1js';

// toggle to override caches
const forceRecompile = false;

// flags (robust anywhere in argv)
const dump = process.argv.includes('--dump');
const compileEnabled = process.argv.includes('--compile');
const proveEnabled = process.argv.includes('--prove');

// path arg: keep previous positional behavior, but fall back to default
const maybePathIdx = Math.max(process.argv.indexOf('--dump'), 0) ? 5 : 4;
const jsonPath =
  process.argv[maybePathIdx] && process.argv[maybePathIdx].startsWith('--')
    ? undefined
    : process.argv[maybePathIdx];

const perfTest = process.env.PERF_TEST;

type Provers =
  | typeof ecdsa.rawMethods // verifySignedHash
  | typeof keccakAndEcdsa.rawMethods // verifyEcdsa
  | typeof ecdsaEthers.rawMethods // verifyEthers
  | typeof SHA256Program.rawMethods // sha256
  | typeof BLAKE2BProgram.rawMethods // blake2b
  | typeof diverse.rawMethods; // ecdsa + sha3 + poseidon + pallas + generic + recursive

const privateKey = Secp256k1.Scalar.random();
const publicKey = Secp256k1.generator.scale(privateKey);
const message = Bytes32.fromString("what's up");
const signature = Ecdsa.sign(message.toBytes(), privateKey.toBigInt());

const msgHashBytes = Keccak.ethereum(message);

const compressedPublicKey = '0x020957928494c38660d254dc03ba78f091a4aea0270afb447f193c4daf6648f02b';
const publicKeyE = Secp256k1.fromEthers(compressedPublicKey);
const rawSignature =
  '0x6fada464c3bc2ae127f8c907c0c4bccbd05ba83a584156edb808b7400346b4c9558598d9c7869f5fd75d81128711f6621e4cb5ba2f52a2a51c46c859f49a833a1b';
const signatureE = Ecdsa.fromHex(rawSignature);
const msg = 'Secrets hidden, truth in ZKPs ;)';
const msgBytes = Bytes32.fromString(msg);

const preimage = Bytes12.random();

const proverInputs = {
  sha256: { sha256: [preimage] },
  'ecdsa-only': {
    verifySignedHash: [msgHashBytes, signature, publicKey],
  },
  ecdsa: {
    verifyEcdsa: [message, signature, publicKey],
  },
  'ecdsa-ethers': { verifyEthers: [msgBytes, signatureE, publicKeyE] },
  blake2b: { blake2b: [preimage] },
};

type MinimumConstraintSystem = {
  analyzeMethods(): Promise<
    Record<
      string,
      {
        rows: number;
        digest: string;
      }
    >
  >;
  compile(options?: { forceRecompile?: boolean }): Promise<{
    verificationKey: {
      hash: { toString(): string };
      data: string;
    };
  }>;
  digest(): Promise<string>;
  name: string;
  rawMethods?: Provers;
};

const ConstraintSystems: MinimumConstraintSystem[] = [
  ecdsa,
  keccakAndEcdsa,
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
  ecdsaEthers,
  SHA256Program,
  BLAKE2BProgram,
  diverse,
];

function hasProp<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

type ProveResult = { method: string; proveTime: number };

async function prove(c: MinimumConstraintSystem, skip?: string[]): Promise<ProveResult[]> {
  const results: ProveResult[] = [];
  if (skip?.includes(c.name)) {
    console.log(`skipped proving (${c.name})`);
    return [{ method: '_', proveTime: 0 }];
  }
  if (!c.rawMethods) return results;

  for (const methodName of Object.keys(c.rawMethods)) {
    const inputs = proverInputs[c.name]?.[methodName];
    if (!inputs) continue;

    if (!hasProp(c as any, methodName)) continue;
    const method = (c as any)[methodName];
    if (typeof method !== 'function') continue;

    tic(`prove (${c.name}): ${methodName}`);
    await method(...inputs);
    const proveTime = toc();

    results.push({ method: methodName, proveTime });
  }

  return results;
}

let selectedConstraintSystems: MinimumConstraintSystem[] = [];
if (perfTest === '1') {
  selectedConstraintSystems = ConstraintSystems.slice(0, 10);
  console.log('Running regression checks - Part 1');
} else if (perfTest === '2') {
  selectedConstraintSystems = ConstraintSystems.slice(10);
  console.log('Running regression checks - Part 2');
} else if (dump) {
  selectedConstraintSystems = ConstraintSystems;
  console.log('Running regression checks - All Parts');
} else {
  // for non-dump runs, still require PERF_TEST to split load.
  throw new Error('Invalid PERF_TEST value. Please set PERF_TEST to 1 or 2!');
}

let filePath = jsonPath ? jsonPath : './tests/perf-regression/perf-regression.json';

let RegressionJson: {
  [contractName: string]: {
    digest: string;
    methods: Record<string, { rows: number; digest: string }>;
    performance: {
      compile: number;
      prove: ProveResult[];
    };
  };
};

try {
  RegressionJson = JSON.parse(fs.readFileSync(filePath).toString());
} catch (error) {
  if (!dump) {
    throw Error(
      `The requested file ${filePath} does not yet exist, try dumping the performance benchmarks first. npm run dump-perf`
    );
  }
}

async function checkPerf(contracts: typeof ConstraintSystems) {
  let errorStack = '';

  // if neither flag is set, run both checks by default
  const doCompileCheck = compileEnabled || (!compileEnabled && !proveEnabled);
  const doProveCheck = proveEnabled || (!compileEnabled && !proveEnabled);

  for await (const c of contracts) {
    const ref = RegressionJson[c.name];
    if (!ref) {
      throw Error(
        `Performance benchmarks for contract ${c.name} were not found, try dumping first.`
      );
    }

    // digest / rows sanity (always do this)
    const methodData = await c.analyzeMethods();
    for (const methodKey in methodData) {
      const actualMethod = methodData[methodKey];
      const expectedMethod = ref.methods[methodKey];

      if (!expectedMethod || actualMethod.digest !== expectedMethod.digest) {
        errorStack += `\n\nMethod digest mismatch for ${c.name}.${methodKey}()
  Actual
    ${JSON.stringify({ digest: actualMethod.digest, rows: actualMethod.rows }, undefined, 2)}

  Expected
    ${JSON.stringify(expectedMethod ?? null, undefined, 2)}`;
      }
    }

    // compile regression check
    if (doCompileCheck) {
      tic(`compile (${c.name})`);
      await c.compile({ forceRecompile });
      const compileTime = toc();

      const expectedCompile = ref.performance.compile;
      const tolerance = expectedCompile < 5e-5 ? 1.08 : 1.05; // absolute ratio
      const tolerancePct = (tolerance - 1) * 100; // display as delta (e.g., 5%)

      if (compileTime > expectedCompile * tolerance) {
        const slippage = (compileTime - expectedCompile) / compileTime;
        errorStack += `\n\nCompile regression for ${c.name}: ${(slippage * 100).toFixed(
          3
        )}% > ${tolerancePct.toFixed()}%
  Actual compile: ${compileTime.toFixed(6)}s
  Expected max:   ${(expectedCompile * tolerance).toFixed(3)}s (baseline ${expectedCompile.toFixed(
          6
        )}s, tolerance +${tolerancePct.toFixed()}%)`;
      }
    }

    // prove regression check (per-method)
    if (doProveCheck) {
      // ensure compiled before proving
      tic(`compile (${c.name}) [for prove]`);
      await c.compile({ forceRecompile });
      toc();

      const actualProves = await prove(c);
      const expectedProves = (ref.performance.prove || []) as ProveResult[];

      const expMap = new Map(expectedProves.map((p) => [p.method, p.proveTime]));
      for (const p of actualProves) {
        const expected = expMap.get(p.method);
        if (expected === undefined) continue; // no baseline for this method

        const tolerance = expected < 0.2 ? 1.25 : 1.1;
        const tolerancePct = (tolerance - 1) * 100;

        if (p.proveTime > expected * tolerance) {
          const slippage = (p.proveTime - expected) / p.proveTime;
          errorStack += `\n\nProve regression for ${c.name}.${p.method}: ${(slippage * 100).toFixed(
            3
          )}% > ${tolerancePct.toFixed()}%
  Actual prove: ${p.proveTime.toFixed(3)}s
  Expected max: ${(expected * tolerance).toFixed(3)}s (baseline ${expected.toFixed(
            3
          )}s, tolerance +${tolerancePct.toFixed()}%)`;
        }
      }
    }
  }

  if (errorStack) {
    throw Error(errorStack);
  }
}

async function dumpPerf(contracts: typeof ConstraintSystems) {
  if (!compileEnabled && !proveEnabled)
    throw new Error("Please provide a '--compile' or '--prove' argument");

  const out: typeof RegressionJson = { ...RegressionJson };

  for await (const c of contracts) {
    const data = await c.analyzeMethods();
    const digest = await c.digest();
    const prev = out[c.name];

    // seed from previous entry so we only touch what we're updating
    const entry: {
      digest: string;
      methods: Record<string, { rows: number; digest: string }>;
      performance: { compile?: number; prove?: ProveResult[] } & {
        compile: number;
        prove: ProveResult[];
      };
    } = {
      digest,
      methods: Object.fromEntries(
        Object.entries(data).map(([key, { rows, digest }]) => [key, { rows, digest }])
      ),
      performance: {
        compile: prev?.performance?.compile ?? 0,
        prove: prev?.performance?.prove ?? [],
      },
    };

    if (compileEnabled) {
      tic(`compile (${c.name})`);
      await c.compile({ forceRecompile });
      entry.performance.compile = toc();
    }

    if (proveEnabled && c.rawMethods) {
      await c.compile({ forceRecompile });
      const proveResults = await prove(c, ['ecdsa-only', 'diverse', 'ecdsa']); // keep your skip list
      entry.performance.prove = proveResults;
    }

    out[c.name] = entry;
  }

  fs.writeFileSync(filePath, JSON.stringify(out, undefined, 2));
}

if (dump) await dumpPerf(ConstraintSystems);
else await checkPerf(selectedConstraintSystems);
