import { Field, Provable, Gadgets, Experimental } from 'o1js';

Provable.runAndCheck(() => {
  let res = Gadgets.xor(
    Field(521515),
    Provable.witness(Field, () => Field(771812)),
    32
  );
  Provable.log(res);
});

let res = Gadgets.xor(Field(2), Field(5), 4);
Provable.log(res);

let cs = Provable.constraintSystem(() => {
  let res = Gadgets.xor(
    Provable.witness(Field, () => Field(5215)),
    Provable.witness(Field, () => Field(7812)),
    2
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
        let actual = Gadgets.xor(a, b, 4);
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
