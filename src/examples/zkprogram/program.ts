import {
  SelfProof,
  Field,
  ZkProgram,
  verify,
  Proof,
  JsonProof,
  Provable,
  Empty,
} from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-with-output',
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return Field(1);
      },
    },
  },
});

await MyProgram.compile();

await MyProgram.baseCase(); // empty types
MyProgram.rawMethods; // empty types
