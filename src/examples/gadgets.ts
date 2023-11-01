import { timeEnd } from 'node:console';
import { basename } from 'node:path';
import { Field, Provable, Gadgets, ZkProgram } from 'o1js';

let cs = Provable.constraintSystem(() => {
  let f = Provable.witness(Field, () => Field(12));

  let res1 = Gadgets.rotate(f, 2, 'left');
  let res2 = Gadgets.rotate(f, 2, 'right');

  res1.assertEquals(Field(48));
  res2.assertEquals(Field(3));

  Provable.log(res1);
  Provable.log(res2);
});
console.log('constraint system: ', cs);

const ROT = ZkProgram({
  name: 'rot-example',
  methods: {
    baseCase: {
      privateInputs: [],
      method: () => {
        let a = Provable.witness(Field, () => Field(48));
        let actualLeft = Gadgets.rotate(a, 2, 'left');
        let actualRight = Gadgets.rotate(a, 2, 'right');

        let expectedLeft = Field(192);
        actualLeft.assertEquals(expectedLeft);

        let expectedRight = Field(12);
        actualRight.assertEquals(expectedRight);
      },
    },
  },
});

const XOR = ZkProgram({
  name: 'xor-example',
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

const AND = ZkProgram({
  name: 'and-example',
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

console.log('compiling..');

console.time('compile');
await ROT.compile();
await XOR.compile();
await AND.compile();
console.timeEnd('compile');

console.log('proving..');

console.time('rotation prove');
let rotProof = await ROT.baseCase();
console.timeEnd('rotation prove');
if (!(await ROT.verify(rotProof))) throw Error('rotate: Invalid proof');

console.time('xor prove');
let xorProof = await XOR.baseCase();
console.timeEnd('xor prove');
if (!(await XOR.verify(xorProof))) throw Error('xor: Invalid proof');

console.time('and prove');
let andProof = await AND.baseCase();
console.timeEnd('and prove');
if (!(await AND.verify(andProof))) throw Error('and: Invalid proof');
