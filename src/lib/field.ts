import { Snarky, SnarkyField } from '../snarky.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { Bool } from '../snarky.js';
import { defineBinable } from '../bindings/lib/binable.js';
import type { NonNegativeInteger } from '../bindings/crypto/non-negative.js';

export { Field, ConstantField, FieldType, FieldVar, FieldConst };

const SnarkyFieldConstructor = SnarkyField(1).constructor;

type FieldConst = Uint8Array;

enum FieldType {
  Constant,
  Var,
  Add,
  Scale,
}

type FieldVar =
  | [FieldType.Constant, FieldConst]
  | [FieldType.Var, number]
  | [FieldType.Add, FieldVar, FieldVar]
  | [FieldType.Scale, FieldConst, FieldVar];

type ConstantFieldRaw = { value: [FieldType.Constant, FieldConst] };

function constToBigint(x: FieldConst): Fp {
  return Fp.fromBytes([...x]);
}
function constFromBigint(x: Fp) {
  return Uint8Array.from(Fp.toBytes(x));
}

const Field = toFunctionConstructor(
  class Field {
    value: FieldVar;

    static ORDER = Fp.modulus;

    constructor(x: bigint | number | string | Field | FieldVar) {
      if (Field.#isField(x)) {
        this.value = x.value;
        return;
      }
      // fieldVar
      if (Array.isArray(x)) {
        this.value = x;
        return;
      }
      // TODO this should handle common values efficiently by reading from a lookup table
      this.value = [0, constFromBigint(Fp(x))];
    }

    // helpers
    static #isField(
      x: bigint | number | string | Field | FieldVar
    ): x is Field {
      return x instanceof Field || (x as any) instanceof SnarkyFieldConstructor;
    }
    static #fromConst(value: FieldConst): Field & ConstantFieldRaw {
      return new Field([0, value]) as Field & ConstantFieldRaw;
    }
    static #toConst(
      x: bigint | number | string | (Field & ConstantFieldRaw)
    ): FieldConst {
      if (Field.#isField(x)) return x.value[1];
      return constFromBigint(Fp(x));
    }
    static #toVar(x: bigint | number | string | Field): FieldVar {
      if (Field.#isField(x)) return x.value;
      return [0, constFromBigint(Fp(x))];
    }
    static from(x: bigint | number | string | Field): Field {
      if (Field.#isField(x)) return x;
      return new Field(x);
    }

    static #zero = Uint8Array.from(Fp.toBytes(0n));
    static #one = Uint8Array.from(Fp.toBytes(1n));
    static #negOne = Uint8Array.from(Fp.toBytes(Fp(-1n)));

    isConstant(): this is ConstantFieldRaw {
      return this.value[0] === FieldType.Constant;
    }
    toConstant(): Field & ConstantFieldRaw {
      if (this.isConstant()) return this;
      // TODO: fix OCaml error message, `Can't evaluate prover code outside an as_prover block`
      let value = Snarky.field.readVar(this.value);
      return Field.#fromConst(value);
    }

    toBigInt() {
      let x = this.toConstant();
      return constToBigint(x.value[1]);
    }
    toString() {
      return this.toBigInt().toString();
    }

    assertEquals(y: Field | bigint | number | string, message?: string) {
      try {
        if (this.isConstant() && isConstant(y)) {
          if (this.toBigInt() !== toFp(y)) {
            throw Error(`Field.assertEquals(): ${this} != ${y}`);
          }
          return;
        }
        Snarky.field.assertEqual(this.value, Field.#toVar(y));
      } catch (err) {
        throw withMessage(err, message);
      }
    }

    add(y: Field | bigint | number | string): Field {
      if (this.isConstant() && isConstant(y)) {
        return new Field(Fp.add(this.toBigInt(), toFp(y)));
      }
      // return new AST node Add(x, y)
      let z = Snarky.field.add(this.value, Field.#toVar(y));
      return new Field(z);
    }

    neg() {
      if (this.isConstant()) {
        return new Field(Fp.negate(this.toBigInt()));
      }
      // return new AST node Scale(-1, x)
      let z = Snarky.field.scale(this.value, Field.#negOne);
      return new Field(z);
    }

    sub(y: Field | bigint | number | string) {
      return this.add(Field.from(y).neg());
    }

    static #assertMul(x: Field, y: Field, z: Field) {
      Snarky.field.assertMul(x.value, y.value, z.value);
    }

    mul(y: Field | bigint | number | string): Field {
      if (this.isConstant() && isConstant(y)) {
        return new Field(Fp.mul(this.toBigInt(), toFp(y)));
      }
      // if one of the factors is constant, return Scale AST node
      if (this.isConstant()) {
        let z = Snarky.field.scale((y as Field).value, this.value[1]);
        return new Field(z);
      }
      if (isConstant(y)) {
        let z = Snarky.field.scale(this.value, Field.#toConst(y));
        return new Field(z);
      }
      // create a new witness for z = x*y
      let z = Snarky.existsVar(() =>
        constFromBigint(Fp.mul(this.toBigInt(), toFp(y)))
      );
      // add a multiplication constraint
      Snarky.field.assertMul(this.value, y.value, z);
      return new Field(z);
    }

    inv() {
      if (this.isConstant()) {
        let z = Fp.inverse(this.toBigInt());
        if (z === undefined) throw Error('Field.inv(): Division by zero');
        return new Field(z);
      }
      // create a witness for z = x^(-1)
      let z = Snarky.existsVar(() => {
        let z = Fp.inverse(this.toBigInt()) ?? 0n;
        return constFromBigint(z);
      });
      // constrain x * z === 1
      Snarky.field.assertMul(this.value, z, [0, Field.#one]);
      return new Field(z);
    }

    div(y: Field | bigint | number | string) {
      // TODO this is the same as snarky-ml but could use 1 constraint instead of 2
      return this.mul(Field.from(y).inv());
    }

    square() {
      // snarky-ml uses assert_square which leads to an equivalent but slightly different gate
      return this.mul(this);
    }

    sqrt() {
      if (this.isConstant()) {
        let z = Fp.sqrt(this.toBigInt());
        if (z === undefined)
          throw Error(
            `Field.sqrt(): input ${this} has no square root in the field.`
          );
        return new Field(z);
      }
      // create a witness for sqrt(x)
      let z = Snarky.existsVar(() => {
        let z = Fp.sqrt(this.toBigInt()) ?? 0n;
        return constFromBigint(z);
      });
      // constrain z * z === x
      Snarky.field.assertMul(z, z, this.value);
      return new Field(z);
    }

    equals(y: Field | bigint | number | string): Bool {
      if (this.isConstant() && isConstant(y)) {
        return Bool(this.toBigInt() === toFp(y));
      }
      // create delta = x - y
      let delta = this.sub(y);
      // create witnesses z = 1/(x - y), or z=0 if x=y,
      // and b = 1 - z(x - y)
      let [b, z] = Snarky.exists(2, () => {
        let delta0 = delta.toBigInt();
        let z = Fp.inverse(delta0) ?? 0n;
        let b = Fp.sub(1n, Fp.mul(z, delta0));
        return [new Field(b), new Field(z)];
      });
      // add constraints
      // z * (x - y) === 1 - b
      Field.#assertMul(z, delta, new Field(1).sub(delta));
      // b * (x - y) === 0
      Field.#assertMul(b, delta, new Field(0));
      // these prove that b = Bool(x === y):
      // if x = y, the 1st equation implies b = 1
      // if x != y, the 2nd implies b = 0
      return Bool.Unsafe.ofField(b);
    }

    lessThan(y: Field | bigint | number | string): Bool {
      if (this.isConstant() && isConstant(y)) {
        return Bool(this.toBigInt() < toFp(y));
      }
      return SnarkyField(this).lessThan(y);
    }
    lessThanOrEqual(y: Field | bigint | number | string): Bool {
      if (this.isConstant() && isConstant(y)) {
        return Bool(this.toBigInt() <= toFp(y));
      }
      return SnarkyField(this).lessThanOrEqual(y);
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
        SnarkyField(this).assertLessThan(y);
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
        SnarkyField(this).assertLessThanOrEqual(y);
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
      return SnarkyField(this).isZero();
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
        SnarkyField(this).assertBool();
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
      return SnarkyField(this).toBits();
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
      return SnarkyField.fromBits(bits);
    }

    // TODO rename
    rangeCheckHelper(numBits: number) {
      Field.#checkBitLength('Field.rangeCheckHelper()', numBits);
      if (this.isConstant()) {
        let bits = Fp.toBits(this.toBigInt())
          .slice(0, numBits)
          .concat(Array(Fp.sizeInBits - numBits).fill(false));
        return new Field(Fp.fromBits(bits));
      }
      return SnarkyField(this).rangeCheckHelper(numBits);
    }
    seal() {
      if (this.isConstant()) return this;
      return SnarkyField(this).seal();
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

function isConstant(
  x: bigint | number | string | Field
): x is bigint | number | string | (Field & ConstantFieldRaw) {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return true;
  }
  return (x as Field).isConstant();
}
function isVariable(x: bigint | number | string | Field): x is Field {
  return !isConstant(x);
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
