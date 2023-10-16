import { Field, Provable, Experimental } from 'o1js';

Provable.runAndCheck(() => {
  let f = Field(12);
  let res = f.rot(2, 'left');
  Provable.log(res);
  res.assertEquals(Field(48));
});

let cs = Provable.constraintSystem(() => {
  let res1 = Provable.witness(Field, () => Field(12).rot(2, 'left'));
  let res2 = Provable.witness(Field, () => Field(12).rot(2, 'right'));

  res1.assertEquals(Field(48));
  res2.assertEquals(Field(3));

  Provable.log(res1);
  Provable.log(res2);
});
console.log(cs);

const ROT = Experimental.ZkProgram({
  methods: {
    baseCase: {
      privateInputs: [],
      method: () => {
        let a = Provable.witness(Field, () => Field(48));
        let actualLeft = a.rot(2, 'left');
        let actualRight = a.rot(2, 'right');

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
