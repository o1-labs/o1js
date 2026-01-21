import { Field, ZkProgram, Cache, verify } from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-with-output',
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return {
          publicOutput: Field(1),
        };
      },
    },
  },
});

/*
console.time('compile (with cache)');
let { verificationKey } = await MyProgram.compile();
console.timeEnd('compile (with cache)');
*/

console.time('compile (without cache)');
let { verificationKey } = await MyProgram.compile({ cache: Cache.None });
console.timeEnd('compile (without cache)');

console.time('proving');
let result = await MyProgram.baseCase();
console.timeEnd('proving');

console.log('verifying');
let ok = await verify(result.proof, verificationKey);
console.log('ok', ok);
