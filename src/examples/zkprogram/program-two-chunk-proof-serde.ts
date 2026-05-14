import fs from 'node:fs/promises';
import path from 'node:path';
import type { JsonProof } from 'o1js';
import { Cache, Field, Provable, setBackend, ZkProgram } from 'o1js';
import { Gates, KimchiGateType } from '../../lib/provable/gates.js';
import { Performance } from '../../lib/testing/perf-regression.js';

const TWO_CHUNK_MULS = 1 << 17;
const mode = getMode();
const artifactsDir = getArtifactsDir();
const cacheDir = path.join(artifactsDir, 'cache');
const proofPath = path.join(artifactsDir, 'two-chunk-proof.json');
const metadataPath = path.join(artifactsDir, 'metadata.json');

switch (mode) {
  case 'roundtrip-native':
    await roundtripWithNative();
    break;
  default:
    printUsageAndExit(mode);
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
        async method(_input: Field) {
          for (let i = 0; i < TWO_CHUNK_MULS; i++) {
            freshZero().mul(freshZero());
          }
          let zero = freshZero();
          Gates.raw(KimchiGateType.Generic, [zero, zero, zero, zero, zero, zero, zero], []);
          return {
            publicOutput: Field(0),
          };
        },
      },
    },
  });
}

function freshZero() {
  return Provable.witness(Field, () => Field(0));
}

async function roundtripWithNative() {
  setBackend('native');

  let MyProgram = createTwoChunkProgram();
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
  await persistArtifacts(proofJson, cs.baseCase.rows);

  let savedProofJson = await loadProof();
  let proofJsonRoundtrip = JSON.parse(JSON.stringify(savedProofJson)) as JsonProof;
  let roundtripProof = await MyProgram.Proof.fromJSON(proofJsonRoundtrip);
  assertJsonEquals(savedProofJson, roundtripProof.toJSON());

  perf.start('verify standard JSON serde roundtrip', 'baseCase');
  let roundtripIsValid = await MyProgram.verify(roundtripProof);
  perf.end();

  if (!roundtripIsValid) throw new Error('two-chunk standard JSON proof roundtrip failed');

  console.log('Succeeded to roundtrip two-chunk proof JSON with standard serde');
  console.log(`Saved proof to ${proofPath}`);
  console.log(`Saved metadata to ${metadataPath}`);
}

async function persistArtifacts(proof: JsonProof, rows: number) {
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.writeFile(proofPath, JSON.stringify(proof, null, 2) + '\n');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      {
        mode: 'roundtrip-native',
        rows,
        generatedAt: new Date().toISOString(),
        cacheDir,
        proofPath,
      },
      null,
      2
    ) + '\n'
  );
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

function getMode() {
  let explicitMode: string | undefined;

  for (let arg of process.argv.slice(2)) {
    if (arg === 'roundtrip-native') return arg;
    if (!arg.startsWith('--') && !arg.endsWith('.ts')) explicitMode = arg;
  }

  if (explicitMode !== undefined) return explicitMode;
  return 'roundtrip-native';
}

function getArtifactsDir() {
  for (let arg of process.argv.slice(2)) {
    if (arg.startsWith('--artifacts-dir=')) {
      return path.resolve(arg.slice('--artifacts-dir='.length));
    }
  }
  return path.resolve('tests/test-artifacts/program-two-chunk-proof-serde');
}

function printUsageAndExit(mode: string): never {
  throw new Error(
    `Unknown mode "${mode}". Use one of:\n` +
      `  ./run src/examples/zkprogram/program-two-chunk-proof-serde.ts roundtrip-native\n` +
      `Optional:\n` +
      `  --artifacts-dir=/absolute/or/relative/path`
  );
}
