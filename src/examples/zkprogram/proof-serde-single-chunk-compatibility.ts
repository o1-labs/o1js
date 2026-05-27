import { Cache, Field, Gadgets, setBackend, ZkProgram } from 'o1js';
import { initializeBindings, Pickles } from '../../bindings.js';
import { Performance } from '../../lib/testing/perf-regression.js';

setBackend('wasm');

let SingleChunkProgram = ZkProgram({
  name: 'proof-serde-single-chunk-compatibility',
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

const cs = await SingleChunkProgram.analyzeMethods();
const perf = Performance.create(SingleChunkProgram.name, cs);

console.log('SingleChunkProgram baseCase method rows:', cs.baseCase.rows);

perf.start('compile');
await SingleChunkProgram.compile({ cache: Cache.None });
perf.end();

perf.start('prove', 'baseCase');
let { proof } = await SingleChunkProgram.baseCase(Field(0));
perf.end();

let proofJson = proof.toJSON();
await initializeBindings();

let legacyDecoded = Pickles.proofOfBase64(proofJson.proof, proofJson.maxProofsVerified);
let chunkedDecoded = Pickles.proofOfBase64Chunked(proofJson.proof, proofJson.maxProofsVerified);

let legacyRoundtrip = Pickles.proofToBase64(legacyDecoded);
let chunkedRoundtrip = Pickles.proofToBase64(chunkedDecoded);

if (legacyRoundtrip !== chunkedRoundtrip) {
  throw new Error(
    'proofOfBase64Chunked decoded a single-chunk proof differently than proofOfBase64'
  );
}

if (proofJson.proof !== legacyRoundtrip) {
  throw new Error(
    'Single-chunk proofToBase64Chunked output differs from the default proofToBase64 representation'
  );
}

console.log('proofOfBase64Chunked matches proofOfBase64 for a single-chunk proof');
