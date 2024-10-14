import fs from 'fs';
import { Voting_ } from '../../src/examples/zkapps/voting/voting.js';
import { Membership_ } from '../../src/examples/zkapps/voting/membership.js';
import { HelloWorld } from '../../src/examples/zkapps/hello-world/hello-world.js';
import { TokenContract, createDex } from '../../src/examples/zkapps/dex/dex.js';
import {
  ecdsa,
  keccakAndEcdsa,
  ecdsaEthers,
} from '../../src/examples/crypto/ecdsa/ecdsa.js';
import { SHA256Program } from '../../src/examples/crypto/sha256/sha256.js';
import { BLAKE2BProgram } from '../../src/examples/crypto/blake2b/blake2b.js'
import {
  GroupCS,
  BitwiseCS,
  HashCS,
  BasicCS,
  CryptoCS,
} from './plain-constraint-system.js';
import { diverse } from './diverse-zk-program.js';

// toggle this for quick iteration when debugging vk regressions
const skipVerificationKeys = false;

// toggle to override caches
const forceRecompile = false;

// usage ./run ./tests/vk-regression/vk-regression.ts --bundle --dump ./tests/vk-regression/vk-regression.json
let dump = process.argv[4] === '--dump';
let jsonPath = process.argv[dump ? 5 : 4];
let vkTest = process.env.VK_TEST;

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

let selectedConstraintSystems: MinimumConstraintSystem[] = [];

if (vkTest === '1') {
  selectedConstraintSystems = ConstraintSystems.slice(0, 10);
  console.log('Running regression checks - Part 1');
} else if (vkTest === '2') {
  selectedConstraintSystems = ConstraintSystems.slice(10);
  console.log('Running regression checks - Part 2');
} else if (!dump) {
  throw new Error('Invalid VK_TEST value. Please set VK_TEST to 1 or 2!');
}

let filePath = jsonPath ? jsonPath : './tests/vk-regression/vk-regression.json';
let RegressionJson: {
  [contractName: string]: {
    digest: string;
    methods: Record<string, { rows: number; digest: string }>;
    verificationKey: {
      hash: string;
      data: string;
    };
  };
};

try {
  RegressionJson = JSON.parse(fs.readFileSync(filePath).toString());
} catch (error) {
  if (!dump) {
    throw Error(
      `The requested file ${filePath} does not yet exist, try dumping the verification keys first. npm run dump-vks`
    );
  }
}

async function checkVk(contracts: typeof ConstraintSystems) {
  let errorStack = '';

  for await (const c of contracts) {
    let ref = RegressionJson[c.name];
    if (!ref)
      throw Error(
        `Verification key for contract ${c.name} was not found, try dumping it first.`
      );
    let vk = ref.verificationKey;

    let {
      verificationKey: { data, hash },
    } = await c.compile({ forceRecompile });

    let methodData = await c.analyzeMethods();

    for (const methodKey in methodData) {
      let actualMethod = methodData[methodKey];
      let expectedMethod = ref.methods[methodKey];

      if (actualMethod.digest !== expectedMethod.digest) {
        errorStack += `\n\nMethod digest mismatch for ${c.name}.${methodKey}()
  Actual
    ${JSON.stringify(
      { digest: actualMethod.digest, rows: actualMethod.rows },
      undefined,
      2
    )}
  \n
  Expected
    ${JSON.stringify(
      { digest: expectedMethod.digest, rows: expectedMethod.rows },
      undefined,
      2
    )}`;
      }
    }

    if (data !== vk.data || hash.toString() !== vk.hash) {
      errorStack += `\n\nRegression test for contract ${
        c.name
      } failed, because of a verification key mismatch.
Contract has
  ${JSON.stringify({ data, hash }, undefined, 2)}
\n
but expected was
  ${JSON.stringify(ref.verificationKey, undefined, 2)}`;
    }
  }

  if (errorStack) {
    throw Error(errorStack);
  }
}

async function dumpVk(contracts: typeof ConstraintSystems) {
  let newEntries: typeof RegressionJson = {};
  for await (const c of contracts) {
    let data = await c.analyzeMethods();
    let digest = await c.digest();
    let verificationKey:
      | { data: string; hash: { toString(): string } }
      | undefined;
    if (!skipVerificationKeys)
      ({ verificationKey } = await c.compile({ forceRecompile }));
    newEntries[c.name] = {
      digest,
      methods: Object.fromEntries(
        Object.entries(data).map(([key, { rows, digest }]) => [
          key,
          { rows, digest },
        ])
      ),
      verificationKey: {
        data: verificationKey?.data ?? '',
        hash: verificationKey?.hash.toString() ?? '0',
      },
    };
  }

  fs.writeFileSync(filePath, JSON.stringify(newEntries, undefined, 2));
}

if (dump) await dumpVk(ConstraintSystems);
else await checkVk(selectedConstraintSystems);
