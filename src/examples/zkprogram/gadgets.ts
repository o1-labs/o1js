import { Field, Provable, Gadgets, ZkProgram } from 'o1js';
import { perfStart, perfEnd } from '../../lib/testing/perf-regression.js';

let cs = await Provable.constraintSystem(() => {
  let f = Provable.witness(Field, () => 12);

  let res1 = Gadgets.rotate64(f, 2, 'left');
  let res2 = Gadgets.rotate64(f, 2, 'right');

  res1.assertEquals(Field(48));
  res2.assertEquals(Field(3));

  Provable.log(res1);
  Provable.log(res2);
});
console.log('constraint system: ', cs);

const BitwiseProver = ZkProgram({
  name: 'bitwise',
  methods: {
    rot: {
      privateInputs: [],
      async method() {
        let a = Provable.witness(Field, () => 48);
        let actualLeft = Gadgets.rotate64(a, 2, 'left');
        let actualRight = Gadgets.rotate64(a, 2, 'right');

        let expectedLeft = Field(192);
        actualLeft.assertEquals(expectedLeft);

        let expectedRight = Field(12);
        actualRight.assertEquals(expectedRight);
      },
    },
    xor: {
      privateInputs: [],
      async method() {
        let a = Provable.witness(Field, () => 5);
        let b = Provable.witness(Field, () => 2);
        let actual = Gadgets.xor(a, b, 4);
        let expected = Field(7);
        actual.assertEquals(expected);
      },
    },
    and: {
      privateInputs: [],
      async method() {
        let a = Provable.witness(Field, () => 3);
        let b = Provable.witness(Field, () => 5);
        let actual = Gadgets.and(a, b, 4);
        let expected = Field(1);
        actual.assertEquals(expected);
      },
    },
  },
});

const csBitwise = await BitwiseProver.analyzeMethods();

console.log('\ncompiling..');

perfStart('compile', BitwiseProver.name);
await BitwiseProver.compile();
perfEnd();

console.log('\nproving..');

perfStart('prove', BitwiseProver.name, csBitwise, 'rot');
let { proof: rotProof } = await BitwiseProver.rot();
perfEnd();
if (!(await BitwiseProver.verify(rotProof))) throw Error('rot: Invalid proof');

perfStart('prove', BitwiseProver.name, csBitwise, 'xor');
let { proof: xorProof } = await BitwiseProver.xor();
perfEnd();
if (!(await BitwiseProver.verify(xorProof))) throw Error('xor: Invalid proof');

perfStart('prove', BitwiseProver.name, csBitwise, 'and');
let { proof: andProof } = await BitwiseProver.and();
perfEnd();
if (!(await BitwiseProver.verify(andProof))) throw Error('and: Invalid proof');
