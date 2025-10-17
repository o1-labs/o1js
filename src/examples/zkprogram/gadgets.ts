import { Field, Gadgets, Provable, ZkProgram } from 'o1js';
import { Performance } from '../../lib/testing/perf-regression.js';

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
const perfBitwise = Performance.create(BitwiseProver.name, csBitwise);

console.log('\ncompiling..');

perfBitwise.start('compile');
await BitwiseProver.compile();
perfBitwise.end();

console.log('\nproving..');

perfBitwise.start('prove', 'rot');
let { proof: rotProof } = await BitwiseProver.rot();
perfBitwise.end();

perfBitwise.start('verify', 'rot');
const isValidRot = await BitwiseProver.verify(rotProof);
perfBitwise.end();
if (!isValidRot) throw Error('rot: Invalid proof');

perfBitwise.start('prove', 'xor');
let { proof: xorProof } = await BitwiseProver.xor();
perfBitwise.end();

perfBitwise.start('verify', 'xor');
const isValidXor = await BitwiseProver.verify(xorProof);
perfBitwise.end();
if (!isValidXor) throw Error('xor: Invalid proof');

perfBitwise.start('prove', 'and');
let { proof: andProof } = await BitwiseProver.and();
perfBitwise.end();

perfBitwise.start('verify', 'and');
const isValidAnd = await BitwiseProver.verify(andProof);
perfBitwise.end();
if (!isValidAnd) throw Error('and: Invalid proof');
