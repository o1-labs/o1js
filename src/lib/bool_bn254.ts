import { Snarky } from '../snarky.js';
import {
  Field,
  FieldConst,
  FieldType,
  FieldVar,
  readVarMessage,
} from './field.js';
import { FieldBn254 } from './field_bn254.js';
import { Bool as B } from '../provable/field-bigint.js';
import { defineBinable } from '../bindings/lib/binable.js';
import { NonNegativeInteger } from '../bindings/crypto/non-negative.js';
import { asProverBn254 } from './provable-context.js';
import { BoolVar } from './bool.js';

export { BoolBn254, isBool };

type ConstantBoolVar = [FieldType.Constant, FieldConst];
type ConstantBool = BoolBn254 & { value: ConstantBoolVar };

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
class BoolBn254 {
  value: BoolVar;

  constructor(x: boolean | BoolBn254 | BoolVar) {
    if (BoolBn254.#isBool(x)) {
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
   * Converts a {@link BoolBn254} to a {@link FieldBn254Bn254}. `false` becomes 0 and `true` becomes 1.
   */
  toField(): FieldBn254 {
    return BoolBn254.toField(this);
  }

  /**
   * @returns a new {@link BoolBn254} that is the negation of this {@link BoolBn254}.
   */
  not(): BoolBn254 {
    if (this.isConstant()) {
      return new BoolBn254(!this.toBoolean());
    }
    return new BoolBn254(Snarky.boolBn254.not(this.value));
  }

  /**
   * @param y A {@link BoolBn254} to AND with this {@link BoolBn254}.
   * @returns a new {@link BoolBn254} that is set to true only if
   * this {@link BoolBn254} and `y` are also true.
   */
  and(y: BoolBn254 | boolean): BoolBn254 {
    if (this.isConstant() && isConstant(y)) {
      return new BoolBn254(this.toBoolean() && toBoolean(y));
    }
    return new BoolBn254(Snarky.boolBn254.and(this.value, BoolBn254.#toVar(y)));
  }

  /**
   * @param y a {@link BoolBn254} to OR with this {@link BoolBn254}.
   * @returns a new {@link BoolBn254} that is set to true if either
   * this {@link BoolBn254} or `y` is true.
   */
  or(y: BoolBn254 | boolean): BoolBn254 {
    if (this.isConstant() && isConstant(y)) {
      return new BoolBn254(this.toBoolean() || toBoolean(y));
    }
    return new BoolBn254(Snarky.boolBn254.or(this.value, BoolBn254.#toVar(y)));
  }

  /**
   * Proves that this {@link BoolBn254} is equal to `y`.
   * @param y a {@link BoolBn254}.
   */
  assertEquals(y: BoolBn254 | boolean, message?: string): void {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (this.toBoolean() !== toBoolean(y)) {
          throw Error(`BoolBn254.assertEquals(): ${this} != ${y}`);
        }
        return;
      }
      Snarky.boolBn254.assertEqual(this.value, BoolBn254.#toVar(y));
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Proves that this {@link BoolBn254} is `true`.
   */
  assertTrue(message?: string): void {
    try {
      if (this.isConstant() && !this.toBoolean()) {
        throw Error(`BoolBn254.assertTrue(): ${this} != ${true}`);
      }
      this.assertEquals(true);
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Proves that this {@link BoolBn254} is `false`.
   */
  assertFalse(message?: string): void {
    try {
      if (this.isConstant() && this.toBoolean()) {
        throw Error(`BoolBn254.assertFalse(): ${this} != ${false}`);
      }
      this.assertEquals(false);
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Returns true if this {@link BoolBn254} is equal to `y`.
   * @param y a {@link BoolBn254}.
   */
  equals(y: BoolBn254 | boolean): BoolBn254 {
    if (this.isConstant() && isConstant(y)) {
      return new BoolBn254(this.toBoolean() === toBoolean(y));
    }
    return new BoolBn254(Snarky.boolBn254.equals(this.value, BoolBn254.#toVar(y)));
  }

  /**
   * Returns the size of this type.
   */
  sizeInFields(): number {
    return 1;
  }

  /**
   * Serializes this {@link BoolBn254} into {@link FieldBn254} elements.
   */
  toFields(): FieldBn254[] {
    return BoolBn254.toFields(this);
  }

  /**
   * Serialize the {@link BoolBn254} to a string, e.g. for printing.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string {
    return this.toBoolean().toString();
  }

  /**
   * Serialize the {@link BoolBn254} to a JSON string.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toJSON(): boolean {
    return this.toBoolean();
  }

  /**
   * This converts the {@link BoolBn254} to a javascript [[boolean]].
   * This can only be called on non-witness values.
   */
  toBoolean(): boolean {
    let value: FieldConst;
    if (this.isConstant()) {
      value = this.value[1];
    } else if (Snarky.run.inProverBlockBn254()) {
      value = Snarky.fieldBn254.readVar(this.value);
    } else {
      throw Error(readVarMessage('toBoolean', 'b', 'BoolBn254'));
    }
    return FieldConst.equal(value, FieldConst[1]);
  }

  static toField(x: BoolBn254 | boolean): FieldBn254 {
    return new FieldBn254(BoolBn254.#toVar(x));
  }

  /**
   * Boolean negation.
   */
  static not(x: BoolBn254 | boolean): BoolBn254 {
    if (BoolBn254.#isBool(x)) {
      return x.not();
    }
    return new BoolBn254(!x);
  }

  /**
   * Boolean AND operation.
   */
  static and(x: BoolBn254 | boolean, y: BoolBn254 | boolean): BoolBn254 {
    if (BoolBn254.#isBool(x)) {
      return x.and(y);
    }
    return new BoolBn254(x).and(y);
  }

  /**
   * Boolean OR operation.
   */
  static or(x: BoolBn254 | boolean, y: BoolBn254 | boolean): BoolBn254 {
    if (BoolBn254.#isBool(x)) {
      return x.or(y);
    }
    return new BoolBn254(x).or(y);
  }

  /**
   * Asserts if both {@link BoolBn254} are equal.
   */
  static assertEqual(x: BoolBn254, y: BoolBn254 | boolean): void {
    if (BoolBn254.#isBool(x)) {
      x.assertEquals(y);
      return;
    }
    new BoolBn254(x).assertEquals(y);
  }

  /**
   * Checks two {@link BoolBn254} for equality.
   */
  static equal(x: BoolBn254 | boolean, y: BoolBn254 | boolean): BoolBn254 {
    if (BoolBn254.#isBool(x)) {
      return x.equals(y);
    }
    return new BoolBn254(x).equals(y);
  }

  /**
   * Static method to serialize a {@link BoolBn254} into an array of {@link FieldBn254} elements.
   */
  static toFields(x: BoolBn254): FieldBn254[] {
    return [BoolBn254.toField(x)];
  }

  /**
   * Static method to serialize a {@link BoolBn254} into its auxiliary data.
   */
  static toAuxiliary(_?: BoolBn254): [] {
    return [];
  }

  /**
   * Creates a data structure from an array of serialized {@link FieldBn254} elements.
   */
  static fromFields(fields: FieldBn254[]): BoolBn254 {
    if (fields.length !== 1) {
      throw Error(`BoolBn254.fromFields(): expected 1 field, got ${fields.length}`);
    }
    return new BoolBn254(fields[0].value);
  }

  /**
   * Serialize a {@link BoolBn254} to a JSON string.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static toJSON(x: BoolBn254): boolean {
    return x.toBoolean();
  }

  /**
   * Deserialize a JSON structure into a {@link BoolBn254}.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static fromJSON(b: boolean): BoolBn254 {
    return new BoolBn254(b);
  }

  /**
   * Returns the size of this type.
   */
  static sizeInFields() {
    return 1;
  }

  static toInput(x: BoolBn254): { packed: [FieldBn254, number][] } {
    return { packed: [[x.toField(), 1] as [FieldBn254, number]] };
  }

  static toBytes(b: BoolBn254): number[] {
    return BoolBinable.toBytes(b);
  }

  static fromBytes(bytes: number[]): BoolBn254 {
    return BoolBinable.fromBytes(bytes);
  }

  static readBytes<N extends number>(
    bytes: number[],
    offset: NonNegativeInteger<N>
  ): [value: BoolBn254, offset: number] {
    return BoolBinable.readBytes(bytes, offset);
  }

  static sizeInBytes() {
    return 1;
  }

  static check(x: BoolBn254): void {
    Snarky.fieldBn254.assertBoolean(x.value);
  }

  static Unsafe = {
    /**
     * Converts a {@link FieldBn254} into a {@link BoolBn254}. This is a **dangerous** operation
     * as it assumes that the field element is either 0 or 1 (which might not be true).
     *
     * Only use this with constants or if you have already constrained the Field element to be 0 or 1.
     *
     * @param x a {@link FieldBn254}
     */
    ofField(x: FieldBn254) {
      asProverBn254(() => {
        let x0 = x.toBigInt();
        if (x0 !== 0n && x0 !== 1n)
          throw Error(`BoolBn254.Unsafe.ofField(): Expected 0 or 1, got ${x0}`);
      });
      return new BoolBn254(x.value);
    },
  };

  static #isBool(x: boolean | BoolBn254 | BoolVar): x is BoolBn254 {
    return x instanceof BoolBn254;
  }

  static #toVar(x: boolean | BoolBn254): BoolVar {
    if (BoolBn254.#isBool(x)) return x.value;
    return FieldVar.constant(B(x));
  }
}

const BoolBinable = defineBinable({
  toBytes(b: BoolBn254) {
    return [Number(b.toBoolean())];
  },
  readBytes(bytes, offset) {
    return [new BoolBn254(!!bytes[offset]), offset + 1];
  },
});

function isConstant(x: boolean | BoolBn254): x is boolean | ConstantBool {
  if (typeof x === 'boolean') {
    return true;
  }

  return x.isConstant();
}

function isBool(x: unknown) {
  return x instanceof BoolBn254;
}

function toBoolean(x: boolean | BoolBn254): boolean {
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
