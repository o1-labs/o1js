import { Field, PublicKey, ZkProgram } from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-with-aux-output',
  methods: {
    baseCase: {
      auxiliaryOutput: Field,
      privateInputs: [],
      async method() {
        return {
          auxiliaryOutput: Field(1),
        };
      },
    },
  },
});

await MyProgram.compile();

let result = await MyProgram.baseCase();
