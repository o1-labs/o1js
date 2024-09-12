import { Field, ZkProgram, verify } from 'o1js';

let MyProgram = ZkProgram({
  chunks: 1,
  overrideWrapDomain: 0,
  name: 'example-with-chunking',
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return Field(0);
      },
    },
  },
});

console.log('compiling MyProgram...');
let { verificationKey } = await MyProgram.compile();

console.log('proving base case...');
let proof = await MyProgram.baseCase();

console.log('verify...');
let ok = await verify(proof.toJSON(), verificationKey);
console.log('ok?', ok);
