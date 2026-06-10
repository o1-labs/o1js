import fs from 'node:fs/promises';
import path from 'node:path';
import type { JsonProof, VerificationKey } from 'o1js';
import { Cache, Field, Gadgets, ZkProgram, setBackend } from 'o1js';
import { Pickles, initializeBindings } from '../../bindings.js';
import { Performance } from '../../lib/testing/perf-regression.js';

const mode = getMode();
const artifactsDir = getArtifactsDir();
const cacheDir = path.join(artifactsDir, 'cache');
const proofPath = path.join(artifactsDir, 'chunked-proof.json');
const verificationKeyPath = path.join(artifactsDir, 'verification-key.json');
const metadataPath = path.join(artifactsDir, 'metadata.json');

switch (mode) {
  case 'prove-native':
    await proveWithNative();
    break;
  case 'verify-native':
    await verifyWithBackend('native');
    break;
  case 'verify-wasm':
    await verifyWithBackend('wasm');
    break;
  default:
    printUsageAndExit(mode);
}

function createChunkingProgram() {
  return ZkProgram({
    numChunks: 2,
    overrideWrapDomain: 1,
    name: 'example-cross-chunking',
    publicOutput: Field,

    methods: {
      baseCase: {
        privateInputs: [Field],
        async method(input: Field) {
          for (let i = 0; i < 1 << 16; i++) {
            Gadgets.rangeCheck64(Field(input).add(Field(i)));
          }
          // The above generates 2^16+2^15 rows which needs to be split into 2 chunks.
          return {
            publicOutput: Field(0),
          };
        },
      },
    },
  });
}

async function proveWithNative() {
  // The backend is process-global, so proving and wasm verification must happen in separate runs.
  setBackend('native');

  let MyProgram = createChunkingProgram();
  let cs = await MyProgram.analyzeMethods();
  let perf = Performance.create(MyProgram.name, cs);
  let cache = Cache.FileSystem(cacheDir, true);

  console.log('MyProgram baseCase method rows:', cs.baseCase.rows);
  console.log(`Using cache directory ${cacheDir}`);

  perf.start('compile');
  let { verificationKey } = await MyProgram.compile({ cache });
  perf.end();

  perf.start('prove', 'baseCase');
  let { proof } = await MyProgram.baseCase(Field(0));
  perf.end();

  perf.start('verify', 'baseCase');
  let freshProofIsValid = await MyProgram.verify(proof);
  perf.end();

  let proofJson = await proofToChunkedJson(proof);
  let roundtripProof = await MyProgram.Proof.fromJSON(proofJson);
  let roundtripProofIsValid = await MyProgram.verify(roundtripProof);

  await persistArtifacts(proofJson, verificationKey, cs.baseCase.rows);

  console.log('Succeeded to generate chunked proof with native prover');
  console.log(`Fresh proof verifies in-process? ${freshProofIsValid}`);
  console.log(`JSON-roundtripped proof verifies in-process? ${roundtripProofIsValid}`);
  console.log(`Saved proof to ${proofPath}`);
  console.log(`Saved verification key to ${verificationKeyPath}`);
  console.log(`Saved metadata to ${metadataPath}`);
  console.log('');
  console.log(
    'Native verify control: ./run src/examples/zkprogram/program-chunking-cross-backend.ts verify-native'
  );
  console.log('Next run: ./run src/examples/zkprogram/program-chunking-cross-backend.ts verify-wasm');
}

async function verifyWithBackend(backend: 'native' | 'wasm') {
  setBackend(backend);

  let MyProgram = createChunkingProgram();
  let cache = Cache.FileSystem(cacheDir, true);
  let perf = Performance.create('example-cross-chunking');
  let { proof, verificationKey, metadata } = await loadArtifacts();

  if (metadata?.rows !== undefined) {
    console.log('Loaded proof metadata rows:', metadata.rows);
  }
  console.log(`Using cache directory ${cacheDir}`);

  perf.start('compile');
  let { verificationKey: compiledVerificationKey } = await MyProgram.compile({ cache });
  perf.end();

  let proofInstance = await MyProgram.Proof.fromJSON(proof);
  let matchesSavedVerificationKey =
    compiledVerificationKey.data === verificationKey.data &&
    compiledVerificationKey.hash.toString() === verificationKey.hash.toString();

  console.log(
    `Compiled verification key matches saved verification key? ${matchesSavedVerificationKey}`
  );

  perf.start('verify', 'baseCase');
  let isValid = await MyProgram.verify(proofInstance);
  perf.end();

  console.log(`Succeeded to verify chunked proof with ${backend} verifier`);
  console.log('isValid?', isValid);
  if (!isValid) throw new Error('proof verification failed!');
}

async function proofToChunkedJson(proof: {
  toJSON(): JsonProof;
  maxProofsVerified: 0 | 1 | 2;
  proof: Pickles.Proof;
}) {
  await initializeBindings();
  let proofJson = proof.toJSON();
  return {
    ...proofJson,
    proof: Pickles.proofToBase64Chunked([proof.maxProofsVerified, proof.proof]),
  };
}

async function persistArtifacts(proof: JsonProof, verificationKey: VerificationKey, rows: number) {
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.writeFile(proofPath, JSON.stringify(proof, null, 2) + '\n');
  await fs.writeFile(verificationKeyPath, JSON.stringify(verificationKey, null, 2) + '\n');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      {
        mode: 'prove-native',
        rows,
        generatedAt: new Date().toISOString(),
        cacheDir,
        proofPath,
        verificationKeyPath,
      },
      null,
      2
    ) + '\n'
  );
}

async function loadArtifacts(): Promise<{
  proof: JsonProof;
  verificationKey: VerificationKey;
  metadata: { rows?: number } | null;
}> {
  let [proofJson, verificationKeyJson, metadataJson] = await Promise.all([
    fs.readFile(proofPath, 'utf8'),
    fs.readFile(verificationKeyPath, 'utf8'),
    fs.readFile(metadataPath, 'utf8').catch(() => null),
  ]);

  return {
    proof: JSON.parse(proofJson) as JsonProof,
    verificationKey: JSON.parse(verificationKeyJson) as VerificationKey,
    metadata: metadataJson === null ? null : (JSON.parse(metadataJson) as { rows?: number }),
  };
}

function getMode() {
  let explicitMode: string | undefined;

  for (let arg of process.argv.slice(2)) {
    if (arg === 'prove-native' || arg === 'verify-native' || arg === 'verify-wasm') {
      return arg;
    }
    if (!arg.startsWith('--') && !arg.endsWith('.ts')) explicitMode = arg;
  }

  if (explicitMode !== undefined) return explicitMode;
  return 'prove-native';
}

function getArtifactsDir() {
  for (let arg of process.argv.slice(2)) {
    if (arg.startsWith('--artifacts-dir=')) {
      return path.resolve(arg.slice('--artifacts-dir='.length));
    }
  }
  return path.resolve('tests/test-artifacts/program-chunking-cross-backend');
}

function printUsageAndExit(mode: string): never {
  throw new Error(
    `Unknown mode "${mode}". Use one of:\n` +
    `  ./run src/examples/zkprogram/program-chunking-cross-backend.ts prove-native\n` +
    `  ./run src/examples/zkprogram/program-chunking-cross-backend.ts verify-native\n` +
    `  ./run src/examples/zkprogram/program-chunking-cross-backend.ts verify-wasm\n` +
    `Optional:\n` +
    `  --artifacts-dir=/absolute/or/relative/path`
  );
}
