import { Field, Provable, xor, Experimental } from 'o1js';

let cs = Provable.constraintSystem(() => {
  let res = xor(
    Provable.witness(Field, () => Field(5215)),
    Provable.witness(Field, () => Field(7812)),
    4
  );
  Provable.log(res);
});
console.log(cs);

const XOR = Experimental.ZkProgram({
  methods: {
    baseCase: {
      privateInputs: [],
      method: () => {
        let a = Provable.witness(Field, () => Field(5));
        let b = Provable.witness(Field, () => Field(2));
        let actual = xor(a, b, 4);
        let expected = Field(7);
        actual.assertEquals(expected);
      },
    },
  },
});

console.log('compiling..');

console.time('compile');
await XOR.compile();
console.timeEnd('compile');

console.log('proving..');

console.time('prove');
let proof = await XOR.baseCase();
console.timeEnd('prove');

if (!(await XOR.verify(proof))) throw Error('Invalid proof');
else console.log('proof valid');
