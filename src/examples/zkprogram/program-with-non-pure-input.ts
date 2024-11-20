import { Field, Provable, Struct, ZkProgram, assert } from 'o1js';

class MyStruct extends Struct({
  label: String,
  value: Field,
}) {}

let NonPureIOprogram = ZkProgram({
  name: 'example-with-non-pure-io',
  publicInput: MyStruct,
  publicOutput: MyStruct,

  methods: {
    baseCase: {
      privateInputs: [],
      async method(input: MyStruct) {
        //update input in circuit
        input.label = 'in-circuit';
        return {
          publicOutput: input,
        };
      },
    },
  },
});

let NonPureOutputProgram = ZkProgram({
  name: 'example-with-non-pure-output',
  publicOutput: MyStruct,

  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return {
          publicOutput: new MyStruct({ label: 'output', value: Field(5) }),
        };
      },
    },
  },
});

console.log('compiling NonPureIOprogram...');
await NonPureIOprogram.compile();
console.log('compile done');
let input = new MyStruct({ label: 'input', value: Field(5) });

let result1 = await NonPureIOprogram.baseCase(input);
let isProof1Valid = await NonPureIOprogram.verify(result1.proof);
assert(isProof1Valid, 'proof not valid!');
assert(result1.proof.publicOutput.label === 'in-circuit');
console.log('proof IO', result1.proof);

console.log('compiling NonPureOutputProgram...');
await NonPureOutputProgram.compile();
console.log('compile done');

let result2 = await NonPureOutputProgram.baseCase();
let isProof2Valid = await NonPureOutputProgram.verify(result2.proof);
assert(isProof2Valid, 'proof not valid!');
assert(result2.proof.publicOutput.label === 'output');
console.log('proof O', result2.proof);
