import { Snarky } from '../snarky.js';
import {
  Field,
  FieldConst,
  FieldType,
  FieldVar,
  readVarMessage,
} from './field.js';
import { Bool as B } from '../provable/field-bigint.js';
import { defineBinable } from '../bindings/lib/binable.js';
import { NonNegativeInteger } from '../bindings/crypto/non-negative.js';
import { asProver } from './provable-context.js';

export { BoolVar, Bool, isBool };

// same representation, but use a different name to communicate intent / constraints
type BoolVar = FieldVar;

type ConstantBoolVar = [FieldType.Constant, FieldConst];
type ConstantBool = Bool & { value: ConstantBoolVar };

/**
 * A boolean value. You can use it like this:
 *
 * ```
 * const x = new Bool(true);
 * ```
 *
 * You can also combine multiple booleans via [[`not`]], [[`and`]], [[`or`]].
 *
 * Use [[assertEquals]] to enforce the value of a Bool.
 */
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

  /**
   * Converts a {@link Bool} to a {@link Field}. `false` becomes 0 and `true` becomes 1.
   */
  toField(): Field {
    return Bool.toField(this);
  }

  /**
   * @returns a new {@link Bool} that is the negation of this {@link Bool}.
   */
  not(): Bool {
    if (this.isConstant()) {
      return new Bool(!this.toBoolean());
    }
    return new Bool(Snarky.bool.not(this.value));
  }

  /**
   * @param y A {@link Bool} to AND with this {@link Bool}.
   * @returns a new {@link Bool} that is set to true only if
   * this {@link Bool} and `y` are also true.
   */
  and(y: Bool | boolean): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBoolean() && toBoolean(y));
    }
    return new Bool(Snarky.bool.and(this.value, Bool.#toVar(y)));
  }

  /**
   * @param y a {@link Bool} to OR with this {@link Bool}.
   * @returns a new {@link Bool} that is set to true if either
   * this {@link Bool} or `y` is true.
   */
  or(y: Bool | boolean): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBoolean() || toBoolean(y));
    }
    return new Bool(Snarky.bool.or(this.value, Bool.#toVar(y)));
  }

  /**
   * Proves that this {@link Bool} is equal to `y`.
   * @param y a {@link Bool}.
   */
  assertEquals(y: Bool | boolean, message?: string): void {
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

  /**
   * Proves that this {@link Bool} is `true`.
   */
  assertTrue(message?: string): void {
    try {
      if (this.isConstant() && !this.toBoolean()) {
        throw Error(`Bool.assertTrue(): ${this} != ${true}`);
      }
      this.assertEquals(true);
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Proves that this {@link Bool} is `false`.
   */
  assertFalse(message?: string): void {
    try {
      if (this.isConstant() && this.toBoolean()) {
        throw Error(`Bool.assertFalse(): ${this} != ${false}`);
      }
      this.assertEquals(false);
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Returns true if this {@link Bool} is equal to `y`.
   * @param y a {@link Bool}.
   */
  equals(y: Bool | boolean): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBoolean() === toBoolean(y));
    }
    return new Bool(Snarky.bool.equals(this.value, Bool.#toVar(y)));
  }

  /**
   * Returns the size of this type.
   */
  sizeInFields(): number {
    return 1;
  }

  /**
   * Serializes this {@link Bool} into {@link Field} elements.
   */
  toFields(): Field[] {
    return Bool.toFields(this);
  }

  /**
   * Serialize the {@link Bool} to a string, e.g. for printing.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string {
    return this.toBoolean().toString();
  }

  /**
   * Serialize the {@link Bool} to a JSON string.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toJSON(): boolean {
    return this.toBoolean();
  }

  /**
   * This converts the {@link Bool} to a javascript [[boolean]].
   * This can only be called on non-witness values.
   */
  toBoolean(): boolean {
    let value: FieldConst;
    if (this.isConstant()) {
      value = this.value[1];
    } else if (Snarky.run.inProverBlock()) {
      value = Snarky.field.readVar(this.value);
    } else {
      throw Error(readVarMessage('toBoolean', 'b', 'Bool'));
    }
    return FieldConst.equal(value, FieldConst[1]);
  }

  static toField(x: Bool | boolean): Field {
    return new Field(Bool.#toVar(x));
  }

  /**
   * Boolean negation.
   */
  static not(x: Bool | boolean): Bool {
    if (Bool.#isBool(x)) {
      return x.not();
    }
    return new Bool(!x);
  }

  /**
   * Boolean AND operation.
   */
  static and(x: Bool | boolean, y: Bool | boolean): Bool {
    if (Bool.#isBool(x)) {
      return x.and(y);
    }
    return new Bool(x).and(y);
  }

  /**
   * Boolean OR operation.
   */
  static or(x: Bool | boolean, y: Bool | boolean): Bool {
    if (Bool.#isBool(x)) {
      return x.or(y);
    }
    return new Bool(x).or(y);
  }

  /**
   * Asserts if both {@link Bool} are equal.
   */
  static assertEqual(x: Bool, y: Bool | boolean): void {
    if (Bool.#isBool(x)) {
      x.assertEquals(y);
      return;
    }
    new Bool(x).assertEquals(y);
  }

  /**
   * Checks two {@link Bool} for equality.
   */
  static equal(x: Bool | boolean, y: Bool | boolean): Bool {
    if (Bool.#isBool(x)) {
      return x.equals(y);
    }
    return new Bool(x).equals(y);
  }

  /**
   * Static method to serialize a {@link Bool} into an array of {@link Field} elements.
   */
  static toFields(x: Bool): Field[] {
    return [Bool.toField(x)];
  }

  /**
   * Static method to serialize a {@link Bool} into its auxiliary data.
   */
  static toAuxiliary(_?: Bool): [] {
    return [];
  }

  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Bool {
    if (fields.length !== 1) {
      throw Error(`Bool.fromFields(): expected 1 field, got ${fields.length}`);
    }
    return new Bool(fields[0].value);
  }

  /**
   * Serialize a {@link Bool} to a JSON string.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static toJSON(x: Bool): boolean {
    return x.toBoolean();
  }

  /**
   * Deserialize a JSON structure into a {@link Bool}.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static fromJSON(b: boolean): Bool {
    return new Bool(b);
  }

  /**
   * Returns the size of this type.
   */
  static sizeInFields() {
    return 1;
  }

  static toInput(x: Bool): { packed: [Field, number][] } {
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

  static sizeInBytes() {
    return 1;
  }

  static check(x: Bool): void {
    Snarky.field.assertBoolean(x.value);
  }

  static Unsafe = {
    /**
     * Converts a {@link Field} into a {@link Bool}. This is a **dangerous** operation
     * as it assumes that the field element is either 0 or 1 (which might not be true).
     *
     * Only use this with constants or if you have already constrained the Field element to be 0 or 1.
     *
     * @param x a {@link Field}
     */
    ofField(x: Field) {
      asProver(() => {
        let x0 = x.toBigInt();
        if (x0 !== 0n && x0 !== 1n)
          throw Error(`Bool.Unsafe.ofField(): Expected 0 or 1, got ${x0}`);
      });
      return new Bool(x.value);
    },
  };

  static #isBool(x: boolean | Bool | BoolVar): x is Bool {
    return x instanceof Bool;
  }

  static #toVar(x: boolean | Bool): BoolVar {
    if (Bool.#isBool(x)) return x.value;
    return FieldVar.constant(B(x));
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
  if (typeof x === 'boolean') {
    return true;
  }

  return x.isConstant();
}

function isBool(x: unknown) {
  return x instanceof Bool;
}

function toBoolean(x: boolean | Bool): boolean {
  if (typeof x === 'boolean') {
    return x;
  }
  return x.toBoolean();
}

// TODO: This is duplicated
function withMessage(error: unknown, message?: string) {
  if (message === undefined || !(error instanceof Error)) return error;
  error.message = `${message}\n${error.message}`;
  return error;
}
