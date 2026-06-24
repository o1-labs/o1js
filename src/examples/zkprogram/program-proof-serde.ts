import fs from 'node:fs/promises';
import path from 'node:path';
import type { JsonProof } from 'o1js';
import { Cache, Field, Gadgets, setBackend, ZkProgram } from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

/**
 * Regression coverage for standard o1js JSON proof serialization.
 *
 * The single-chunk mode keeps coverage for legacy-shaped proofs. The two-chunk
 * mode covers the post-hard-fork behavior where the same high-level JSON serde
 * path must preserve all chunked proof public-input evaluations and verify
 * after deserialization.
 */

const TWO_CHUNK_RANGE_CHECKS = 1 << 16;
const mode = getMode();
const artifactsDir = path.resolve(`tests/test-artifacts/program-proof-serde/${mode}`);
const cacheDir = path.join(artifactsDir, 'cache');
const config = getModeConfig(mode);
const proofPath = path.join(artifactsDir, config.proofFile);

await roundtripProofJsonSerde(config);

type Mode = 'roundtrip-single-wasm' | 'roundtrip-two-native';

type Config = {
  mode: Mode;
  backend: 'native' | 'wasm';
  proofFile: string;
  successMessage: string;
  createProgram: () => ReturnType<typeof ZkProgram>;
};

function getModeConfig(mode: Mode): Config {
  switch (mode) {
    case 'roundtrip-single-wasm':
      return {
        mode,
        backend: 'wasm',
        proofFile: 'single-chunk-proof.json',
        successMessage: 'Succeeded to roundtrip single-chunk proof JSON with wasm backend',
        createProgram: createSingleChunkProgram,
      };
    case 'roundtrip-two-native':
      return {
        mode,
        backend: 'native',
        proofFile: 'two-chunk-proof.json',
        successMessage: 'Succeeded to roundtrip two-chunk proof JSON with native backend',
        createProgram: createTwoChunkProgram,
      };
  }
}

function createSingleChunkProgram() {
  return ZkProgram({
    name: 'example-single-chunk-proof-serde',
    publicOutput: Field,

    methods: {
      baseCase: {
        privateInputs: [Field],
        async method(input: Field) {
          for (let i = 0; i < 1 << 10; i++) {
            Gadgets.rangeCheck64(Field(input).add(Field(i)));
          }
          return {
            publicOutput: Field(0),
          };
        },
      },
    },
  });
}

function createTwoChunkProgram() {
  return ZkProgram({
    numChunks: 2,
    overrideWrapDomain: 1,
    name: 'example-two-chunk-proof-serde',
    publicOutput: Field,

    methods: {
      baseCase: {
        privateInputs: [Field],
        async method(input: Field) {
          for (let i = 0; i < TWO_CHUNK_RANGE_CHECKS; i++) {
            Gadgets.rangeCheck64(Field(input).add(Field(i)));
          }
          return {
            publicOutput: Field(0),
          };
        },
      },
    },
  });
}

async function roundtripProofJsonSerde(config: Config) {
  setBackend(config.backend);

  let MyProgram = config.createProgram();
  let cs = await MyProgram.analyzeMethods();
  let perf = Performance.create(MyProgram.name, cs);
  let cache = Cache.FileSystem(cacheDir, true);

  console.log('MyProgram baseCase method rows:', cs.baseCase.rows);
  console.log(`Using cache directory ${cacheDir}`);

  perf.start('compile');
  await MyProgram.compile({ cache });
  perf.end();

  perf.start('prove', 'baseCase');
  let { proof } = await MyProgram.baseCase(Field(0));
  perf.end();

  let proofJson = proof.toJSON();
  await persistProof(proofJson);

  let savedProofJson = await loadProof();
  let proofJsonRoundtrip = JSON.parse(JSON.stringify(savedProofJson)) as JsonProof;
  let roundtripProof = await MyProgram.Proof.fromJSON(proofJsonRoundtrip);
  assertJsonEquals(savedProofJson, roundtripProof.toJSON());

  perf.start('verify standard JSON serde roundtrip', 'baseCase');
  let roundtripIsValid = await MyProgram.verify(roundtripProof);
  perf.end();

  if (!roundtripIsValid) throw new Error(`${config.mode} standard JSON proof roundtrip failed`);

  console.log(config.successMessage);
  console.log(`Saved proof to ${proofPath}`);
}

async function persistProof(proof: JsonProof) {
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.writeFile(proofPath, JSON.stringify(proof, null, 2) + '\n');
}

async function loadProof(): Promise<JsonProof> {
  return JSON.parse(await fs.readFile(proofPath, 'utf8')) as JsonProof;
}

function assertJsonEquals(proofJson: JsonProof, roundtripProofJson: JsonProof) {
  let expected = JSON.stringify(proofJson);
  let actual = JSON.stringify(roundtripProofJson);
  if (actual === expected) return;

  throw new Error(
    `JSON-serialized proof differs after deserialization.\n` +
      `Expected: ${expected}\n` +
      `Actual:   ${actual}`
  );
}

function getMode(): Mode {
  for (let arg of process.argv.slice(2)) {
    if (arg === 'roundtrip-single-wasm' || arg === 'roundtrip-two-native') return arg;
  }

  return 'roundtrip-single-wasm';
}
