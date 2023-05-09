import {
  bigIntToBytes,
  bytesToBigInt,
} from '../bindings/crypto/bigint-helpers.js';
import { Field as SnarkyField } from '../snarky.js';
import { Field as BigintField } from '../provable/field-bigint.js';
import { SmartContract, method } from './zkapp.js';
import { Provable } from './provable.js';

enum FieldType {
  Constant,
  Var,
  Add,
  Scale,
}
type FieldVar =
  | [FieldType.Constant, Uint8Array]
  | [FieldType.Var, number]
  | [FieldType.Add, FieldVar, FieldVar]
  | [FieldType.Scale, Uint8Array, FieldVar];

const Field = toFunctionConstructor(
  class Field {
    value: FieldVar;

    constructor(x: Field | bigint) {
      if (x instanceof Field) {
        this.value = x.value;
        return;
      }
      let field = BigintField.fromBigint(x);
      let bytes = BigintField.toBytes(field);
      this.value = [0, Uint8Array.from(bytes)];
    }

    toBigInt() {
      if (this.value[0] !== FieldType.Constant) {
        throw Error(
          `Can't evaluate prover code outside an as_prover block 🧌🧌🧌`
        );
      }
      return BigintField.fromBytes([...this.value[1]]);
    }
    toString() {
      return this.toBigInt().toString();
    }

    add(y: Field | bigint) {
      return new Field(this.toBigInt() + toBigint(y));
    }

    // Provable<Field>
    static toFields(x: Field) {
      return [x];
    }
    static toAuxiliary(): [] {
      return [];
    }
    static sizeInFields() {
      return 1;
    }
    static fromFields([x]: Field[]) {
      return x;
    }
    static check() {}
  }
);

type Field = InferReturn<typeof Field>;

type ProvablePure<T> = {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => [];
  fromFields: (x: Field[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
};

Field satisfies ProvablePure<Field>;

let x: Field = Field(200n);

console.log(x instanceof Field);

let y: Field = new Field(-1n);
let z: Field = x.add(y).add(20n);

console.log(Field.toFields(z));
console.log(z instanceof Field);

console.log(`z = ${z}`);

z = Field(z);

console.log(z instanceof Field);

console.dir(z, { depth: Infinity });

console.log(`z = ${z}`);

class MyContract extends SmartContract {
  @method myMethod(x: Field) {
    console.log('inside method:', x);
  }
}
MyContract.analyzeMethods();

function toFunctionConstructor<Class extends new (...args: any) => any>(
  Class: Class
): Class & ((...args: InferArgs<Class>) => InferReturn<Class>) {
  function Constructor(...args: any) {
    return new Class(...args);
  }
  Object.defineProperties(Constructor, Object.getOwnPropertyDescriptors(Class));
  return Constructor as any;
}

function toBigint(x: Field | bigint) {
  if (typeof x === 'bigint') return x;
  return x.toBigInt();
}

type InferArgs<T> = T extends new (...args: infer Args) => any ? Args : never;
type InferReturn<T> = T extends new (...args: any) => infer Return
  ? Return
  : never;
