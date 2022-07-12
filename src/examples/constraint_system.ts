import { Field, Circuit, Poseidon } from 'snarkyjs';

let hash = Poseidon.hash([Field.one, Field.minusOne]);

let { rows, digest } = Circuit.constraintSystem(() => {
  let x = Circuit.witness(Field, () => Field.one);
  let y = Circuit.witness(Field, () => Field.minusOne);
  x.add(y).assertEquals(Field.zero);
  let z = Poseidon.hash([x, y]);
  z.assertEquals(hash);
});

console.log({ rows, digest });
