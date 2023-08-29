import { Field, Poseidon, Provable } from 'o1js';

let hash = Poseidon.hash([Field(1), Field(-1)]);

let { rows, digest, gates, publicInputSize } = Provable.constraintSystem(() => {
  let x = Provable.witness(Field, () => Field(1));
  let y = Provable.witness(Field, () => Field(-1));
  x.add(y).assertEquals(Field(0));
  let z = Poseidon.hash([x, y]);
  z.assertEquals(hash);
});

console.log(JSON.stringify(gates));
console.log({ rows, digest, publicInputSize });
