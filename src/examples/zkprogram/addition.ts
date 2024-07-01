import { Field, ZkProgram, SelfProof } from 'o1js';

export const Addition = ZkProgram({
  name: 'addition',
  publicOutput: Field,
  methods: {
    baseCase: {
      privateInputs: [],
      async method() {
        return new Field(0);
      },
    },
    step: {
      privateInputs: [SelfProof],
      async method(earlierProof: SelfProof<void, Field>) {
        earlierProof.verify();
        return earlierProof.publicOutput.add(1);
      },
    },
  },
});

await Addition.compile();

console.log('count 1: ', Addition.getCallsCount()); // 1
const base = await Addition.baseCase();
console.log('count 2: ', Addition.getCallsCount()); // 1 (because no self proof)
const proof1 = await Addition.step(base);
console.log('count 3: ', Addition.getCallsCount()); // 2
const proof2 = await Addition.step(proof1);
console.log('count 4: ', Addition.getCallsCount()); // 3
const proof3 = await Addition.step(proof2);
console.log('count 5: ', Addition.getCallsCount()); // 4
const proof4 = await Addition.step(proof3);
console.log('count 6: ', Addition.getCallsCount()); // 5
