import { Field, Provable, Experimental } from 'o1js';

function testRot(
  word: Field,
  bits: number,
  mode: 'left' | 'right',
  result: Field
) {
  Provable.runAndCheck(() => {
    let w = Provable.witness(Field, () => word);
    let r = Provable.witness(Field, () => result);
    let output = w.rot(bits, mode);
    Provable.asProver(() => {
      Provable.log(`rot(${word}, ${bits}, ${mode}) = ${output}`);
    });
    output.assertEquals(r, `rot(${word}, ${bits}, ${mode})`);
  });
}

console.log('Running positive tests...');
testRot(Field('0'), 0, 'left', Field('0'));
testRot(Field('0'), 32, 'right', Field('0'));
testRot(Field('1'), 1, 'left', Field('2'));
testRot(Field('1'), 63, 'left', Field('9223372036854775808'));
testRot(Field('256'), 4, 'right', Field('16'));
testRot(Field('1234567890'), 32, 'right', Field('5302428712241725440'));
testRot(Field('2651214356120862720'), 32, 'right', Field('617283945'));
testRot(Field('1153202983878524928'), 32, 'right', Field('268500993'));
testRot(
  Field('6510615555426900570'),
  4,
  'right',
  Field('11936128518282651045')
);
testRot(
  Field('6510615555426900570'),
  4,
  'right',
  Field('11936128518282651045')
);
console.log('🎉 Passed positive tests');

let cs = Provable.constraintSystem(() => {
  let res1 = Provable.witness(Field, () => Field(12).rot(2, 'left'));
  let res2 = Provable.witness(Field, () => Field(12).rot(2, 'right'));

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
