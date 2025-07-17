import { Cache, Field, Poseidon, Provable, ZkProgram, verify } from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-with-output',
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        let a = Provable.witness(Field, () => 1);
        let b = Provable.witness(Field, () => 1);
        for (let index = 0; index < 1 << 10; index++) {
          b = Poseidon.hash([b, a]);
        }
        return {
          publicOutput: b,
        };
      },
    },
  },
});

console.time('compile (with cache)');
let { verificationKey } = await MyProgram.compile({
  cache: Cache.None,
  forceRecompile: true,
});
console.timeEnd('compile (with cache)');
console.log((await MyProgram.analyzeMethods()).baseCase.rows);
console.time('proving');
let result = await MyProgram.baseCase(); 
console.timeEnd('proving');
