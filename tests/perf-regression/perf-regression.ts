import fs from 'fs';
import { Voting_ } from '../../src/examples/zkapps/voting/voting.js';
import { Membership_ } from '../../src/examples/zkapps/voting/membership.js';
import { HelloWorld } from '../../src/examples/zkapps/hello-world/hello-world.js';
import { TokenContract, createDex } from '../../src/examples/zkapps/dex/dex.js';
import { ecdsa, keccakAndEcdsa, ecdsaEthers } from '../../src/examples/crypto/ecdsa/ecdsa.js';
import { SHA256Program } from '../../src/examples/crypto/sha256/sha256.js';
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

//! slippage is not relevant for very small circuits e.g 0.000015055999159812927
// toggle this for quick iteration when debugging vk regressions
const skipVerificationKeys = false;

// toggle to override caches
const forceRecompile = false;

// usage ./run ./tests/perf-regression/perf-regression.ts --bundle --dump ./tests/perf-regression/perf-regression.json
let dump = process.argv[4] === '--dump';
let jsonPath = process.argv[dump ? 5 : 4];
let perfTest = process.env.PERF_TEST;

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
};
// ecdsa => verifySignedHash
// keccakAndEcdsa => verifyEcdsa
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
// console.log('TokenContract._methods: ', TokenContract._methods);
// console.log('ecdsa.rawMethods: ', ecdsa.rawMethods);
// ecdsa.rawMethods.verifySignedHash()
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
} else if (!dump) {
  throw new Error('Invalid PERF_TEST value. Please set PERF_TEST to 1 or 2!');
}

let filePath = jsonPath ? jsonPath : './tests/perf-regression/perf-regression.json';
let RegressionJson: {
  [contractName: string]: {
    digest: string;
    methods: Record<string, { rows: number; digest: string }>;
    performance: {
      compile: number;
      prove: number;
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

  for await (const c of contracts) {
    let ref = RegressionJson[c.name];
    if (!ref)
      throw Error(
        `Performance benchmarks for contract ${c.name} was not found, try dumping it first.`
      );
    let perf = ref.performance;

    tic(`compile (${c.name})`);
    let {
      verificationKey: { data, hash },
    } = await c.compile({ forceRecompile });
    let compileTime = toc();

    let methodData = await c.analyzeMethods();

    for (const methodKey in methodData) {
      let actualMethod = methodData[methodKey];
      let expectedMethod = ref.methods[methodKey];

      if (actualMethod.digest !== expectedMethod.digest) {
        errorStack += `\n\nMethod digest mismatch for ${c.name}.${methodKey}()
  Actual
    ${JSON.stringify({ digest: actualMethod.digest, rows: actualMethod.rows }, undefined, 2)}
  \n
  Expected
    ${JSON.stringify({ digest: expectedMethod.digest, rows: expectedMethod.rows }, undefined, 2)}`;
      }
    }

    //TODO diplay the ratio if positive or negative
    if (compileTime > perf.compile * 1.05) {
      errorStack += `\n\nRegression test for contract ${
        c.name
      } failed, because of a notable performance tolerance breach.
Contract has
  ${JSON.stringify(compileTime, undefined, 2)}
\n
but expected was
  ${JSON.stringify(perf.compile, undefined, 2)}`;
    }
  }

  if (errorStack) {
    throw Error(errorStack);
  }
}

// Should have the option to update method digest following vk-regression
async function dumpVk(contracts: typeof ConstraintSystems) {
  let newEntries: typeof RegressionJson = {};
  for await (const c of contracts) {
    let data = await c.analyzeMethods();
    let digest = await c.digest();
    // let verificationKey: { data: string; hash: { toString(): string } } | undefined;
    let perf:
      | {
          compile: number;
          prove: number;
        }
      | undefined;
    let compileTime = 0;
    if (!skipVerificationKeys) {
      tic(`compile (${c.name})`);
      await c.compile({ forceRecompile });
      compileTime = toc();
    }
    newEntries[c.name] = {
      digest,
      methods: Object.fromEntries(
        Object.entries(data).map(([key, { rows, digest }]) => [key, { rows, digest }])
      ),
      performance: {
        compile: compileTime,
        // prove: verificationKey?.hash.toString() ?? '0',
        prove: 0,
      },
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(newEntries, undefined, 2));
}

if (dump) await dumpVk(ConstraintSystems);
else await checkPerf(selectedConstraintSystems);
