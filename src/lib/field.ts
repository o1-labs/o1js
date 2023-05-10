import { SnarkyField } from '../snarky.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { Bool } from '../snarky.js';
import { defineBinable } from '../bindings/lib/binable.js';
import type { NonNegativeInteger } from '../bindings/crypto/non-negative.js';

export { Field, ConstantField, FieldType, FieldVar };

function unimplemented() {
  return Error('unimplemented');
}

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

    static ORDER = Fp.modulus;

    constructor(x: bigint | number | string | Field) {
      if (x instanceof Field) {
        this.value = x.value;
        return;
      }
      let bytes = Fp.toBytes(Fp(x));
      this.value = [0, Uint8Array.from(bytes)];
    }

    isConstant(): this is { value: [FieldType.Constant, Uint8Array] } {
      return this.value[0] === FieldType.Constant;
    }
    toConstant(): Field & { value: [FieldType.Constant, Uint8Array] } {
      if (this.isConstant()) return this;
      // TODO: actually, try to read the variable here
      throw Error(`Can't evaluate prover code outside an as_prover block 🧌🧌🧌`);
    }

    toBigInt() {
      let x = this.toConstant();
      return Fp.fromBytes([...x.value[1]]);
    }
    toString() {
      return this.toBigInt().toString();
    }

    assertEquals(y: Field | bigint | number | string, message?: string) {
      try {
        if (this.isConstant()) {
          if (this.toBigInt() !== toFp(y)) {
            throw Error(`Field.assertEquals(): ${this} != ${y}`);
          }
          return;
        }
        throw unimplemented();
      } catch (err) {
        throw withMessage(err, message);
      }
    }

    add(y: Field | bigint | number | string) {
      if (this.isConstant() && isConstant(y)) {
        return new Field(Fp.add(this.toBigInt(), toFp(y)));
      }
      throw unimplemented();
    }
    sub(y: Field | bigint | number | string) {
      if (this.isConstant() && isConstant(y)) {
        return new Field(Fp.sub(this.toBigInt(), toFp(y)));
      }
      throw unimplemented();
    }
    neg() {
      if (this.isConstant()) {
        return new Field(Fp.negate(this.toBigInt()));
      }
      throw unimplemented();
    }

    mul(y: Field | bigint | number | string) {
      if (this.isConstant() && isConstant(y)) {
        return new Field(Fp.mul(this.toBigInt(), toFp(y)));
      }
      throw unimplemented();
    }
    div(y: Field | bigint | number | string) {
      if (this.isConstant() && isConstant(y)) {
        let z = Fp.div(this.toBigInt(), toFp(y));
        if (z === undefined) throw Error('Field.div(): Division by zero');
        return new Field(z);
      }
    }
    inv() {
      if (this.isConstant()) {
        let xInv = Fp.inverse(this.toBigInt());
        if (xInv === undefined) throw Error('Field.inv(): Division by zero');
        return new Field(xInv);
      }
      throw unimplemented();
    }

    square() {
      if (this.isConstant()) {
        return new Field(Fp.square(this.toBigInt()));
      }
      throw unimplemented();
    }
    sqrt() {
      if (this.isConstant()) {
        let q = Fp.sqrt(this.toBigInt());
        if (q === undefined)
          throw Error(
            `Field.sqrt(): input ${this} has no square root in the field.`
          );
        return new Field(q);
      }
      throw unimplemented();
    }

    equals(y: Field | bigint | number | string) {
      if (this.isConstant() && isConstant(y)) {
        return Bool(this.toBigInt() === toFp(y));
      }
      throw unimplemented();
    }

    lessThan(y: Field | bigint | number | string) {
      if (this.isConstant() && isConstant(y)) {
        return Bool(this.toBigInt() < toFp(y));
      }
      throw unimplemented();
    }
    lessThanOrEqual(y: Field | bigint | number | string) {
      if (this.isConstant() && isConstant(y)) {
        return Bool(this.toBigInt() <= toFp(y));
      }
      throw unimplemented();
    }
    greaterThan(y: Field | bigint | number | string) {
      return new Field(y).lessThan(this);
    }
    greaterThanOrEqual(y: Field | bigint | number | string) {
      return new Field(y).lessThanOrEqual(this);
    }

    assertLessThan(y: Field | bigint | number | string, message?: string) {
      try {
        if (this.isConstant() && isConstant(y)) {
          if (!(this.toBigInt() < toFp(y))) {
            throw Error(`Field.assertLessThan(): expected ${this} < ${y}`);
          }
          return;
        }
        throw unimplemented();
      } catch (err) {
        throw withMessage(err, message);
      }
    }
    assertLessThanOrEqual(
      y: Field | bigint | number | string,
      message?: string
    ) {
      try {
        if (this.isConstant() && isConstant(y)) {
          if (!(this.toBigInt() <= toFp(y))) {
            throw Error(`Field.assertLessThan(): expected ${this} <= ${y}`);
          }
          return;
        }
        throw unimplemented();
      } catch (err) {
        throw withMessage(err, message);
      }
    }
    assertGreaterThan(y: Field | bigint | number | string, message?: string) {
      new Field(y).assertLessThan(this, message);
    }
    assertGreaterThanOrEqual(
      y: Field | bigint | number | string,
      message?: string
    ) {
      new Field(y).assertLessThanOrEqual(this, message);
    }

    isZero() {
      if (this.isConstant()) {
        return Bool(this.toBigInt() === 0n);
      }
      throw unimplemented();
    }
    assertBool(message?: string) {
      try {
        if (this.isConstant()) {
          let x = this.toBigInt();
          if (x !== 0n && x !== 1n) {
            throw Error(`Field.assertBool(): expected ${x} to be 0 or 1`);
          }
          return;
        }
        throw unimplemented();
      } catch (err) {
        throw withMessage(err, message);
      }
    }

    static #checkBitLength(name: string, length: number) {
      if (length > Fp.sizeInBits)
        throw Error(
          `${name}: bit length must be ${Fp.sizeInBits} or less, got ${length}`
        );
      if (length <= 0)
        throw Error(`${name}: bit length must be positive, got ${length}`);
    }

    toBits(length?: number) {
      if (length !== undefined) Field.#checkBitLength('Field.toBits()', length);
      if (this.isConstant()) {
        let bits = Fp.toBits(this.toBigInt());
        if (length !== undefined) {
          if (bits.slice(length).some((bit) => bit))
            throw Error(
              `Field.toBits(): ${this} does not fit in ${length} bits`
            );
          return bits.slice(0, length).map(Bool);
        }
        return bits.map(Bool);
      }
      throw unimplemented();
    }

    static fromBits(bits: (Bool | boolean)[]) {
      let length = bits.length;
      Field.#checkBitLength('Field.fromBits()', length);
      if (
        bits.every((b) => typeof b === 'boolean' || b.toField().isConstant())
      ) {
        let bits_ = bits
          .map((b) => (typeof b === 'boolean' ? b : b.toBoolean()))
          .concat(Array(Fp.sizeInBits - length).fill(false));
        return new Field(Fp.fromBits(bits_));
      }
      throw unimplemented();
    }

    // TODO rename
    rangeCheckHelper(numBits: number) {
      Field.#checkBitLength('Field.rangeCheckHelper()', numBits);
      if (this.isConstant()) {
        let bits = Fp.toBits(this.toBigInt())
          .slice(0, numBits)
          .concat(Array(Fp.sizeInBits - length).fill(false));
        return new Field(Fp.fromBits(bits));
      }
      throw unimplemented();
    }
    seal() {
      if (this.isConstant()) return this;
      throw unimplemented();
    }

    static random() {
      return new Field(Fp.random());
    }

    // internal stuff

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

    toFields() {
      return Field.toFields(this);
    }
    toAuxiliary() {
      return Field.toAuxiliary();
    }

    // ProvableExtended<Field>
    toJSON() {
      return this.toString();
    }
    static toJSON(x: Field) {
      return x.toJSON();
    }
    static fromJSON(json: string) {
      return new Field(Fp.fromJSON(json));
    }
    static toInput(x: Field) {
      return { fields: [x] };
    }

    // Binable<Field>
    static toBytes(x: Field) {
      return FieldBinable.toBytes(x);
    }
    static readBytes<N extends number>(
      bytes: number[],
      offset: NonNegativeInteger<N>
    ) {
      return FieldBinable.readBytes(bytes, offset);
    }
    static fromBytes(bytes: number[]) {
      return FieldBinable.fromBytes(bytes);
    }
    static sizeInBytes() {
      return Fp.sizeInBytes();
    }
  }
);

type Field = InferReturn<typeof Field>;
type ConstantField = Field & { value: [FieldType.Constant, Uint8Array] };

type ProvablePure<T> = {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => [];
  fromFields: (x: Field[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
};

const FieldBinable = defineBinable({
  toBytes(t: Field) {
    return [...t.toConstant().value[1]];
  },
  readBytes(bytes, offset) {
    let uint8array = new Uint8Array(32);
    uint8array.set(bytes.slice(offset, offset + 32));
    return [
      Object.assign(Object.create(Field(1).constructor.prototype), {
        value: [0, uint8array],
      }) as Field,
      offset + 32,
    ];
  },
});

function toFunctionConstructor<Class extends new (...args: any) => any>(
  Class: Class
): Class & ((...args: InferArgs<Class>) => InferReturn<Class>) {
  function Constructor(...args: any) {
    return new Class(...args);
  }
  Object.defineProperties(Constructor, Object.getOwnPropertyDescriptors(Class));
  return Constructor as any;
}

function isConstant(x: bigint | number | string | Field) {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return true;
  }
  return (x as Field).isConstant();
}

function toField(x: bigint | number | string | Field): Field {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return Field(x as bigint | number | string);
  }
  return x as Field;
}

function toFp(x: bigint | number | string | Field): Fp {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return Fp(x as bigint | number | string);
  }
  return (x as Field).toBigInt();
}

function withMessage(error: unknown, message?: string) {
  if (message === undefined || !(error instanceof Error)) return error;
  error.message = `${message}\n${error.message}`;
  return error;
}

type InferArgs<T> = T extends new (...args: infer Args) => any ? Args : never;
type InferReturn<T> = T extends new (...args: any) => infer Return
  ? Return
  : never;
