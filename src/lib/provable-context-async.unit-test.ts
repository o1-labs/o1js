import { Field } from './core.js';
import { Poseidon } from './hash.js';
import { generateWitness } from './provable-context.js';
import { Provable } from './provable.js';

async function main() {
  console.log('waiting');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log('done waiting');
  let x = Provable.witness(Field, () => Field(1));
  let y = Provable.witness(Field, () => Field(-1));
  x.add(y).assertEquals(0);
  let z = Poseidon.hash([x, y]);
  z.assertEquals(0); // unsatisfiable constraint
}

let { rows, digest, publicInputSize, print } = await Provable.constraintSystem(
  main
);

print();
console.log({ rows, digest, publicInputSize });

let [, , [, ...witness]] = await generateWitness(main, {
  checkConstraints: false,
});
console.log('first 5 witnesses', witness.map((x) => x[1]).slice(0, 5));
