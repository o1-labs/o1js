import { Proof, UInt32, Bool, Program } from 'snarkyjs';

class MyProof extends Proof<UInt32> {
  static publicInputType = UInt32;
  static tag: () => { name: string } = () => MyProgram;
}

let MyProgram = Program({
  publicInput: UInt32,

  methods: {
    otherMethod: {
      privateInput: [],

      method(publicInput: UInt32) {},
    },

    someMethod: {
      privateInput: [Bool, MyProof],

      method(publicInput: UInt32, b: Bool, x: MyProof) {
        x.publicInput;
        publicInput.add(9).equals(UInt32.from(10)).and(b).assertTrue();
      },
    },
  },
});

console.log('compiling MyProgram...');
await MyProgram.compile();

await MyProgram.otherMethod(UInt32.one);
