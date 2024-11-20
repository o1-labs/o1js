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

let NonPureInputProgram = ZkProgram({
  name: 'example-with-non-pure-input',
  publicInput: MyStruct,

  methods: {
    baseCase: {
      privateInputs: [],
      async method(input) {},
    },
  },
});
console.log('compiling NonPureIOprogram...');
await NonPureIOprogram.compile();
console.log('compile done');
let input = new MyStruct({ label: 'input', value: Field(5) });
let proof;
({ proof } = await NonPureIOprogram.baseCase(input));
let isProof1Valid = await NonPureIOprogram.verify(proof);
assert(isProof1Valid, 'proof not valid!');
assert(proof.publicOutput.label === 'in-circuit');
console.log('i/o proof', proof);

console.log('compiling NonPureOutputProgram...');
await NonPureOutputProgram.compile();
console.log('compile done');

({ proof } = await NonPureOutputProgram.baseCase());
let isProof2Valid = await NonPureOutputProgram.verify(proof);
assert(isProof2Valid, 'proof not valid!');
assert(proof.publicOutput.label === 'output');
console.log('output proof', proof);

console.log('compiling NonPureInputProgram...');
await NonPureInputProgram.compile();
console.log('compile done');

({ proof } = await NonPureInputProgram.baseCase(input));
let isProof3Valid = await NonPureInputProgram.verify(proof);
assert(isProof3Valid, 'proof not valid!');
assert(proof.publicInput.label === 'input');
console.log('input proof', proof);
