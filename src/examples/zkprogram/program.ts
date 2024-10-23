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
        return {
          publicOutput: Field(0),
        };
      },
    },

    inductiveCase: {
      privateInputs: [SelfProof],
      async method(earlierProof: SelfProof<Empty, Field>) {
        earlierProof.verify();
        return {
          publicOutput: earlierProof.publicOutput.add(1),
        };
      },
    },
  },
});
// type sanity checks
MyProgram.publicInputType satisfies Provable<Empty>;
MyProgram.publicOutputType satisfies typeof Field;

let MyProof = ZkProgram.Proof(MyProgram);

console.log('program digest', await MyProgram.digest());

console.log('compiling MyProgram...');
let { verificationKey } = await MyProgram.compile();
console.log('verification key', verificationKey.data.slice(0, 10) + '..');

console.log('proving base case...');
let { proof } = await MyProgram.baseCase();
proof = await testJsonRoundtrip(MyProof, proof);

// type sanity check
proof satisfies Proof<undefined, Field>;

console.log('verify...');
let ok = await verify(proof.toJSON(), verificationKey);
console.log('ok?', ok);

console.log('verify alternative...');
ok = await MyProgram.verify(proof);
console.log('ok (alternative)?', ok);

console.log('proving step 1...');
let { proof: proof2 } = await MyProgram.inductiveCase(proof);
proof2 = await testJsonRoundtrip(MyProof, proof2);

console.log('verify...');
ok = await verify(proof2, verificationKey);
console.log('ok?', ok);

console.log('verify alternative...');
ok = await MyProgram.verify(proof2);
console.log('ok (alternative)?', ok);

console.log('proving step 2...');
let { proof: proof3 } = await MyProgram.inductiveCase(proof2);
proof3 = await testJsonRoundtrip(MyProof, proof3);

console.log('verify...');
ok = await verify(proof3.toJSON(), verificationKey);

console.log('ok?', ok && proof3.publicOutput.toString() === '2');

function testJsonRoundtrip<
  P extends Proof<any, any>,
  MyProof extends { fromJSON(jsonProof: JsonProof): Promise<P> }
>(MyProof: MyProof, proof: P) {
  let jsonProof = proof.toJSON();
  console.log(
    'json proof',
    JSON.stringify({
      ...jsonProof,
      proof: jsonProof.proof.slice(0, 10) + '..',
    })
  );
  return MyProof.fromJSON(jsonProof);
}
