import { Cache, Field, Poseidon, Provable, ZkProgram } from 'o1js';

let MyProgram = ZkProgram({
  name: 'bench-regression-medium',
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

console.time('compile (no cache)');
await MyProgram.compile({
  cache: Cache.None,
  forceRecompile: true,
});
console.timeEnd('compile (no cache)');
console.log((await MyProgram.analyzeMethods()).baseCase.rows);
console.time('proving');
await MyProgram.baseCase();
console.timeEnd('proving');
