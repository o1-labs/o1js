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

  static #isBool(x: boolean | Bool | BoolVar): x is Bool {
    return x instanceof Bool;
  }

  static #toVar(x: boolean | Bool): BoolVar {
    if (Bool.#isBool(x)) return x.value;
    return FieldVar.constant(B(x));
  }

  // TODO
  toField() {}

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

  //TODO
  assertTrue(message?: string) {}

  //TODO
  assertFalse(message?: string) {}

  // TODO
  equals(y: Bool | boolean) {}

  // TODO
  sizeInFields() {}

  // TODO
  toFields() {}

  // TODO
  toString() {}

  // TODO
  toJSON() {}

  static toField(x: Bool | boolean) {}

  static Unsafe: {
    /**
     * Converts a {@link Field} into a {@link Bool}. This is a **dangerous** operation
     * as it assumes that the field element is either 1 or 0
     * (which might not be true).
     * @param x a {@link Field}
     */
    ofField(x: Field | number | string | boolean): Bool;
  };

  static not(x: Bool | boolean) {}

  static and(x: Bool | boolean, y: Bool | boolean) {}

  static or(x: Bool | boolean, y: Bool | boolean) {}

  static assertEqual(x: Bool | boolean, y: Bool | boolean) {}

  static equal(x: Bool | boolean, y: Bool | boolean) {}

  static count(x: Bool | boolean[]) {}

  static sizeInFields() {}

  static toFields(x: Bool) {}

  static toAuxiliary(x?: Bool) {}

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
