import {
  SelfProof,
  Field,
  ZkProgram,
  verify,
  Proof,
  JsonProof,
  Provable,
} from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-with-input',
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],
      async method(input: Field) {
        input.assertEquals(Field(0));
      },
    },

    inductiveCase: {
      privateInputs: [SelfProof],
      async method(input: Field, earlierProof: SelfProof<Field, void>) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(input);
      },
    },
  },
});
// type sanity checks
MyProgram.publicInputType satisfies typeof Field;
MyProgram.publicOutputType satisfies Provable<void>;

let MyProof = ZkProgram.Proof(MyProgram);

console.log('program digest', MyProgram.digest());

console.log('compiling MyProgram...');
let { verificationKey } = await MyProgram.compile();
console.log('verification key', verificationKey.data.slice(0, 10) + '..');

console.log('proving base case...');
let proof = await MyProgram.baseCase(Field(0));
proof = await testJsonRoundtrip(MyProof, proof);

// type sanity check
proof satisfies Proof<Field, void>;

console.log('verify...');
let ok = await verify(proof.toJSON(), verificationKey);
console.log('ok?', ok);

console.log('verify alternative...');
ok = await MyProgram.verify(proof);
console.log('ok (alternative)?', ok);

console.log('proving step 1...');
proof = await MyProgram.inductiveCase(Field(1), proof);
proof = await testJsonRoundtrip(MyProof, proof);

console.log('verify...');
ok = await verify(proof, verificationKey);
console.log('ok?', ok);

console.log('verify alternative...');
ok = await MyProgram.verify(proof);
console.log('ok (alternative)?', ok);

console.log('proving step 2...');
proof = await MyProgram.inductiveCase(Field(2), proof);
proof = await testJsonRoundtrip(MyProof, proof);

console.log('verify...');
ok = await verify(proof.toJSON(), verificationKey);

console.log('ok?', ok && proof.publicInput.toString() === '2');

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
