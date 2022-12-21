import { SelfProof, Field, Experimental, verify, isReady } from 'snarkyjs';

await isReady;

let MyProgram = Experimental.ZkProgram({
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: Field) {
        publicInput.assertEquals(Field(0));
      },
    },

    inductiveCase: {
      privateInputs: [SelfProof],

      method(publicInput: Field, earlierProof: SelfProof<Field>) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(publicInput);
      },
    },
  },
});

let MyProof = Experimental.ZkProgram.Proof(MyProgram);

console.log('program digest', MyProgram.digest());

console.log('compiling MyProgram...');
let { verificationKey } = await MyProgram.compile();
console.log('verification key', verificationKey.slice(0, 10) + '..');

console.log('proving base case...');
let proof = await MyProgram.baseCase(Field(0));
proof = testJsonRoundtrip(proof);

console.log('verify...');
let ok = await verify(proof.toJSON(), verificationKey);
console.log('ok?', ok);

console.log('proving step 1...');
proof = await MyProgram.inductiveCase(Field(1), proof);
proof = testJsonRoundtrip(proof);

console.log('verify alternative...');
ok = await MyProgram.verify(proof);
console.log('ok (alternative)?', ok);

console.log('verify...');
ok = await verify(proof, verificationKey);
console.log('ok?', ok);

console.log('proving step 2...');
proof = await MyProgram.inductiveCase(Field(2), proof);
proof = testJsonRoundtrip(proof);

console.log('verify...');
ok = await verify(proof.toJSON(), verificationKey);

console.log('ok?', ok && proof.publicInput.toString() === '2');

function testJsonRoundtrip(proof: any): any {
  let jsonProof = proof.toJSON();
  console.log(
    'json proof',
    JSON.stringify({ ...jsonProof, proof: jsonProof.proof.slice(0, 10) + '..' })
  );
  return MyProof.fromJSON(jsonProof);
}
