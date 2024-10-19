import { Field, Provable, Struct, ZkProgram, assert } from 'o1js';

class MyStruct extends Struct({
  label: String,
  value: Field,
}) {}

let MyProgram = ZkProgram({
  name: 'example-with-non-pure-inputs',
  publicInput: MyStruct,

  methods: {
    baseCase: {
      privateInputs: [],
      async method(input: MyStruct) {},
    },
  },
});

console.log('compiling MyProgram...');
await MyProgram.compile();
console.log('compile done');
