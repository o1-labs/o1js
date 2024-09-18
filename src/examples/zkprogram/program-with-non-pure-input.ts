import { Field, Provable, Struct, ZkProgram, assert } from 'o1js';

class MyStruct extends Struct({
  label: String,
  value: Field,
}) {}

let MyProgram = ZkProgram({
  name: 'example-with-non-pure-inputs',
  publicOutput: Field,
  publicInput: [MyStruct],
  methods: {},
});
