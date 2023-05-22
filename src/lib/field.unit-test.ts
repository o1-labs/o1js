import { ProvablePure } from '../snarky.js';
import { SmartContract, method } from './zkapp.js';
import { Field } from './core.js';

Field satisfies ProvablePure<Field>;

let x: Field = Field(200n);

console.log(x instanceof Field);

let y: Field = new Field(-1);
let z: Field = x.add(y).add(20);

console.log(Field.toFields(z));
console.log(z instanceof Field);

console.log(`z = ${z}`);

z = Field(z);

console.log(z instanceof Field);

console.dir(z, { depth: Infinity });

console.log(`z = ${z}`);

// z.assertEquals(0n, 'z must be 0');

class MyContract extends SmartContract {
  @method myMethod(x: Field) {
    console.log('inside method:', x);
  }
}
MyContract.analyzeMethods();
