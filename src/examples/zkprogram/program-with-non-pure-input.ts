import { Field, Provable, Struct, ZkProgram, assert } from 'o1js';

class MyStruct extends Struct({
  label: String,
  value: Field,
}) {}

let MyProgram = ZkProgram({
  name: 'example-with-non-pure-inputs',
  publicInput: MyStruct,
  publicOutput: MyStruct,

  methods: {
    baseCase: {
      privateInputs: [],
      async method(input: MyStruct) {
        return {
          publicOutput: input,
        };
      },
    },
  },
});

console.log('compiling MyProgram...');
await MyProgram.compile();
console.log('compile done');

let input = new MyStruct({ label: 'input', value: Field(5) });
let result = await MyProgram.baseCase(input);
