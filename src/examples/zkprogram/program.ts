import { Cache, Field, Provable, ZkProgram, setBackend, verify } from 'o1js';
setBackend('wasm');
let MyProgram = ZkProgram({
  name: 'example-with-output',
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        let a = Provable.witness(Field, () => Field(42));
        for (let index = 0; index < 2 ** 16; index++) {
          a = a.mul(a);
        }
        return {
          publicOutput: Field(1),
        };
      },
    },
  },
});

console.time('compile (without cache)');
let { verificationKey } = await MyProgram.compile({ cache: Cache.None, forceRecompile: true });
console.timeEnd('compile (without cache)');
console.log('constraints', (await MyProgram.analyzeMethods()).baseCase.rows);
console.time('proving');
let result = await MyProgram.baseCase();
console.timeEnd('proving');

console.log('verifying');
let ok = await verify(result.proof, verificationKey);
console.log('ok', ok);
if (!ok) throw new Error('proof verification failed!');
