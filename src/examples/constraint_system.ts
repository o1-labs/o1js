import { Field, Circuit, Poseidon } from 'snarkyjs';

let hash = Poseidon.hash([Field(1), Field(-1)]);

let { rows, digest } = Circuit.constraintSystem(() => {
  let x = Circuit.witness(Field, () => Field(1));
  let y = Circuit.witness(Field, () => Field(-1));
  x.add(y).assertEquals(Field(0));
  let z = Poseidon.hash([x, y]);
  z.assertEquals(hash);
});

console.log({ rows, digest });
