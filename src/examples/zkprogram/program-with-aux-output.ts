import { Field, Provable, Struct, ZkProgram, assert } from 'o1js';

class MyStruct extends Struct({
  label: String,
  value: Field,
}) {}

let MyProgram = ZkProgram({
  name: 'example-with-aux-output',
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [MyStruct],
      auxiliaryOutput: MyStruct,
      async method(input: MyStruct) {
        return {
          publicOutput: input.value,
          auxiliaryOutput: new MyStruct({
            label: input.label,
            value: Field(1).add(input.value),
          }),
        };
      },
    },
  },
});

await MyProgram.compile();
console.log('compile done');
let result = await MyProgram.baseCase(new MyStruct({ label: 'input-struct', value: Field(2) }));

Provable.log('auxiliary result', result.auxiliaryOutput);

let ok = await MyProgram.verify(result.proof);
assert(ok, 'proof not valid!');
