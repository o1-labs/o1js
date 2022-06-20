import { SelfProof, Field, Program } from 'snarkyjs';

let MyProgram = Program({
  publicInput: Field,

  methods: {
    baseCase: {
      privateInput: [],

      method(publicInput: Field) {
        publicInput.assertEquals(Field.zero);
      },
    },

    inductiveCase: {
      privateInput: [SelfProof],

      method(publicInput: Field, earlierProof: SelfProof<Field>) {
        earlierProof.verify();
        earlierProof.publicInput.add(1).assertEquals(publicInput);
      },
    },
  },
});

console.log('compiling MyProgram...');
await MyProgram.compile();

console.log('proving base case...');
let proof = await MyProgram.baseCase(Field.zero);

console.log('proving step 1...');
proof = await MyProgram.inductiveCase(Field.one, proof);

console.log('proving step 2...');
proof = await MyProgram.inductiveCase(Field(2), proof);

console.log('ok?', proof.publicInput.toString() === '2');
