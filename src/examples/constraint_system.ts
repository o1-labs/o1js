import { isReady, Field, Circuit, Poseidon } from 'snarkyjs';

await isReady;
let hash = Poseidon.hash([Field(1), Field(-1)]);

let { rows, digest, gates, publicInputSize } = Circuit.constraintSystem(() => {
  let x = Circuit.witness(Field, () => Field(1));
  let y = Circuit.witness(Field, () => Field(-1));
  x.add(y).assertEquals(Field(0));
  let z = Poseidon.hash([x, y]);
  z.assertEquals(hash);
});

console.log(JSON.stringify(gates));
console.log({ rows, digest, publicInputSize });
