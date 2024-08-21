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
        //return Field(9);
        return {
          publicOutput: Field(8),
          aux: Field(9),
        };
      },
    },
  },
});
// type sanity checks
MyProgram.publicInputType satisfies Provable<Empty>;
//MyProgram.publicOutputType satisfies typeof Field;
//MyProgram.auxiliaryOutputType satisfies typeof Field;

await MyProgram.compile();

let proof = await MyProgram.baseCase();
Provable.log(proof.auxiliaryOutput);
