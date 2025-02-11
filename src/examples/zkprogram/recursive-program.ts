import { SelfProof, Field, ZkProgram } from 'o1js';

export const RecursiveProgram = ZkProgram({
  name: 'recursive-program',
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
