import {
  SelfProof,
  Field,
  ZkProgram,
  verify,
  Proof,
  JsonProof,
  Provable,
  Empty,
  Cache,
  assert,
} from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-with-auxiliary-output',
  publicOutput: Field,
  auxiliaryOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return {
          publicOutput: Field(9),
          auxiliaryOutput: Field(5),
        };
      },
    },
  },
});
// type sanity checks
MyProgram.publicOutputType satisfies typeof Field;
MyProgram.auxiliaryOutputType satisfies typeof Field;

await MyProgram.compile({ cache: Cache.None, forceRecompile: true });

let { proof, auxiliaryOutput } = await MyProgram.baseCase();
assert(auxiliaryOutput.equals(5).toBoolean());
assert(proof.publicOutput.equals(9).toBoolean());

let result = await MyProgram.verify(proof);
assert(result, 'cannot verify proof');
