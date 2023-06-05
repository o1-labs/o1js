import { Snarky } from '../snarky.js';
import { Field, FieldConst, FieldType, FieldVar } from './field.js';
import { Bool as B } from '../provable/field-bigint.js';
import { defineBinable, type Binable } from '../bindings/lib/binable.js';
import { NonNegativeInteger } from 'src/bindings/crypto/non-negative.js';

export { BoolVar, Bool };

// same representation, but use a different name to communicate intent / constraints
type BoolVar = FieldVar;

type ConstantBoolVar = [FieldType.Constant, FieldConst];
type ConstantBool = Bool & { value: ConstantBoolVar };

class Bool {
  value: BoolVar;

  constructor(x: boolean | Bool | BoolVar) {
    if (Bool.#isBool(x)) {
      this.value = x.value;
      return;
    }
    if (Array.isArray(x)) {
      this.value = x;
      return;
    }
    this.value = FieldVar.constant(B(x));
  }

  isConstant(): this is { value: ConstantBoolVar } {
    return this.value[0] === FieldType.Constant;
  }

  toBoolean(): boolean {
    let value;
    if (this.isConstant()) {
      value = this.value[1];
    } else {
      value = Snarky.field.readVar(this.value);
    }
    return FieldConst.equal(value, FieldConst.fromBigint(1n));
  }

  toField() {
    return new Field(this.value);
  }

  not(): Bool {
    if (this.isConstant()) {
      return new Bool(!this.toBoolean());
    }
    return new Bool(Snarky.bool.not(this.value));
  }

  and(y: Bool | boolean): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBoolean() && toBoolean(y));
    }
    return new Bool(Snarky.bool.and_(this.value, Bool.#toVar(y)));
  }

  or(y: Bool | boolean): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBoolean() || toBoolean(y));
    }
    return new Bool(Snarky.bool.or_(this.value, Bool.#toVar(y)));
  }

  assertEquals(y: Bool | boolean, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (this.toBoolean() !== toBoolean(y)) {
          throw Error(`Bool.assertEquals(): ${this} != ${y}`);
        }
        return;
      }
      Snarky.bool.assertEqual(this.value, Bool.#toVar(y));
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  assertTrue(message?: string) {
    if (this.isConstant() && !this.toBoolean()) {
      throw Error(`Bool.assertTrue(): ${this} != ${true}`);
    }
    this.assertEquals(true, message);
  }

  assertFalse(message?: string) {
    if (this.isConstant() && this.toBoolean()) {
      throw Error(`Bool.assertFalse(): ${this} != ${false}`);
    }
    this.assertEquals(false, message);
  }

  equals(y: Bool | boolean): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBoolean() === toBoolean(y));
    }
    return new Bool(Snarky.bool.equals(this.value, Bool.#toVar(y)));
  }

  sizeInFields(): number {
    return 1;
  }

  toFields(): Field[] {
    return [new Field(this.value)];
  }

  toString(): string {
    return this.toBoolean().toString();
  }

  toJSON() {
    return this.toString();
  }

  static #isBool(x: boolean | Bool | BoolVar): x is Bool {
    return x instanceof Bool;
  }

  static #toVar(x: boolean | Bool): BoolVar {
    if (Bool.#isBool(x)) return x.value;
    return FieldVar.constant(B(x));
  }

  static toField(x: Bool | boolean): Field {
    return new Field(Bool.#toVar(x));
  }

  static not(x: Bool | boolean): Bool {
    if (Bool.#isBool(x)) {
      return x.not();
    }
    return new Bool(!x);
  }

  static and(x: Bool | boolean, y: Bool | boolean): Bool {
    if (Bool.#isBool(x) && Bool.#isBool(y)) {
      return x.and(y);
    }
    return new Bool(x && y);
  }

  static or(x: Bool | boolean, y: Bool | boolean): Bool {
    if (Bool.#isBool(x) && Bool.#isBool(y)) {
      return x.or(y);
    }
    return new Bool(x || y);
  }

  static assertEqual(x: Bool | boolean, y: Bool | boolean) {
    if (Bool.#isBool(x) && Bool.#isBool(y)) {
      x.assertEquals(y);
      return;
    }
    if (x !== y) {
      throw Error(`Bool.assertEqual(): ${x} != ${y}`);
    }
  }

  static equal(x: Bool | boolean, y: Bool | boolean): Bool {
    if (Bool.#isBool(x) && Bool.#isBool(y)) {
      return x.equals(y);
    }
    return new Bool(x === y);
  }

  static count(x: Bool | boolean[]) {}

  static toFields(x: Bool): Field[] {
    return [new Field(x.value)];
  }

  static toAuxiliary(_?: Bool): [] {
    return [];
  }

  static fromFields(fields: Field[]) {}

  static toJSON(x: Bool) {
    return x.toString();
  }

  static fromJSON(b: boolean) {
    return new Bool(b);
  }

  static check(x: Bool) {}

  static toInput(x: Bool) {
    return { packed: [[x.toField(), 1] as [Field, number]] };
  }

  static toBytes(b: Bool): number[] {
    return BoolBinable.toBytes(b);
  }
  static fromBytes(bytes: number[]): Bool {
    return BoolBinable.fromBytes(bytes);
  }
  static readBytes<N extends number>(
    bytes: number[],
    offset: NonNegativeInteger<N>
  ): [value: Bool, offset: number] {
    return BoolBinable.readBytes(bytes, offset);
  }

  static sizeInFields() {
    return 1;
  }

  static sizeInBytes() {
    return 1;
  }
}

const BoolBinable = defineBinable({
  toBytes(b: Bool) {
    return [Number(b.toBoolean())];
  },
  readBytes(bytes, offset) {
    return [new Bool(!!bytes[offset]), offset + 1];
  },
});

function isConstant(x: boolean | Bool): x is boolean | ConstantBool {
  let type = typeof x;
  if (type === 'boolean') {
    return true;
  }
  return (x as Bool).isConstant();
}

function toBoolean(x: boolean | Bool): boolean {
  if (typeof x === 'boolean') {
    return x;
  }
  return (x as Bool).toBoolean();
}

// TODO: This is duplicated
function withMessage(error: unknown, message?: string) {
  if (message === undefined || !(error instanceof Error)) return error;
  error.message = `${message}\n${error.message}`;
  return error;
}
