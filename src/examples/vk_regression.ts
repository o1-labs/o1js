import fs from 'fs';
import { Voting_ } from './zkapps/voting/voting.js';
import { Membership_ } from './zkapps/voting/membership.js';
import { HelloWorld } from './zkapps/hello_world/hello_world.js';
import { TokenContract, createDex } from './zkapps/dex/dex.js';
import { GroupCS } from './primitive_constraint_system.js';

// toggle this for quick iteration when debugging vk regressions
const skipVerificationKeys = false;

// usage ./run ./src/examples/vk_regression.ts --bundle --dump ./src/examples/regression_test.json
let dump = process.argv[4] === '--dump';
let jsonPath = process.argv[dump ? 5 : 4];

type MinimumConstraintSystem = {
  analyzeMethods(): Record<
    string,
    {
      rows: number;
      digest: string;
    }
  >;
  compile(): Promise<{
    verificationKey: {
      hash: { toString(): string };
      data: string;
    };
  }>;
  digest(): string;
  name: string;
};

const ConstraintSystems: MinimumConstraintSystem[] = [
  Voting_,
  Membership_,
  HelloWorld,
  TokenContract,
  createDex().Dex,
  GroupCS,
];

let filePath = jsonPath ? jsonPath : './src/examples/regression_test.json';
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
      `The requested file ${filePath} does not yet exist, try dumping the verification keys first. ./run ./src/examples/vk_regression.ts [--bundle] --dump `
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
    } = await c.compile();

    let methodData = c.analyzeMethods();

    for (const methodKey in methodData) {
      let actualMethod = methodData[methodKey];
      let expectedMethod = ref.methods[methodKey];

      if (actualMethod.digest !== expectedMethod.digest) {
        errorStack += `\n\nMethod digest mismatch for ${c.name}.${methodKey}()
  Actual
    ${JSON.stringify(
      {
        digest: actualMethod.digest,
        rows: actualMethod.rows,
      },
      undefined,
      2
    )}
  \n
  Expected
    ${JSON.stringify(
      {
        digest: expectedMethod.digest,
        rows: expectedMethod.rows,
      },
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
  ${JSON.stringify(
    {
      data,
      hash,
    },
    undefined,
    2
  )}
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
    let data = c.analyzeMethods();
    let digest = c.digest();
    let verificationKey:
      | { data: string; hash: { toString(): string } }
      | undefined;
    if (!skipVerificationKeys) ({ verificationKey } = await c.compile());
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
else await checkVk(ConstraintSystems);
