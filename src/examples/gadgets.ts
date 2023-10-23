import { Field, Provable, Gadgets, Experimental } from 'o1js';

const XOR = Experimental.ZkProgram({
  methods: {
    baseCase: {
      privateInputs: [],
      method: () => {
        let a = Provable.witness(Field, () => Field(5));
        let b = Provable.witness(Field, () => Field(2));
        let actual = Gadgets.xor(a, b, 4);
        let expected = Field(7);
        actual.assertEquals(expected);
      },
    },
  },
});

console.log('XOR:');

console.log('compiling..');

console.time('compile');
await XOR.compile();
console.timeEnd('compile');

console.log('proving..');

console.time('prove');
let XORproof = await XOR.baseCase();
console.timeEnd('prove');

if (!(await XOR.verify(XORproof))) throw Error('Invalid proof');
else console.log('proof valid');

const AND = Experimental.ZkProgram({
  methods: {
    baseCase: {
      privateInputs: [],
      method: () => {
        let a = Provable.witness(Field, () => Field(3));
        let b = Provable.witness(Field, () => Field(5));
        let actual = Gadgets.and(a, b, 4);
        let expected = Field(1);
        actual.assertEquals(expected);
      },
    },
  },
});

console.log('AND:');

console.log('compiling..');

console.time('compile');
await AND.compile();
console.timeEnd('compile');

console.log('proving..');

console.time('prove');
let ANDproof = await AND.baseCase();
console.timeEnd('prove');

if (!(await AND.verify(ANDproof))) throw Error('Invalid proof');
else console.log('proof valid');
