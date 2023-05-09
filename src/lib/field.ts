import {
  bigIntToBytes,
  bytesToBigInt,
} from '../bindings/crypto/bigint-helpers.js';
import { Field as SnarkyField } from '../snarky.js';
import { Field as BigintField } from '../provable/field-bigint.js';

const Field = toFunctionConstructor(
  class Field {
    value: [0, Uint8Array] | [1, number] | [2 | 3, any];

    constructor(x: Field | bigint) {
      if (x instanceof Field) {
        return Object.assign(Object.create(Field.prototype), x);
      }
      let field = BigintField.fromBigint(x);
      let bytes = bigIntToBytes(field, 32);
      this.value = [0, Uint8Array.from(bytes)];
    }

    toBigInt() {
      let [flag, value] = this.value;
      if (flag !== 0) {
        throw Error(
          `Can't evaluate prover code outside an as_prover block 🧌🧌🧌`
        );
      }
      return BigintField.fromBytes(value);
    }
    toString() {
      return this.toBigInt().toString();
    }

    add(y: Field | bigint) {
      return new Field(this.toBigInt() + new Field(y).toBigInt());
    }
  }
);
type Field = InferReturn<typeof Field>;

let x: Field = Field(200n);
let z: Field = x.add(20n);

console.dir(z, { depth: Infinity });

console.log(`z = ${z}`);

z = Field(z);

console.dir(z, { depth: Infinity });

console.log(`z = ${z}`);

function toFunctionConstructor<Class extends new (...args: any) => any>(
  Class: Class
): Class & ((...args: InferArgs<Class>) => InferReturn<Class>) {
  function Constructor(...args: any) {
    return new Class(...args);
  }
  Object.assign(Constructor, Class);
  Object.assign(Constructor.prototype, Class.prototype);
  return Constructor as any;
}

type InferArgs<T> = T extends new (...args: infer Args) => any ? Args : never;
type InferReturn<T> = T extends new (...args: any) => infer Return
  ? Return
  : never;
