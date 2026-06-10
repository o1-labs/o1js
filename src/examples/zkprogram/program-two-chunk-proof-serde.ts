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
const legacyProofPath = path.join(artifactsDir, 'legacy-two-chunk-proof.json');
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
  let proofTuple = [maxProofsVerified, proof.proof] as const;
  let chunkedProofBase64 = Pickles.proofToBase64Chunked(proofTuple);

  if (proofJson.proof !== chunkedProofBase64) {
    throw new Error('Proof.toJSON() did not use proofToBase64Chunked');
  }

  expectFailure({
    action: () => Pickles.proofOfBase64(chunkedProofBase64, maxProofsVerified),
    expectedFailureMessage: 'proofOfBase64 rejected the chunked payload as expected',
    unexpectedSuccessMessage:
      'proofOfBase64 unexpectedly decoded a two-chunk proofToBase64Chunked payload',
  });

  let chunkedDecoded = Pickles.proofOfBase64Chunked(chunkedProofBase64, maxProofsVerified);
  let chunkedRoundtripBase64 = Pickles.proofToBase64Chunked(chunkedDecoded);

  if (chunkedRoundtripBase64 !== chunkedProofBase64) {
    throw new Error('proofToBase64Chunked/proofOfBase64Chunked roundtrip changed proof bytes');
  }

  let chunkedRoundtripProof = await MyProgram.Proof.fromJSON({
    ...proofJson,
    proof: chunkedRoundtripBase64,
  });

  perf.start('verify chunked serde roundtrip', 'baseCase');
  let chunkedIsValid = await MyProgram.verify(chunkedRoundtripProof);
  perf.end();

  if (!chunkedIsValid) {
    throw new Error('two-chunk proofToBase64Chunked/proofOfBase64Chunked roundtrip failed');
  }

  let legacyProofBase64 = Pickles.proofToBase64(proofTuple);
  let legacyJson: JsonProof = {
    ...proofJson,
    proof: legacyProofBase64,
  };

  let legacyFailed = await standardSerdeRoundtripFails(MyProgram, legacyJson);
  if (!legacyFailed) {
    throw new Error('proofToBase64/proofOfBase64 unexpectedly preserved a two-chunk proof');
  }

  await persistArtifacts(proofJson, legacyJson, cs.baseCase.rows);

  console.log('Succeeded to roundtrip two-chunk proof JSON with chunked serde');
  console.log('Standard proofToBase64/proofOfBase64 failed for the two-chunk proof as expected');
  console.log(`Saved chunked proof to ${proofPath}`);
  console.log(`Saved legacy proof to ${legacyProofPath}`);
  console.log(`Saved metadata to ${metadataPath}`);
}

async function standardSerdeRoundtripFails(
  MyProgram: ReturnType<typeof createTwoChunkProgram>,
  legacyJson: JsonProof
) {
  try {
    let legacyDecoded = Pickles.proofOfBase64(legacyJson.proof, legacyJson.maxProofsVerified);
    let legacyRoundtripBase64 = Pickles.proofToBase64(legacyDecoded);
    let legacyRoundtripProof = await MyProgram.Proof.fromJSON({
      ...legacyJson,
      proof: legacyRoundtripBase64,
    });

    let legacyIsValid = await MyProgram.verify(legacyRoundtripProof);

    return !legacyIsValid;
  } catch (error) {
    console.log(`Standard proof serde failed as expected: ${formatError(error)}`);
    return true;
  }
}

async function persistArtifacts(proof: JsonProof, legacyProof: JsonProof, rows: number) {
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.writeFile(proofPath, JSON.stringify(proof, null, 2) + '\n');
  await fs.writeFile(legacyProofPath, JSON.stringify(legacyProof, null, 2) + '\n');
  await fs.writeFile(
    metadataPath,
    JSON.stringify(
      {
        mode: 'roundtrip-native',
        rows,
        generatedAt: new Date().toISOString(),
        cacheDir,
        proofPath,
        legacyProofPath,
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

function expectFailure({
  action,
  expectedFailureMessage,
  unexpectedSuccessMessage,
}: {
  action: () => unknown;
  expectedFailureMessage: string;
  unexpectedSuccessMessage: string;
}) {
  try {
    action();
  } catch (error) {
    console.log(`${expectedFailureMessage}: ${formatError(error)}`);
    return;
  }
  throw new Error(unexpectedSuccessMessage);
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function printUsageAndExit(mode: string): never {
  throw new Error(
    `Unknown mode "${mode}". Use one of:\n` +
      `  ./run src/examples/zkprogram/program-two-chunk-proof-serde.ts roundtrip-native\n` +
      `Optional:\n` +
      `  --artifacts-dir=/absolute/or/relative/path`
  );
}
