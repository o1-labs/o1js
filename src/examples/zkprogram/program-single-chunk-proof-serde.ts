import fs from 'node:fs/promises';
import path from 'node:path';
import type { JsonProof } from 'o1js';
import { Cache, Field, Gadgets, setBackend, ZkProgram } from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

const mode = getMode();
const artifactsDir = getArtifactsDir();
const cacheDir = path.join(artifactsDir, 'cache');
const proofPath = path.join(artifactsDir, 'single-chunk-proof.json');
const metadataPath = path.join(artifactsDir, 'metadata.json');

switch (mode) {
  case 'roundtrip-wasm':
    await roundtripWithWasm();
    break;
  default:
    printUsageAndExit(mode);
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

async function roundtripWithWasm() {
  setBackend('wasm');

  let MyProgram = createSingleChunkProgram();
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

  await persistArtifacts(proof.toJSON(), cs.baseCase.rows);

  let proofJson = await loadProof();
  let proofJsonRoundtrip = JSON.parse(JSON.stringify(proofJson)) as JsonProof;
  let roundtripProof = await MyProgram.Proof.fromJSON(proofJsonRoundtrip);
  assertJsonEquals(proofJson, roundtripProof.toJSON());

  console.log('Succeeded to roundtrip single-chunk proof JSON with wasm backend');
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
        mode: 'roundtrip-wasm',
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

function getMode() {
  let explicitMode: string | undefined;

  for (let arg of process.argv.slice(2)) {
    if (arg === 'roundtrip-wasm') return arg;
    if (!arg.startsWith('--') && !arg.endsWith('.ts')) explicitMode = arg;
  }

  if (explicitMode !== undefined) return explicitMode;
  return 'roundtrip-wasm';
}

function getArtifactsDir() {
  for (let arg of process.argv.slice(2)) {
    if (arg.startsWith('--artifacts-dir=')) {
      return path.resolve(arg.slice('--artifacts-dir='.length));
    }
  }
  return path.resolve('tests/test-artifacts/program-single-chunk-proof-serde');
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

function printUsageAndExit(mode: string): never {
  throw new Error(
    `Unknown mode "${mode}". Use one of:\n` +
      `  ./run src/examples/zkprogram/program-single-chunk-proof-serde.ts roundtrip-wasm\n` +
      `Optional:\n` +
      `  --artifacts-dir=/absolute/or/relative/path`
  );
}
