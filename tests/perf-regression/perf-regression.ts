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

// usage ./run ./tests/perf-regression/perf-regression.ts --bundle --dump ./tests/perf-regression/perf-regression.json
let dump = process.argv[4] === '--dump';
let jsonPath = process.argv[dump ? 5 : 4];
let perfTest = process.env.PERF_TEST;

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
  if (skip !== undefined)
    if (skip.includes(c.name)) {
      console.log(`skipped proving (${c.name})`);
      return [{ method: '_', proveTime: 0 }];
    }

  if (!c.rawMethods) return results;

  for (const methodName of Object.keys(c.rawMethods)) {
    const inputs = proverInputs[c.name][methodName];
    if (!inputs) continue; // skip methods we didn't wire inputs for

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

  for await (const c of contracts) {
    let ref = RegressionJson[c.name];
    if (!ref)
      throw Error(
        `Performance benchmarks for contract ${c.name} was not found, try dumping it first.`
      );
    let perf = ref.performance;

    tic(`compile (${c.name})`);
    await c.compile({ forceRecompile });
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
      } failed, because of a notable performance tolerance breach of ${
        (compileTime - perf.compile) / 100
      }.
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

async function dumpPerf(contracts: typeof ConstraintSystems) {
  let newEntries: typeof RegressionJson = {};
  for await (const c of contracts) {
    let data = await c.analyzeMethods();
    let digest = await c.digest();

    let compileTime = 0;
    let proveResults: ProveResult[] = [];
    tic(`compile (${c.name})`);
    await c.compile({ forceRecompile });
    compileTime = toc();

    if (c.rawMethods) proveResults = await prove(c, ['ecdsa-only', 'diverse']);

    newEntries[c.name] = {
      digest,
      methods: Object.fromEntries(
        Object.entries(data).map(([key, { rows, digest }]) => [key, { rows, digest }])
      ),
      performance: {
        compile: compileTime,
        prove: proveResults,
      },
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(newEntries, undefined, 2));
}

if (dump) await dumpPerf(ConstraintSystems);
else await checkPerf(selectedConstraintSystems);
