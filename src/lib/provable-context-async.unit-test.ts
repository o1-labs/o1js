import { Field } from './core.js';
import { Poseidon } from './hash.js';
import { Provable } from './provable.js';

let hash = Poseidon.hash([Field(1), Field(-1)]);

let { rows, digest, publicInputSize, print } = await Provable.constraintSystem(
  async () => {
    console.log('waiting');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log('done waiting');
    let x = Provable.witness(Field, () => Field(1));
    let y = Provable.witness(Field, () => Field(-1));
    x.add(y).assertEquals(Field(0));
    let z = Poseidon.hash([x, y]);
    z.assertEquals(hash);
  }
);

print();
console.log({ rows, digest, publicInputSize });
