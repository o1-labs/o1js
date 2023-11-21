import { SelfProof, Field, ZkProgram, Proof } from 'o1js';
import { tic, toc } from '../examples/utils/tic-toc.node.js';

let MaxProofsVerifiedOne = ZkProgram({
  name: 'recursive-1',
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: Field) {
        publicInput.assertEquals(Field(0));
      },
    },

    mergeOne: {
      privateInputs: [SelfProof],

      method(publicInput: Field, earlierProof: SelfProof<Field, undefined>) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(publicInput);
      },
    },
  },
});

tic('compiling program');
await MaxProofsVerifiedOne.compile();
toc();

await testRecursion(MaxProofsVerifiedOne, 1);

async function testRecursion(
  Program: typeof MaxProofsVerifiedOne,
  maxProofsVerified: number
) {
  console.log(`testing maxProofsVerified = ${maxProofsVerified}`);

  let ProofClass = ZkProgram.Proof(Program);

  tic('executing base case');
  let initialProof = await Program.baseCase(Field(0));
  toc();
  initialProof = testJsonRoundtrip(ProofClass, initialProof);
  initialProof.verify();
  initialProof.publicInput.assertEquals(Field(0));

  if (initialProof.maxProofsVerified != maxProofsVerified) {
    throw Error(
      `Expected initialProof to have maxProofsVerified = ${maxProofsVerified} but has ${initialProof.maxProofsVerified}`
    );
  }

  let p1;
  if (initialProof.maxProofsVerified === 0) return;

  tic('executing mergeOne');
  p1 = await Program.mergeOne(Field(1), initialProof);
  toc();
  p1 = testJsonRoundtrip(ProofClass, p1);
  p1.verify();
  p1.publicInput.assertEquals(Field(1));
  if (p1.maxProofsVerified != maxProofsVerified) {
    throw Error(
      `Expected p1 to have maxProofsVerified = ${maxProofsVerified} but has ${p1.maxProofsVerified}`
    );
  }
}

function testJsonRoundtrip(ProofClass: any, proof: Proof<Field, void>) {
  let jsonProof = proof.toJSON();
  console.log(
    'json roundtrip',
    JSON.stringify({ ...jsonProof, proof: jsonProof.proof.slice(0, 10) + '..' })
  );
  return ProofClass.fromJSON(jsonProof);
}
