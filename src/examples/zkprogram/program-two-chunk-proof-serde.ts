import fs from 'node:fs/promises';
import path from 'node:path';
import type { JsonProof } from 'o1js';
import { Cache, Field, Provable, setBackend, ZkProgram } from 'o1js';
import { initializeBindings, Pickles } from '../../bindings.js';
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

  await initializeBindings();

  let proofJson = proof.toJSON();
  let maxProofsVerified = proofJson.maxProofsVerified;
  let proofTuple: [0 | 1 | 2, unknown] = [maxProofsVerified, proof.proof];
  let proofBase64 = Pickles.proofToBase64(proofTuple);

  if (proofJson.proof !== proofBase64) {
    throw new Error('Proof.toJSON() did not use proofToBase64');
  }

  let decoded = Pickles.proofOfBase64(proofBase64, maxProofsVerified);
  let roundtripBase64 = Pickles.proofToBase64(decoded);

  if (roundtripBase64 !== proofBase64) {
    throw new Error('proofToBase64/proofOfBase64 roundtrip changed proof bytes');
  }

  let roundtripProof = await MyProgram.Proof.fromJSON({
    ...proofJson,
    proof: roundtripBase64,
  });

  perf.start('verify serde roundtrip', 'baseCase');
  let isValid = await MyProgram.verify(roundtripProof);
  perf.end();

  if (!isValid) {
    throw new Error('two-chunk proofToBase64/proofOfBase64 roundtrip failed');
  }

  await persistArtifacts(proofJson, cs.baseCase.rows);

  console.log('Succeeded to roundtrip two-chunk proof JSON with proofToBase64/proofOfBase64');
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
