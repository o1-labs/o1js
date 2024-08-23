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
  name: 'example-with-aux-output',
  publicInput: Field,
  publicOutput: Field,
  auxiliaryOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method(publicInput: Field) {
        return {
          publicOutput: Provable.witness(Field, () => Field(9)),
          aux: Provable.witness(Field, () => Field(5)),
        };
      },
    },
  },
});
// type sanity checks
MyProgram.publicInputType satisfies typeof Field;
MyProgram.publicOutputType satisfies typeof Field;
MyProgram.auxiliaryOutputType satisfies typeof Field;

await MyProgram.compile({ cache: Cache.None, forceRecompile: true });

let { proof, auxiliaryOutput } = await MyProgram.baseCase(Field(1));
Provable.log(auxiliaryOutput);
Provable.log(proof.publicInput);
Provable.log(proof.publicOutput);

let result = await MyProgram.verify(proof);
assert(result, 'cannot verify proof');
