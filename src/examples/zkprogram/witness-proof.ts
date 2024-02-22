import {
  SelfProof,
  Field,
  ZkProgram,
  verify,
  isReady,
  Proof,
  JsonProof,
  Provable,
  Empty,
} from 'o1js';

await isReady;

let MyProgram = ZkProgram({
  name: 'example-with-output',
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [],
      method() {
        return Field(0);
      },
    },
  },
});

class ProgramProof extends ZkProgram.Proof(MyProgram) {}

await MyProgram.compile();

let proof = await MyProgram.baseCase();

let MyProgram2 = ZkProgram({
  name: 'example-with-output2',

  methods: {
    baseCase: {
      privateInputs: [],
      method() {
        let p = Provable.witness(ProgramProof.provable, () => {
          proof.publicOutput = Field(5);

          return proof;
        });
        p.verify();
        // should say 0 and fail verification
        Provable.log(proof.publicOutput);
      },
    },
  },
});

await MyProgram2.compile();
await MyProgram2.baseCase();
