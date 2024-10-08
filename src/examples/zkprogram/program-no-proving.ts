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
} from 'o1js';

let MyProgram = ZkProgram({
  name: 'example-without-proving',
  publicOutput: Field,
  publicInput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method(publicInput: Field) {
        return { publicOutput: publicInput.add(4) };
      },
    },
  },
});

console.log('program digest', await MyProgram.digest());

// enable proofs to compile the program
const proofsEnabled = true;

await MyProgram.compile({
  proofsEnabled,
});

console.log('proofs enabled?', MyProgram.proofsEnabled);

console.log('proving base case... (proofs enabled)');
console.time('proving');
let { proof } = await MyProgram.baseCase(Field(2));
console.timeEnd('proving');
proof.publicOutput.assertEquals(Field(2).add(4));

console.log('disable proofs, generate dummy proof');
MyProgram.setProofsEnabled(false);
console.log('proofs enabled?', MyProgram.proofsEnabled);
console.time('noProving');
({ proof } = await MyProgram.baseCase(Field(2)));
console.timeEnd('noProving');
proof.publicOutput.assertEquals(Field(2).add(4));
