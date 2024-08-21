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
  name: 'example-with-aux-output',
  publicOutput: Field,
  auxiliaryOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return {
          publicOutput: Field(1),
          aux: Field(1),
        };
      },
    },
  },
});
// type sanity checks
MyProgram.publicInputType satisfies Provable<Empty>;
MyProgram.publicOutputType satisfies typeof Field;
MyProgram.auxiliaryOutputType satisfies typeof Field;

let proof = await MyProgram.baseCase();
