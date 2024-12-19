import { SelfProof, Field, ZkProgram, Proof, JsonProof } from 'o1js';
import { tic, toc } from '../examples/utils/tic-toc.js';

let MaxProofsVerifiedZero = ZkProgram({
  name: 'no-recursion',
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      async method(publicInput: Field) {
        publicInput.assertEquals(Field(0));
      },
    },
  },
});

let MaxProofsVerifiedOne = ZkProgram({
  name: 'recursive-1',
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      async method(publicInput: Field) {
        publicInput.assertEquals(Field(0));
      },
    },

    mergeOne: {
      privateInputs: [SelfProof],

      async method(
        publicInput: Field,
        earlierProof: SelfProof<Field, undefined>
      ) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(publicInput);
      },
    },
  },
});

let MaxProofsVerifiedTwo = ZkProgram({
  name: 'recursive-2',
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      async method(publicInput: Field) {
        publicInput.assertEquals(Field(0));
      },
    },

    mergeOne: {
      privateInputs: [SelfProof],

      async method(
        publicInput: Field,
        earlierProof: SelfProof<Field, undefined>
      ) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(publicInput);
      },
    },

    mergeTwo: {
      privateInputs: [SelfProof, SelfProof],

      async method(
        publicInput: Field,
        p1: SelfProof<Field, undefined>,
        p2: SelfProof<Field, undefined>
      ) {
        p1.verify();
        p1.publicInput.add(1).assertEquals(p2.publicInput);
        p2.verify();
        p2.publicInput.add(1).assertEquals(publicInput);
      },
    },
  },
});
tic('compiling three programs');
await MaxProofsVerifiedZero.compile();
await MaxProofsVerifiedOne.compile();
await MaxProofsVerifiedTwo.compile();
toc();

await testRecursion(MaxProofsVerifiedZero as any, 0);
await testRecursion(MaxProofsVerifiedOne as any, 1);
await testRecursion(MaxProofsVerifiedTwo, 2);

async function testRecursion(
  Program: typeof MaxProofsVerifiedTwo,
  maxProofsVerified: number
) {
  console.log(`testing maxProofsVerified = ${maxProofsVerified}`);

  class ProofClass extends Program.Proof {}

  tic('executing base case');
  let { proof: initialProof } = await Program.baseCase(Field(0));
  toc();
  initialProof = await testJsonRoundtrip(ProofClass, initialProof);
  initialProof.verify();
  initialProof.publicInput.assertEquals(Field(0));

  if (initialProof.maxProofsVerified != maxProofsVerified) {
    throw Error(
      `Expected initialProof to have maxProofsVerified = ${maxProofsVerified} but has ${initialProof.maxProofsVerified}`
    );
  }

  let p1: Proof<any, any>, p2: Proof<any, any>;
  if (initialProof.maxProofsVerified === 0) return;

  tic('executing mergeOne');
  p1 = (await Program.mergeOne(Field(1), initialProof)).proof;
  toc();
  p1 = await testJsonRoundtrip(ProofClass, p1);
  p1.verify();
  p1.publicInput.assertEquals(Field(1));
  if (p1.maxProofsVerified != maxProofsVerified) {
    throw Error(
      `Expected p1 to have maxProofsVerified = ${maxProofsVerified} but has ${p1.maxProofsVerified}`
    );
  }

  if (initialProof.maxProofsVerified === 1) return;
  tic('executing mergeTwo');
  p2 = (await Program.mergeTwo(Field(2), initialProof, p1)).proof;
  toc();
  p2 = await testJsonRoundtrip(ProofClass, p2);
  p2.verify();
  p2.publicInput.assertEquals(Field(2));
  if (p2.maxProofsVerified != maxProofsVerified) {
    throw Error(
      `Expected p2 to have maxProofsVerified = ${maxProofsVerified} but has ${p2.maxProofsVerified}`
    );
  }
}

function testJsonRoundtrip(
  ProofClass: { fromJSON: (p: JsonProof) => Promise<Proof<any, any>> },
  proof: Proof<Field, void>
) {
  let jsonProof = proof.toJSON();
  console.log(
    'json roundtrip',
    JSON.stringify({ ...jsonProof, proof: jsonProof.proof.slice(0, 10) + '..' })
  );
  return ProofClass.fromJSON(jsonProof);
}
