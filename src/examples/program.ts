import {
  SelfProof,
  Field,
  Experimental,
  verify,
  isReady,
  Undefined,
  Void,
  Proof,
} from 'snarkyjs';

await isReady;

let MyProgram0 = Experimental.ZkProgram({
  publicInput: Field,
  publicOutput: Void,

  methods: {
    baseCase: {
      privateInputs: [],
      method(input: Field) {
        input.assertEquals(Field(0));
      },
    },

    inductiveCase: {
      privateInputs: [SelfProof],
      method(input: Field, earlierProof: SelfProof<Field, Void>) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(input);
      },
    },
  },
});

let MyProgram = Experimental.ZkProgram({
  publicInput: Undefined,
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [],
      method() {
        return Field(0);
      },
    },

    inductiveCase: {
      privateInputs: [SelfProof],
      method(_, earlierProof: SelfProof<Undefined, Field>) {
        earlierProof.verify();
        return earlierProof.publicOutput.add(1);
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
let { proof } = await MyProgram.baseCase(undefined);
proof = testJsonRoundtrip(proof);

console.log('verify...');
let ok = await verify(proof.toJSON(), verificationKey);
console.log('ok?', ok);

console.log('verify alternative...');
ok = await MyProgram.verify(proof);
console.log('ok (alternative)?', ok);

console.log('proving step 1...');
({ proof } = await MyProgram.inductiveCase(undefined, proof));
proof = testJsonRoundtrip(proof);

console.log('verify...');
ok = await verify(proof, verificationKey);
console.log('ok?', ok);

console.log('verify alternative...');
ok = await MyProgram.verify(proof);
console.log('ok (alternative)?', ok);

console.log('proving step 2...');
({ proof } = await MyProgram.inductiveCase(undefined, proof));
proof = testJsonRoundtrip(proof);

console.log('verify...');
ok = await verify(proof.toJSON(), verificationKey);

console.log('ok?', ok && proof.publicOutput.toString() === '2');

function testJsonRoundtrip(proof: Proof<any, any>) {
  let jsonProof = proof.toJSON();
  console.log(
    'json proof',
    JSON.stringify({ ...jsonProof, proof: jsonProof.proof.slice(0, 10) + '..' })
  );
  return MyProof.fromJSON(jsonProof);
}
