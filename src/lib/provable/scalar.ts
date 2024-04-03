import { Fq } from '../../bindings/crypto/finite-field.js';
import { Scalar as SignableFq } from '../../mina-signer/src/curve-bigint.js';
import { Field } from './field.js';
import { FieldVar } from './core/fieldvar.js';
import { Bool } from './bool.js';
import { TupleN } from '../util/types.js';
import { fieldToShiftedSplit5 } from './gadgets/native-curve.js';
import { isConstant, packBits } from './gadgets/common.js';
import { Provable } from './provable.js';
import { assert } from '../util/assert.js';
import type { HashInput } from './types/provable-derivers.js';

export { Scalar, ScalarConst };

type ScalarConst = [0, bigint];

let scalarShift = Fq.mod(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

/**
 * Represents a {@link Scalar}.
 */
class Scalar {
  /**
   * We represent a scalar s in shifted form `t = s - 2^254 mod q,
   * split into its low 5 bits (t & 0x1f) and high 250 bits (t >> 5).
   * The reason is that we can efficiently compute the scalar multiplication `(t + 2^254) * P = s * P`.
   */
  low5: TupleN<Bool, 5>;
  high250: Field;

  static ORDER = Fq.modulus;

  private constructor(low5: TupleN<Bool, 5>, high250: Field) {
    this.low5 = low5;
    this.high250 = high250;
  }

  /**
   * Create a constant {@link Scalar} from a bigint, number, string or Scalar.
   *
   * If the input is too large, it is reduced modulo the scalar field size.
   */
  static from(s: Scalar | bigint | number | string): Scalar {
    if (s instanceof Scalar) return s;
    let t = Fq.mod(BigInt(s) - (1n << 254n));
    let low5 = new Field(t & 0x1fn).toBits(5);
    let high250 = new Field(t >> 5n);
    return new Scalar(TupleN.fromArray(5, low5), high250);
  }

  /**
   * Provable method to convert a {@link Field} into a {@link Scalar}.
   *
   * This is always possible and unambiguous, since the scalar field is larger than the base field.
   */
  static fromNativeField(s: Field): Scalar {
    let { low5, high250 } = fieldToShiftedSplit5(s);
    return new Scalar(low5, high250);
  }

  /**
   * Check whether this {@link Scalar} is a hard-coded constant in the constraint system.
   * If a {@link Scalar} is constructed outside provable code, it is a constant.
   */
  isConstant() {
    let { low5, high250 } = this;
    return isConstant(high250, ...low5);
  }

  /**
   * Convert this {@link Scalar} into a constant if it isn't already.
   *
   * If the scalar is a variable, this only works inside `asProver` or `witness` blocks.
   *
   * See {@link FieldVar} for an explanation of constants vs. variables.
   */
  toConstant() {
    if (this.isConstant()) return this;
    return Provable.toConstant(Scalar, this);
  }

  /**
   * Convert this {@link Scalar} into a bigint
   */
  toBigInt() {
    let { low5, high250 } = this.toConstant();
    return Fq.add(
      packBits(low5).toBigInt() + (high250.toBigInt() << 5n),
      1n << 254n
    );
  }

  static fromBits(bits: Bool[]): Scalar {
    // TODO
    throw Error('Not implemented');
  }

  /**
   * Returns a random {@link Scalar}.
   * Randomness can not be proven inside a circuit!
   */
  static random() {
    return Scalar.from(Fq.random());
  }

  // operations on constant scalars

  /**
   * Negate a scalar field element.
   *
   * **Warning**: This method is not available for provable code.
   */
  neg() {
    let x = assertConstant(this, 'neg');
    let z = Fq.negate(x);
    return Scalar.from(z);
  }

  /**
   * Add scalar field elements.
   *
   * **Warning**: This method is not available for provable code.
   */
  add(y: Scalar) {
    let x = assertConstant(this, 'add');
    let y0 = assertConstant(y, 'add');
    let z = Fq.add(x, y0);
    return Scalar.from(z);
  }

  /**
   * Subtract scalar field elements.
   *
   * **Warning**: This method is not available for provable code.
   */
  sub(y: Scalar) {
    let x = assertConstant(this, 'sub');
    let y0 = assertConstant(y, 'sub');
    let z = Fq.sub(x, y0);
    return Scalar.from(z);
  }

  /**
   * Multiply scalar field elements.
   *
   * **Warning**: This method is not available for provable code.
   */
  mul(y: Scalar) {
    let x = assertConstant(this, 'mul');
    let y0 = assertConstant(y, 'mul');
    let z = Fq.mul(x, y0);
    return Scalar.from(z);
  }

  /**
   * Divide scalar field elements.
   * Throws if the denominator is zero.
   *
   * **Warning**: This method is not available for provable code.
   */
  div(y: Scalar) {
    let x = assertConstant(this, 'div');
    let y0 = assertConstant(y, 'div');
    let z = Fq.div(x, y0);
    if (z === undefined) throw Error('Scalar.div(): Division by zero');
    return Scalar.from(z);
  }

  /**
   * Serialize a Scalar into a Field element plus one bit, where the bit is represented as a Bool.
   *
   * **Warning**: This method is not available for provable code.
   *
   * Note: Since the Scalar field is slightly larger than the base Field, an additional high bit
   * is needed to represent all Scalars. However, for a random Scalar, the high bit will be `false` with overwhelming probability.
   */
  toFieldsCompressed(): { field: Field; highBit: Bool } {
    let s = assertConstant(this, 'toFieldsCompressed');
    let lowBitSize = BigInt(Fq.sizeInBits - 1);
    let lowBitMask = (1n << lowBitSize) - 1n;
    return {
      field: new Field(s & lowBitMask),
      highBit: new Bool(s >> lowBitSize === 1n),
    };
  }

  // internal stuff

  // Provable<Scalar>

  /**
   * Part of the {@link Provable} interface.
   *
   * Serialize a {@link Scalar} into an array of {@link Field} elements.
   *
   * **Warning**: This function is for internal usage. It returns 255 field elements
   * which represent the Scalar in a shifted, bitwise format.
   * The fields are not constrained to be boolean.
   */
  static toFields(x: Scalar) {
    return [...x.low5.map((b) => b.toField()), x.high250];
  }

  /**
   * Serialize this Scalar to Field elements.
   *
   * **Warning**: This function is for internal usage. It returns 255 field elements
   * which represent the Scalar in a shifted, bitwise format.
   * The fields are not constrained to be boolean.
   *
   * Check out {@link Scalar.toFieldsCompressed} for a user-friendly serialization
   * that can be used outside proofs.
   */
  toFields(): Field[] {
    return Scalar.toFields(this);
  }

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   *
   * This function is the implementation of `ProvableExtended.toInput()` for the {@link Scalar} type.
   *
   * @param value - The {@link Scalar} element to get the `input` array.
   *
   * @return An object where the `fields` key is a {@link Field} array of length 1 created from this {@link Field}.
   *
   */
  static toInput(x: Scalar): HashInput {
    return { fields: [x.high250], packed: x.low5.map((f) => [f.toField(), 1]) };
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Serialize a {@link Scalar} into its auxiliary data, which are empty.
   */
  static toAuxiliary() {
    return [];
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Scalar {
    assert(
      fields.length === 6,
      `Scalar.fromFields(): expected 6 fields, got ${fields.length}`
    );
    let low5 = fields.slice(0, 5).map(Bool.Unsafe.fromField);
    let high250 = fields[5];
    return new Scalar(TupleN.fromArray(5, low5), high250);
  }

  /**
   * Part of the {@link Provable} interface.
   *
   * Returns the size of this type in {@link Field} elements.
   */
  static sizeInFields(): number {
    return 6;
  }

  /**
   * Part of the {@link Provable} interface.
   */
  static check(s: Scalar) {
    /**
     * It is not necessary to constrain the range of high250, because the only provable operation on Scalar
     * which relies on that range is scalar multiplication -- which constrains the range itself.
     */
    return s.low5.forEach(Bool.check);
  }

  // ProvableExtended<Scalar>

  /**
   * Serialize a {@link Scalar} to a JSON string.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Scalar.
   */
  static toJSON(x: Scalar) {
    let s = assertConstant(x, 'toJSON');
    return s.toString();
  }

  /**
   * Serializes this Scalar to a string
   */
  toJSON() {
    return Scalar.toJSON(this);
  }

  /**
   * Deserialize a JSON structure into a {@link Scalar}.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Scalar.
   */
  static fromJSON(x: string) {
    return Scalar.from(SignableFq.fromJSON(x));
  }
}

// internal helpers

function assertConstant(x: Scalar, name: string): bigint {
  assert(
    x.isConstant(),
    `${name}() is not available in provable code.
That means it can't be called in a @method or similar environment, and there's no alternative implemented to achieve that.`
  );
  return x.toBigInt();
}

/**
 * s -> 2s + 1 + 2^255
 */
function shift(s: bigint) {
  return Fq.add(Fq.add(s, s), scalarShift);
}

/**
 * inverse of shift, 2s + 1 + 2^255 -> s
 */
function unshift(s: bigint) {
  return Fq.mul(Fq.sub(s, scalarShift), oneHalf);
}
