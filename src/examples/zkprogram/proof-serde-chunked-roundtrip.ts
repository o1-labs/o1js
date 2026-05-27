import { Cache, Field, Gadgets, setBackend, ZkProgram } from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

setBackend('native');

let ChunkedProgram = ZkProgram({
  numChunks: 2,
  overrideWrapDomain: 1,
  name: 'proof-serde-chunked-roundtrip',
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [Field],
      async method(input: Field) {
        for (let i = 0; i < 1 << 16; i++) {
          Gadgets.rangeCheck64(Field(input).add(Field(i)));
        }
        return {
          publicOutput: Field(0),
        };
      },
    },
  },
});

const cs = await ChunkedProgram.analyzeMethods();
const perf = Performance.create(ChunkedProgram.name, cs);

console.log('ChunkedProgram baseCase method rows:', cs.baseCase.rows);

perf.start('compile');
await ChunkedProgram.compile({ cache: Cache.None });
perf.end();

perf.start('prove', 'baseCase');
let { proof } = await ChunkedProgram.baseCase(Field(0));
perf.end();

let proofJson = JSON.parse(JSON.stringify(proof.toJSON()));
let roundtripProof = await ChunkedProgram.Proof.fromJSON(proofJson);

perf.start('verify', 'baseCase');
let isValid = await ChunkedProgram.verify(roundtripProof);
perf.end();

console.log('Chunked proof JSON roundtrip verifies?', isValid);
if (!isValid) throw new Error('chunked proof JSON roundtrip verification failed!');
