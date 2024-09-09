import { Field, Provable, PublicKey, ZkProgram } from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-with-aux-output',
  methods: {
    baseCase: {
      auxiliaryOutput: Field,
      privateInputs: [Field],
      async method(a: Field) {
        return {
          auxiliaryOutput: a.add(32),
        };
      },
    },
  },
});

await MyProgram.compile();
console.log('compile done');
let result = await MyProgram.baseCase(Field(21));
Provable.log('final result', result.auxiliaryOutput);
