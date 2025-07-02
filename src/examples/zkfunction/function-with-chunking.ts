import { Field, Cache, Gadgets, ZkFunction } from 'o1js';
import { UInt64, UInt32, Provable, Undefined, assert } from 'o1js';


/*
let MyProgram = ZkFunction({
  chunks: 1,
  overrideWrapDomain: 0,
  name: 'example-with-chunking',
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [Field],
      async method(input: Field) {
        for (let i = 0; i < 1 << 16; i++) {
          Gadgets.rangeCheck64(Field(input).add(Field(i)));
        }
        // The above generates 2^16+2^15 rows which needs to be split into 2 chunks
        return {
          publicOutput: Field(0),
        };
      },
    },
  },
});

console.log(await MyProgram.analyzeMethods());

console.log('compiling MyProgram...');
await MyProgram.compile({ cache: Cache.None });

console.log('proving base case...');
let { proof } = await MyProgram.baseCase(Field(0));

console.log('verify...');
let ok = await MyProgram.verify(proof);
console.log('ok?', ok);
*/


const Chunking = ZkFunction({
  name: 'function-with-chunking',
  publicInputType: Undefined,
  privateInputTypes: [],
  numChunks: 1, 
  main: () => {
    for (let i = 0; i < 30; i++) {
      Gadgets.rangeCheck64(Field(i).add(Field(i)));
    }
      // The above generates 2^16+2^15 rows which needs to be split into 2 chunks
  },
});

console.log('compiling Chunking...');
await Chunking.compile();
console.log('Chunking compiled!');
let proof = await Chunking.prove(Undefined.empty());
let ok = await Chunking.verify(Undefined.empty(), proof);

console.log('Chunking verified:', ok);
