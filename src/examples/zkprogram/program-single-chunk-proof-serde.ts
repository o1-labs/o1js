/**
 * Mesa proof JSON serde compatibility check.
 *
 * During Mesa, the normal Pickles proof serde is only compatible with
 * single-chunk proofs. Chunked proofs must use the chunk-aware Pickles helpers
 * so their full public input evaluations are serialized.
 *
 * This test captures the expected temporary behavior until the next hard fork
 * fixes the normal proof serde path to serialize chunked proofs as well:
 * - one-chunk proof JSON roundtrips and verifies normally;
 * - two-chunk proof JSON fails with standard Pickles base64 serde;
 * - the same two-chunk proof roundtrips and verifies through the chunk-aware
 *   to/from_base64_chunked helpers.
 */
import type { JsonProof } from 'o1js';
import { Cache, Field, Gadgets, Provable, setBackend, ZkProgram } from 'o1js';
import { initializeBindings, Pickles } from '../../bindings.js';
import { Gates, KimchiGateType } from '../../lib/provable/gates.js';
import { Performance } from '../../lib/testing/perf-regression.js';

type ChunkCount = 1 | 2;

const TWO_CHUNK_MULS = 1 << 17;
const chunks: ChunkCount = process.argv.includes('--chunks=2') ? 2 : 1;

setBackend('native');
await runProofSerdeCheck(chunks);

function createProofSerdeProgram(chunks: ChunkCount) {
  return ZkProgram({
    ...(chunks === 2 ? { numChunks: 2, overrideWrapDomain: 1 as const } : {}),
    name: `example-${chunks}-chunk-proof-serde`,
    publicOutput: Field,

    methods: {
      baseCase: {
        privateInputs: [Field],
        async method(input: Field) {
          if (chunks === 1) {
            for (let i = 0; i < 1 << 10; i++) {
              Gadgets.rangeCheck64(Field(input).add(Field(i)));
            }
          } else {
            for (let i = 0; i < TWO_CHUNK_MULS; i++) {
              freshZero().mul(freshZero());
            }
            let zero = freshZero();
            Gates.raw(KimchiGateType.Generic, [zero, zero, zero, zero, zero, zero, zero], []);
          }

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

async function runProofSerdeCheck(chunks: ChunkCount) {
  let MyProgram = createProofSerdeProgram(chunks);
  let cs = await MyProgram.analyzeMethods();
  let perf = Performance.create(MyProgram.name, cs);

  console.log(`Checking ${chunks}-chunk proof serde with native backend`);
  console.log('MyProgram baseCase method rows:', cs.baseCase.rows);

  perf.start('compile');
  await MyProgram.compile({ cache: Cache.None });
  perf.end();

  perf.start('prove', 'baseCase');
  let { proof } = await MyProgram.baseCase(Field(0));
  perf.end();

  let proofJson = jsonRoundtrip(proof.toJSON());

  if (chunks === 1) {
    let roundtripProof = await MyProgram.Proof.fromJSON(proofJson);
    await assertVerifies(MyProgram, roundtripProof, perf, 'single-chunk JSON roundtrip');
    console.log('Single-chunk JSON serde roundtrip verifies');
    return;
  }

  await initializeBindings();

  let maxProofsVerified = proofJson.maxProofsVerified;
  let proofTuple = [maxProofsVerified, proof.proof] as const;
  let chunkedProofBase64 = Pickles.proofToBase64Chunked(proofTuple);

  if (proofJson.proof !== chunkedProofBase64) {
    throw new Error('Proof.toJSON() did not use proofToBase64Chunked');
  }

  expectFailure({
    action: () => Pickles.proofOfBase64(chunkedProofBase64, maxProofsVerified),
    expectedFailureMessage: 'proofOfBase64 rejected the two-chunk JSON payload as expected',
    unexpectedSuccessMessage:
      'proofOfBase64 unexpectedly decoded a two-chunk proofToBase64Chunked payload',
  });

  let chunkedRoundtripProof = await MyProgram.Proof.fromJSON(jsonRoundtrip(proofJson));
  await assertVerifies(MyProgram, chunkedRoundtripProof, perf, 'two-chunk chunked JSON roundtrip');

  let legacyJson: JsonProof = {
    ...proofJson,
    proof: Pickles.proofToBase64(proofTuple),
  };
  let legacyFailed = await proofJsonRoundtripFails(MyProgram, jsonRoundtrip(legacyJson));

  if (!legacyFailed) {
    throw new Error('proofToBase64/proofOfBase64 unexpectedly preserved a two-chunk proof');
  }

  console.log('Two-chunk JSON serde fails with standard base64 and verifies with chunked serde');
}

async function assertVerifies(
  MyProgram: ReturnType<typeof createProofSerdeProgram>,
  proof: Awaited<ReturnType<ReturnType<typeof createProofSerdeProgram>['Proof']['fromJSON']>>,
  perf: ReturnType<typeof Performance.create>,
  label: string
) {
  perf.start(`verify ${label}`, 'baseCase');
  let isValid = await MyProgram.verify(proof);
  perf.end();

  if (!isValid) {
    throw new Error(`${label} did not verify`);
  }
}

async function proofJsonRoundtripFails(
  MyProgram: ReturnType<typeof createProofSerdeProgram>,
  proofJson: JsonProof
) {
  try {
    let roundtripProof = await MyProgram.Proof.fromJSON(proofJson);
    let isValid = await MyProgram.verify(roundtripProof);
    return !isValid;
  } catch (error) {
    console.log(`Standard proof JSON serde failed as expected: ${formatError(error)}`);
    return true;
  }
}

function jsonRoundtrip(proofJson: JsonProof) {
  return JSON.parse(JSON.stringify(proofJson)) as JsonProof;
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
