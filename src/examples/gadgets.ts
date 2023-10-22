import { Field, Provable, Experimental, Gadgets } from 'o1js';

let cs = Provable.constraintSystem(() => {
  let f = Provable.witness(Field, () => Field(12));

  let res1 = Gadgets.rot(f, 2, 'left');
  let res2 = Gadgets.rot(f, 2, 'right');

  res1.assertEquals(Field(48));
  res2.assertEquals(Field(3));

  Provable.log(res1);
  Provable.log(res2);
});
console.log('constraint system: ', cs);

const ROT = Experimental.ZkProgram({
  methods: {
    baseCase: {
      privateInputs: [],
      method: () => {
        let a = Provable.witness(Field, () => Field(48));
        let actualLeft = Gadgets.rot(a, 2, 'left');
        let actualRight = Gadgets.rot(a, 2, 'right');

        let expectedLeft = Field(192);
        actualLeft.assertEquals(expectedLeft);

        let expectedRight = 12;
        actualRight.assertEquals(expectedRight);
      },
    },
  },
});

console.log('compiling..');

console.time('compile');
await ROT.compile();
console.timeEnd('compile');

console.log('proving..');

console.time('prove');
let proof = await ROT.baseCase();
console.timeEnd('prove');

if (!(await ROT.verify(proof))) throw Error('Invalid proof');
else console.log('proof valid');
