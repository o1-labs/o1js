import { Field, Provable, ZkProgram, verify } from 'o1js';

// Number of field multiplications in the circuit.
// Each mul creates ~2 rows. Adjust to test memory limits.
// 2^16 = 65536 rows → fits in 1 chunk (small, ~1 GiB)
// 2^17 = 131072 rows → needs 2+ chunks (~2 GiB)
// 2^18 = 262144 rows → needs 4+ chunks (~4 GiB, hits wasm32 limit)
// 2^19 = 524288 rows → needs 8+ chunks (~8 GiB, requires memory64)
const NUM_ITERATIONS = 2 ** 16;
const NUM_CHUNKS = 2;

console.log(`Circuit: ${NUM_ITERATIONS} iterations, ${NUM_CHUNKS} chunks`);

let MyProgram = ZkProgram({
  name: 'example-with-output',
  numChunks: NUM_CHUNKS,
  overrideWrapDomain: 1,
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        let a = Provable.witness(Field, () => Field(42));
        for (let index = 0; index < NUM_ITERATIONS; index++) {
          a = a.mul(a).add(Field(1));
        }
        return {
          publicOutput: Field(1),
        };
      },
    },
  },
});
let cs = await MyProgram.analyzeMethods();
console.log('rows:', cs.baseCase.rows);
console.time('compile');
let { verificationKey } = await MyProgram.compile();
console.timeEnd('compile');

console.time('proving');
let result = await MyProgram.baseCase();
console.timeEnd('proving');

console.time('verifying');
let ok = await verify(result.proof, verificationKey);
console.timeEnd('verifying');
console.log('ok', ok);
if (!ok) throw new Error('proof verification failed!');
