import { Snarky } from '../snarky.js';
import { Field, FieldConst, FieldType, FieldVar } from './field.js';
import { Bool as B } from '../provable/field-bigint.js';

export { BoolVar };

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
      value = Snarky.bool.readVar(this.value);
    }
    return areUint8ArraysEqual(value, FieldConst.fromBigint(1n));
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

  static sizeInFields() {
    return 1;
  }

  static toFields(x: Bool): Field[] {
    return [new Field(x.value)];
  }

  static toAuxiliary(x?: Bool): [] {
    return [];
  }

  static fromFields(fields: Field[]) {}

  static toJSON(x: Bool) {}

  static fromJSON(x: boolean) {}

  static check(x: Bool) {}
}

function areUint8ArraysEqual(x: Uint8Array, y: Uint8Array) {
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

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
