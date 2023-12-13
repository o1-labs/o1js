import { Field, Bool } from './core.js';
import { AnyConstructor, CircuitValue, Struct, prop } from './circuit_value.js';
import { Types } from '../bindings/mina-transaction/types.js';
import { HashInput } from './hash.js';
import { Provable } from './provable.js';
import { Gadgets } from './gadgets/gadgets.js';
import { withMessage } from './field.js';
import { chunkString } from './util/arrays.js';

// external API
export { UInt8, UInt32, UInt64, Int64, Sign };

/**
 * A 64 bit unsigned integer with values ranging from 0 to 18,446,744,073,709,551,615.
 */
class UInt64 extends CircuitValue {
  @prop value: Field;
  static NUM_BITS = 64;

  /**
   * Static method to create a {@link UInt64} with value `0`.
   */
  static get zero() {
    return new UInt64(Field(0));
  }
  /**
   * Static method to create a {@link UInt64} with value `1`.
   */
  static get one() {
    return new UInt64(Field(1));
  }
  /**
   * Turns the {@link UInt64} into a string.
   * @returns
   */
  toString() {
    return this.value.toString();
  }
  /**
   * Turns the {@link UInt64} into a {@link BigInt}.
   * @returns
   */
  toBigInt() {
    return this.value.toBigInt();
  }

  /**
   * Turns the {@link UInt64} into a {@link UInt32}, asserting that it fits in 32 bits.
   */
  toUInt32() {
    let uint32 = new UInt32(this.value);
    UInt32.check(uint32);
    return uint32;
  }

  /**
   * Turns the {@link UInt64} into a {@link UInt32}, clamping to the 32 bits range if it's too large.
   * ```ts
   * UInt64.from(4294967296).toUInt32Clamped().toString(); // "4294967295"
   * ```
   */
  toUInt32Clamped() {
    let max = (1n << 32n) - 1n;
    return Provable.if(
      this.greaterThan(UInt64.from(max)),
      UInt32.from(max),
      new UInt32(this.value)
    );
  }

  static check(x: UInt64) {
    let actual = x.value.rangeCheckHelper(64);
    actual.assertEquals(x.value);
  }

  static toInput(x: UInt64): HashInput {
    return { packed: [[x.value, 64]] };
  }

  /**
   * Encodes this structure into a JSON-like object.
   */
  static toJSON(x: UInt64) {
    return x.value.toString();
  }

  /**
   * Decodes a JSON-like object into this structure.
   */
  static fromJSON<T extends AnyConstructor>(x: string): InstanceType<T> {
    return this.from(x) as any;
  }

  private static checkConstant(x: Field) {
    if (!x.isConstant()) return x;
    let xBig = x.toBigInt();
    if (xBig < 0n || xBig >= 1n << BigInt(this.NUM_BITS)) {
      throw Error(
        `UInt64: Expected number between 0 and 2^64 - 1, got ${xBig}`
      );
    }
    return x;
  }

  // this checks the range if the argument is a constant
  /**
   * Creates a new {@link UInt64}.
   */
  static from(x: UInt64 | UInt32 | Field | number | string | bigint) {
    if (x instanceof UInt64 || x instanceof UInt32) x = x.value;
    return new this(this.checkConstant(Field(x)));
  }

  /**
   * Creates a {@link UInt64} with a value of 18,446,744,073,709,551,615.
   */
  static MAXINT() {
    return new UInt64(Field((1n << 64n) - 1n));
  }

  /**
   * Integer division with remainder.
   *
   * `x.divMod(y)` returns the quotient and the remainder.
   */
  divMod(y: UInt64 | number | string) {
    let x = this.value;
    let y_ = UInt64.from(y).value;

    if (this.value.isConstant() && y_.isConstant()) {
      let xn = x.toBigInt();
      let yn = y_.toBigInt();
      let q = xn / yn;
      let r = xn - q * yn;
      return {
        quotient: new UInt64(Field(q)),
        rest: new UInt64(Field(r)),
      };
    }

    y_ = y_.seal();

    let q = Provable.witness(
      Field,
      () => new Field(x.toBigInt() / y_.toBigInt())
    );

    q.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    r.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(r);

    let r_ = new UInt64(r);
    let q_ = new UInt64(q);

    r_.assertLessThan(new UInt64(y_));

    return { quotient: q_, rest: r_ };
  }

  /**
   * Integer division.
   *
   * `x.div(y)` returns the floor of `x / y`, that is, the greatest
   * `z` such that `z * y <= x`.
   *
   */
  div(y: UInt64 | number) {
    return this.divMod(y).quotient;
  }

  /**
   * Integer remainder.
   *
   * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
   * `x - z` is divisble by `y`.
   */
  mod(y: UInt64 | number) {
    return this.divMod(y).rest;
  }

  /**
   * Multiplication with overflow checking.
   */
  mul(y: UInt64 | number) {
    let z = this.value.mul(UInt64.from(y).value);
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  /**
   * Addition with overflow checking.
   */
  add(y: UInt64 | number) {
    let z = this.value.add(UInt64.from(y).value);
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  /**
   * Subtraction with underflow checking.
   */
  sub(y: UInt64 | number) {
    let z = this.value.sub(UInt64.from(y).value);
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  /**
   * @deprecated Use {@link lessThanOrEqual} instead.
   *
   * Checks if a {@link UInt64} is less than or equal to another one.
   */
  lte(y: UInt64) {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    } else {
      let xMinusY = this.value.sub(y.value).seal();
      let yMinusX = xMinusY.neg();
      let xMinusYFits = xMinusY
        .rangeCheckHelper(UInt64.NUM_BITS)
        .equals(xMinusY);
      let yMinusXFits = yMinusX
        .rangeCheckHelper(UInt64.NUM_BITS)
        .equals(yMinusX);
      xMinusYFits.or(yMinusXFits).assertEquals(true);
      // x <= y if y - x fits in 64 bits
      return yMinusXFits;
    }
  }

  /**
   * Checks if a {@link UInt64} is less than or equal to another one.
   */
  lessThanOrEqual(y: UInt64) {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    } else {
      let xMinusY = this.value.sub(y.value).seal();
      let yMinusX = xMinusY.neg();
      let xMinusYFits = xMinusY
        .rangeCheckHelper(UInt64.NUM_BITS)
        .equals(xMinusY);
      let yMinusXFits = yMinusX
        .rangeCheckHelper(UInt64.NUM_BITS)
        .equals(yMinusX);
      xMinusYFits.or(yMinusXFits).assertEquals(true);
      // x <= y if y - x fits in 64 bits
      return yMinusXFits;
    }
  }

  /**
   * @deprecated Use {@link assertLessThanOrEqual} instead.
   *
   * Asserts that a {@link UInt64} is less than or equal to another one.
   */
  assertLte(y: UInt64, message?: string) {
    this.assertLessThanOrEqual(y, message);
  }

  /**
   * Asserts that a {@link UInt64} is less than or equal to another one.
   */
  assertLessThanOrEqual(y: UInt64, message?: string) {
    if (this.value.isConstant() && y.value.isConstant()) {
      let x0 = this.value.toBigInt();
      let y0 = y.value.toBigInt();
      if (x0 > y0) {
        if (message !== undefined) throw Error(message);
        throw Error(`UInt64.assertLessThanOrEqual: expected ${x0} <= ${y0}`);
      }
      return;
    }
    let yMinusX = y.value.sub(this.value).seal();
    yMinusX.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(yMinusX, message);
  }

  /**
   * @deprecated Use {@link lessThan} instead.
   *
   * Checks if a {@link UInt64} is less than another one.
   */
  lt(y: UInt64) {
    return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
  }

  /**
   *
   * Checks if a {@link UInt64} is less than another one.
   */
  lessThan(y: UInt64) {
    return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
  }

  /**
   *
   * @deprecated Use {@link assertLessThan} instead.
   *
   * Asserts that a {@link UInt64} is less than another one.
   */
  assertLt(y: UInt64, message?: string) {
    this.lessThan(y).assertEquals(true, message);
  }

  /**
   * Asserts that a {@link UInt64} is less than another one.
   */
  assertLessThan(y: UInt64, message?: string) {
    this.lessThan(y).assertEquals(true, message);
  }

  /**
   * @deprecated Use {@link greaterThan} instead.
   *
   * Checks if a {@link UInt64} is greater than another one.
   */
  gt(y: UInt64) {
    return y.lessThan(this);
  }

  /**
   * Checks if a {@link UInt64} is greater than another one.
   */
  greaterThan(y: UInt64) {
    return y.lessThan(this);
  }

  /**
   * @deprecated Use {@link assertGreaterThan} instead.
   *
   * Asserts that a {@link UInt64} is greater than another one.
   */
  assertGt(y: UInt64, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * Asserts that a {@link UInt64} is greater than another one.
   */
  assertGreaterThan(y: UInt64, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * @deprecated Use {@link greaterThanOrEqual} instead.
   *
   * Checks if a {@link UInt64} is greater than or equal to another one.
   */
  gte(y: UInt64) {
    return this.lessThan(y).not();
  }

  /**
   * Checks if a {@link UInt64} is greater than or equal to another one.
   */
  greaterThanOrEqual(y: UInt64) {
    return this.lessThan(y).not();
  }

  /**
   * @deprecated Use {@link assertGreaterThanOrEqual} instead.
   *
   * Asserts that a {@link UInt64} is greater than or equal to another one.
   */
  assertGte(y: UInt64, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }

  /**
   * Asserts that a {@link UInt64} is greater than or equal to another one.
   */
  assertGreaterThanOrEqual(y: UInt64, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }
}
/**
 * A 32 bit unsigned integer with values ranging from 0 to 4,294,967,295.
 */
class UInt32 extends CircuitValue {
  @prop value: Field;
  static NUM_BITS = 32;

  /**
   * Static method to create a {@link UInt32} with value `0`.
   */
  static get zero(): UInt32 {
    return new UInt32(Field(0));
  }

  /**
   * Static method to create a {@link UInt32} with value `0`.
   */
  static get one(): UInt32 {
    return new UInt32(Field(1));
  }
  /**
   * Turns the {@link UInt32} into a string.
   */
  toString(): string {
    return this.value.toString();
  }
  /**
   * Turns the {@link UInt32} into a {@link BigInt}.
   */
  toBigint() {
    return this.value.toBigInt();
  }
  /**
   * Turns the {@link UInt32} into a {@link UInt64}.
   */
  toUInt64(): UInt64 {
    // this is safe, because the UInt32 range is included in the UInt64 range
    return new UInt64(this.value);
  }

  static check(x: UInt32) {
    let actual = x.value.rangeCheckHelper(32);
    actual.assertEquals(x.value);
  }
  static toInput(x: UInt32): HashInput {
    return { packed: [[x.value, 32]] };
  }
  /**
   * Encodes this structure into a JSON-like object.
   */
  static toJSON(x: UInt32) {
    return x.value.toString();
  }

  /**
   * Decodes a JSON-like object into this structure.
   */
  static fromJSON<T extends AnyConstructor>(x: string): InstanceType<T> {
    return this.from(x) as any;
  }

  private static checkConstant(x: Field) {
    if (!x.isConstant()) return x;
    let xBig = x.toBigInt();
    if (xBig < 0n || xBig >= 1n << BigInt(this.NUM_BITS)) {
      throw Error(
        `UInt32: Expected number between 0 and 2^32 - 1, got ${xBig}`
      );
    }
    return x;
  }

  // this checks the range if the argument is a constant
  /**
   * Creates a new {@link UInt32}.
   */
  static from(x: UInt32 | Field | number | string | bigint) {
    if (x instanceof UInt32) x = x.value;
    return new this(this.checkConstant(Field(x)));
  }
  /**
   * Creates a {@link UInt32} with a value of 4,294,967,295.
   */
  static MAXINT() {
    return new UInt32(Field((1n << 32n) - 1n));
  }

  /**
   * Integer division with remainder.
   *
   * `x.divMod(y)` returns the quotient and the remainder.
   */
  divMod(y: UInt32 | number | string) {
    let x = this.value;
    let y_ = UInt32.from(y).value;

    if (x.isConstant() && y_.isConstant()) {
      let xn = x.toBigInt();
      let yn = y_.toBigInt();
      let q = xn / yn;
      let r = xn - q * yn;
      return {
        quotient: new UInt32(new Field(q.toString())),
        rest: new UInt32(new Field(r.toString())),
      };
    }

    y_ = y_.seal();

    let q = Provable.witness(
      Field,
      () => new Field(x.toBigInt() / y_.toBigInt())
    );

    q.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    r.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(r);

    let r_ = new UInt32(r);
    let q_ = new UInt32(q);

    r_.assertLessThan(new UInt32(y_));

    return { quotient: q_, rest: r_ };
  }
  /**
   * Integer division.
   *
   * `x.div(y)` returns the floor of `x / y`, that is, the greatest
   * `z` such that `x * y <= x`.
   *
   */
  div(y: UInt32 | number) {
    return this.divMod(y).quotient;
  }
  /**
   * Integer remainder.
   *
   * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
   * `x - z` is divisble by `y`.
   */
  mod(y: UInt32 | number) {
    return this.divMod(y).rest;
  }
  /**
   * Multiplication with overflow checking.
   */
  mul(y: UInt32 | number) {
    let z = this.value.mul(UInt32.from(y).value);
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }
  /**
   * Addition with overflow checking.
   */
  add(y: UInt32 | number) {
    let z = this.value.add(UInt32.from(y).value);
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }
  /**
   * Subtraction with underflow checking.
   */
  sub(y: UInt32 | number) {
    let z = this.value.sub(UInt32.from(y).value);
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }
  /**
   * @deprecated Use {@link lessThanOrEqual} instead.
   *
   * Checks if a {@link UInt32} is less than or equal to another one.
   */
  lte(y: UInt32) {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    } else {
      let xMinusY = this.value.sub(y.value).seal();
      let yMinusX = xMinusY.neg();
      let xMinusYFits = xMinusY
        .rangeCheckHelper(UInt32.NUM_BITS)
        .equals(xMinusY);
      let yMinusXFits = yMinusX
        .rangeCheckHelper(UInt32.NUM_BITS)
        .equals(yMinusX);
      xMinusYFits.or(yMinusXFits).assertEquals(true);
      // x <= y if y - x fits in 64 bits
      return yMinusXFits;
    }
  }

  /**
   * Checks if a {@link UInt32} is less than or equal to another one.
   */
  lessThanOrEqual(y: UInt32) {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    } else {
      let xMinusY = this.value.sub(y.value).seal();
      let yMinusX = xMinusY.neg();
      let xMinusYFits = xMinusY
        .rangeCheckHelper(UInt32.NUM_BITS)
        .equals(xMinusY);
      let yMinusXFits = yMinusX
        .rangeCheckHelper(UInt32.NUM_BITS)
        .equals(yMinusX);
      xMinusYFits.or(yMinusXFits).assertEquals(true);
      // x <= y if y - x fits in 64 bits
      return yMinusXFits;
    }
  }

  /**
   * @deprecated Use {@link assertLessThanOrEqual} instead.
   *
   * Asserts that a {@link UInt32} is less than or equal to another one.
   */
  assertLte(y: UInt32, message?: string) {
    this.assertLessThanOrEqual(y, message);
  }

  /**
   * Asserts that a {@link UInt32} is less than or equal to another one.
   */
  assertLessThanOrEqual(y: UInt32, message?: string) {
    if (this.value.isConstant() && y.value.isConstant()) {
      let x0 = this.value.toBigInt();
      let y0 = y.value.toBigInt();
      if (x0 > y0) {
        if (message !== undefined) throw Error(message);
        throw Error(`UInt32.assertLessThanOrEqual: expected ${x0} <= ${y0}`);
      }
      return;
    }
    let yMinusX = y.value.sub(this.value).seal();
    yMinusX.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(yMinusX, message);
  }

  /**
   * @deprecated Use {@link lessThan} instead.
   *
   * Checks if a {@link UInt32} is less than another one.
   */
  lt(y: UInt32) {
    return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
  }

  /**
   * Checks if a {@link UInt32} is less than another one.
   */
  lessThan(y: UInt32) {
    return this.lessThanOrEqual(y).and(this.value.equals(y.value).not());
  }

  /**
   * @deprecated Use {@link assertLessThan} instead.
   *
   * Asserts that a {@link UInt32} is less than another one.
   */
  assertLt(y: UInt32, message?: string) {
    this.lessThan(y).assertEquals(true, message);
  }

  /**
   * Asserts that a {@link UInt32} is less than another one.
   */
  assertLessThan(y: UInt32, message?: string) {
    this.lessThan(y).assertEquals(true, message);
  }

  /**
   * @deprecated Use {@link greaterThan} instead.
   *
   * Checks if a {@link UInt32} is greater than another one.
   */
  gt(y: UInt32) {
    return y.lessThan(this);
  }

  /**
   * Checks if a {@link UInt32} is greater than another one.
   */
  greaterThan(y: UInt32) {
    return y.lessThan(this);
  }

  /**
   * @deprecated Use {@link assertGreaterThan} instead.
   *
   * Asserts that a {@link UInt32} is greater than another one.
   */
  assertGt(y: UInt32, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * Asserts that a {@link UInt32} is greater than another one.
   */
  assertGreaterThan(y: UInt32, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * @deprecated Use {@link greaterThanOrEqual} instead.
   *
   * Checks if a {@link UInt32} is greater than or equal to another one.
   */
  gte(y: UInt32) {
    return this.lessThan(y).not();
  }

  /**
   * Checks if a {@link UInt32} is greater than or equal to another one.
   */
  greaterThanOrEqual(y: UInt32) {
    return this.lessThan(y).not();
  }

  /**
   * @deprecated Use {@link assertGreaterThanOrEqual} instead.

   * 
   * Asserts that a {@link UInt32} is greater than or equal to another one.
   */
  assertGte(y: UInt32, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }

  /**
   * Asserts that a {@link UInt32} is greater than or equal to another one.
   */
  assertGreaterThanOrEqual(y: UInt32, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }
}

class Sign extends CircuitValue {
  @prop value: Field; // +/- 1

  static get one() {
    return new Sign(Field(1));
  }
  static get minusOne() {
    return new Sign(Field(-1));
  }
  static check(x: Sign) {
    // x^2 === 1  <=>  x === 1 or x === -1
    x.value.square().assertEquals(Field(1));
  }
  static empty<T extends AnyConstructor>(): InstanceType<T> {
    return Sign.one as any;
  }
  static toInput(x: Sign): HashInput {
    return { packed: [[x.isPositive().toField(), 1]] };
  }
  static toJSON(x: Sign) {
    if (x.toString() === '1') return 'Positive';
    if (x.neg().toString() === '1') return 'Negative';
    throw Error(`Invalid Sign: ${x}`);
  }
  static fromJSON<T extends AnyConstructor>(
    x: 'Positive' | 'Negative'
  ): InstanceType<T> {
    return (x === 'Positive' ? new Sign(Field(1)) : new Sign(Field(-1))) as any;
  }
  neg() {
    return new Sign(this.value.neg());
  }
  mul(y: Sign) {
    return new Sign(this.value.mul(y.value));
  }
  isPositive() {
    return this.value.equals(Field(1));
  }
  toString() {
    return this.value.toString();
  }
}

type BalanceChange = Types.AccountUpdate['body']['balanceChange'];

/**
 * A 64 bit signed integer with values ranging from -18,446,744,073,709,551,615 to 18,446,744,073,709,551,615.
 */
class Int64 extends CircuitValue implements BalanceChange {
  // * in the range [-2^64+1, 2^64-1], unlike a normal int64
  // * under- and overflowing is disallowed, similar to UInt64, unlike a normal int64+

  @prop magnitude: UInt64; // absolute value
  @prop sgn: Sign; // +/- 1

  // Some thoughts regarding the representation as field elements:
  // toFields returns the in-circuit representation, so the main objective is to minimize the number of constraints
  // that result from this representation. Therefore, I think the only candidate for an efficient 1-field representation
  // is the one where the Int64 is the field: toFields = Int64 => [Int64.magnitude.mul(Int64.sign)]. Anything else involving
  // bit packing would just lead to very inefficient circuit operations.
  //
  // So, is magnitude * sign ("1-field") a more efficient representation than (magnitude, sign) ("2-field")?
  // Several common operations like add, mul, etc, operate on 1-field so in 2-field they result in one additional multiplication
  // constraint per operand. However, the check operation (constraining to 64 bits + a sign) which is called at the introduction
  // of every witness, and also at the end of add, mul, etc, operates on 2-field. So here, the 1-field representation needs
  // to add an additional magnitude * sign = Int64 multiplication constraint, which will typically cancel out most of the gains
  // achieved by 1-field elsewhere.
  // There are some notable operations for which 2-field is definitely better:
  //
  // * div and mod (which do integer division with rounding on the magnitude)
  // * converting the Int64 to a Currency.Amount.Signed (for the zkapp balance), which has the exact same (magnitude, sign) representation we use here.
  //
  // The second point is one of the main things an Int64 is used for, and was the original motivation to use 2 fields.
  // Overall, I think the existing implementation is the optimal one.

  constructor(magnitude: UInt64, sgn = Sign.one) {
    super(magnitude, sgn);
  }

  /**
   * Creates a new {@link Int64} from a {@link Field}.
   *
   * Does check if the {@link Field} is within range.
   */
  private static fromFieldUnchecked(x: Field) {
    let TWO64 = 1n << 64n;
    let xBigInt = x.toBigInt();
    let isValidPositive = xBigInt < TWO64; // covers {0,...,2^64 - 1}
    let isValidNegative = Field.ORDER - xBigInt < TWO64; // {-2^64 + 1,...,-1}
    if (!isValidPositive && !isValidNegative)
      throw Error(`Int64: Expected a value between (-2^64, 2^64), got ${x}`);
    let magnitude = Field(isValidPositive ? x.toString() : x.neg().toString());
    let sign = isValidPositive ? Sign.one : Sign.minusOne;
    return new Int64(new UInt64(magnitude), sign);
  }

  // this doesn't check ranges because we assume they're already checked on UInts
  /**
   * Creates a new {@link Int64} from a {@link Field}.
   *
   * **Does not** check if the {@link Field} is within range.
   */
  static fromUnsigned(x: UInt64 | UInt32) {
    return new Int64(x instanceof UInt32 ? x.toUInt64() : x);
  }

  // this checks the range if the argument is a constant
  /**
   * Creates a new {@link Int64}.
   *
   * Check the range if the argument is a constant.
   */
  static from(x: Int64 | UInt32 | UInt64 | Field | number | string | bigint) {
    if (x instanceof Int64) return x;
    if (x instanceof UInt64 || x instanceof UInt32) {
      return Int64.fromUnsigned(x);
    }
    return Int64.fromFieldUnchecked(Field(x));
  }
  /**
   * Turns the {@link Int64} into a string.
   */
  toString() {
    let abs = this.magnitude.toString();
    let sgn = this.isPositive().toBoolean() || abs === '0' ? '' : '-';
    return sgn + abs;
  }
  isConstant() {
    return this.magnitude.value.isConstant() && this.sgn.isConstant();
  }

  // --- circuit-compatible operations below ---
  // the assumption here is that all Int64 values that appear in a circuit are already checked as valid
  // this is because Provable.witness calls .check, which calls .check on each prop, i.e. UInt64 and Sign
  // so we only have to do additional checks if an operation on valid inputs can have an invalid outcome (example: overflow)
  /**
   * Static method to create a {@link Int64} with value `0`.
   */
  static get zero() {
    return new Int64(UInt64.zero);
  }
  /**
   * Static method to create a {@link Int64} with value `1`.
   */
  static get one() {
    return new Int64(UInt64.one);
  }
  /**
   * Static method to create a {@link Int64} with value `-1`.
   */
  static get minusOne() {
    return new Int64(UInt64.one).neg();
  }

  /**
   * Returns the {@link Field} value.
   */
  toField() {
    return this.magnitude.value.mul(this.sgn.value);
  }
  /**
   * Static method to create a {@link Int64} from a {@link Field}.
   */
  static fromField(x: Field): Int64 {
    // constant case - just return unchecked value
    if (x.isConstant()) return Int64.fromFieldUnchecked(x);
    // variable case - create a new checked witness and prove consistency with original field
    let xInt = Provable.witness(Int64, () => Int64.fromFieldUnchecked(x));
    xInt.toField().assertEquals(x); // sign(x) * |x| === x
    return xInt;
  }

  /**
   * Negates the value.
   *
   * `Int64.from(5).neg()` will turn into `Int64.from(-5)`
   */
  neg() {
    // doesn't need further check if `this` is valid
    return new Int64(this.magnitude, this.sgn.neg());
  }
  /**
   * Addition with overflow checking.
   */
  add(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return Int64.fromField(this.toField().add(y_.toField()));
  }
  /**
   * Subtraction with underflow checking.
   */
  sub(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return Int64.fromField(this.toField().sub(y_.toField()));
  }
  /**
   * Multiplication with overflow checking.
   */
  mul(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return Int64.fromField(this.toField().mul(y_.toField()));
  }
  /**
   * Integer division.
   *
   * `x.div(y)` returns the floor of `x / y`, that is, the greatest
   * `z` such that `z * y <= x`.
   *
   */
  div(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    let { quotient } = this.magnitude.divMod(y_.magnitude);
    let sign = this.sgn.mul(y_.sgn);
    return new Int64(quotient, sign);
  }
  /**
   * Integer remainder.
   *
   * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
   * `x - z` is divisble by `y`.
   */
  mod(y: UInt64 | number | string | bigint | UInt32) {
    let y_ = UInt64.from(y);
    let rest = this.magnitude.divMod(y_).rest.value;
    rest = Provable.if(this.isPositive(), rest, y_.value.sub(rest));
    return new Int64(new UInt64(rest));
  }

  /**
   * Checks if two values are equal.
   */
  equals(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return this.toField().equals(y_.toField());
  }
  /**
   * Asserts that two values are equal.
   */
  assertEquals(
    y: Int64 | number | string | bigint | UInt64 | UInt32,
    message?: string
  ) {
    let y_ = Int64.from(y);
    this.toField().assertEquals(y_.toField(), message);
  }
  /**
   * Checks if the value is postive.
   */
  isPositive() {
    return this.sgn.isPositive();
  }
}

/**
 * A 8 bit unsigned integer with values ranging from 0 to 255.
 */
class UInt8 extends Struct({
  value: Field,
}) {
  static NUM_BITS = 8;

  /**
   * Coerce anything "field-like" (bigint, number, string, and {@link Field}) to a {@link UInt8}.
   * The max value of a {@link UInt8} is `2^8 - 1 = 255`.
   *
   * **Warning**: Cannot overflow past 255, an error is thrown if the result is greater than 255.
   */
  constructor(x: number | bigint | string | Field | UInt8) {
    if (x instanceof UInt8) x = x.value;
    super({ value: Field(x) });
    UInt8.checkConstant(this.value);
  }

  /**
   * Add a {@link UInt8} value to another {@link UInt8} element.
   *
   * @example
   * ```ts
   * const x = UInt8.from(3);
   * const sum = x.add(UInt8.from(5));
   *
   * sum.assertEquals(UInt8.from(8));
   * ```
   *
   * **Warning**: This operation cannot overflow past 255, an error is thrown if the result is greater than 255.
   *
   * @param value - a {@link UInt8} value to add to the {@link UInt8}.
   *
   * @return A {@link UInt8} element that is the sum of the two values.
   */
  add(value: UInt8 | number) {
    return UInt8.from(this.value.add(UInt8.from(value).value));
  }

  /**
   * Subtract a {@link UInt8} value by another {@link UInt8} element.
   *
   * @example
   * ```ts
   * const x = UInt8.from(8);
   * const difference = x.sub(UInt8.from(5));
   *
   * difference.assertEquals(UInt8.from(3));
   * ```
   *
   * @param value - a {@link UInt8} value to subtract from the {@link UInt8}.
   *
   * @return A {@link UInt8} element that is the difference of the two values.
   */
  sub(value: UInt8 | number) {
    return UInt8.from(this.value.sub(UInt8.from(value).value));
  }

  /**
   * Multiply a {@link UInt8} value by another {@link UInt8} element.
   *
   * @example
   * ```ts
   * const x = UInt8.from(3);
   * const product = x.mul(UInt8.from(5));
   *
   * product.assertEquals(UInt8.from(15));
   * ```
   *
   * **Warning**: This operation cannot overflow past 255, an error is thrown if the result is greater than 255.
   *
   * @param value - a {@link UInt8} value to multiply with the {@link UInt8}.
   *
   * @return A {@link UInt8} element that is the product of the two values.
   */
  mul(value: UInt8 | number) {
    return UInt8.from(this.value.mul(UInt8.from(value).value));
  }

  /**
   * Divide a {@link UInt8} value by another {@link UInt8} element.
   *
   * Proves that the denominator is non-zero, or throws a "Division by zero" error.
   *
   * @example
   * ```ts
   * const x = UInt8.from(6);
   * const quotient = x.div(UInt8.from(3));
   *
   * quotient.assertEquals(UInt8.from(2));
   * ```
   *
   * @param value - a {@link UInt8} value to divide with the {@link UInt8}.
   *
   * @return A {@link UInt8} element that is the division of the two values.
   */
  div(value: UInt8 | number) {
    return this.divMod(value).quotient;
  }

  /**
   * Get the remainder a {@link UInt8} value of division of another {@link UInt8} element.
   *
   * @example
   * ```ts
   * const x = UInt8.from(50);
   * const mod = x.mod(UInt8.from(30));
   *
   * mod.assertEquals(UInt8.from(18));
   * ```
   *
   * @param value - a {@link UInt8} to get the modulus with another {@link UInt8}.
   *
   * @return A {@link UInt8} element that is the modulus of the two values.
   */
  mod(value: UInt8 | number) {
    return this.divMod(value).rest;
  }

  /**
   * Get the quotient and remainder of a {@link UInt8} value divided by another {@link UInt8} element.
   *
   * @param value - a {@link UInt8} to get the quotient and remainder of another {@link UInt8}.
   *
   * @return The quotient and remainder of the two values.
   */
  divMod(value: UInt8 | number) {
    let x = this.value;
    let y_ = UInt8.from(value).value;

    if (this.value.isConstant() && y_.isConstant()) {
      let xn = x.toBigInt();
      let yn = y_.toBigInt();
      let q = xn / yn;
      let r = xn - q * yn;
      return {
        quotient: UInt8.from(Field(q)),
        rest: UInt8.from(Field(r)),
      };
    }

    y_ = y_.seal();
    let q = Provable.witness(
      Field,
      () => new Field(x.toBigInt() / y_.toBigInt())
    );

    // TODO: Enable when rangeCheck works in proofs
    // UInt8.#rangeCheck(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();

    // TODO: Enable when rangeCheck works in proofs
    // UInt8.#rangeCheck(r);

    let r_ = UInt8.from(r);
    let q_ = UInt8.from(q);

    r_.assertLessThan(UInt8.from(y_));
    return { quotient: q_, rest: r_ };
  }

  /**
   * Check if this {@link UInt8} is less than or equal to another {@link UInt8} value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * UInt8.from(3).lessThanOrEqual(UInt8.from(5)).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods only support UInt8 elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   *
   * @param y - the {@link UInt8} value to compare with this {@link UInt8}.
   *
   * @return A {@link Bool} representing if this {@link UInt8} is less than or equal another {@link UInt8} value.
   */
  lessThanOrEqual(y: UInt8): Bool {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() <= y.value.toBigInt());
    }
    throw Error('Not implemented');
  }

  /**
   * Check if this {@link UInt8} is less than another {@link UInt8} value.
   * Returns a {@link Bool}, which is a provable type and can be used prove to the validity of this statement.
   *
   * @example
   * ```ts
   * UInt8.from(2).lessThan(UInt8.from(3)).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods only support UInt8 elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   * @param y - the {@link UInt8} value to compare with this {@link UInt8}.
   *
   * @return A {@link Bool} representing if this {@link UInt8} is less than another {@link UInt8} value.
   */
  lessThan(y: UInt8): Bool {
    if (this.value.isConstant() && y.value.isConstant()) {
      return Bool(this.value.toBigInt() < y.value.toBigInt());
    }
    throw Error('Not implemented');
  }

  /**
   * Assert that this {@link UInt8} is less than another {@link UInt8} value.
   * Calling this function is equivalent to `UInt8(...).lessThan(...).assertEquals(Bool(true))`.
   * See {@link UInt8.lessThan} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support UInt8 elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThan(y: UInt8, message?: string) {
    if (this.value.isConstant() && y.value.isConstant()) {
      let x0 = this.value.toBigInt();
      let y0 = y.value.toBigInt();
      if (x0 >= y0) {
        if (message !== undefined) throw Error(message);
        throw Error(`UInt8.assertLessThan: expected ${x0} < ${y0}`);
      }
      return;
    }
    // x < y  <=>  x + 1 <= y
    let xPlus1 = new UInt8(this.value.add(1));
    xPlus1.assertLessThanOrEqual(y, message);
  }

  /**
   * Assert that this {@link UInt8} is less than or equal to another {@link UInt8} value.
   * Calling this function is equivalent to `UInt8(...).lessThanOrEqual(...).assertEquals(Bool(true))`.
   * See {@link UInt8.lessThanOrEqual} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support UInt8 elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThanOrEqual(y: UInt8, message?: string) {
    if (this.value.isConstant() && y.value.isConstant()) {
      let x0 = this.value.toBigInt();
      let y0 = y.value.toBigInt();
      if (x0 > y0) {
        if (message !== undefined) throw Error(message);
        throw Error(`UInt8.assertLessThanOrEqual: expected ${x0} <= ${y0}`);
      }
      return;
    }
    try {
      // x <= y  <=>  y - x >= 0  <=>  y - x in [0, 2^8)
      let yMinusX = y.value.sub(this.value).seal();
      Gadgets.rangeCheck8(yMinusX);
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Check if this {@link UInt8} is greater than another {@link UInt8} value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * UInt8.from(5).greaterThan(UInt8.from(3)).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods currently only support Field elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   * @param y - the {@link UInt8} value to compare with this {@link UInt8}.
   *
   * @return A {@link Bool} representing if this {@link UInt8} is greater than another {@link UInt8} value.
   */
  greaterThan(y: UInt8) {
    return y.lessThan(this);
  }

  /**
   * Check if this {@link UInt8} is greater than or equal another {@link UInt8} value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * UInt8.from(3).greaterThanOrEqual(UInt8.from(3)).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods only support UInt8 elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   * @param y - the {@link UInt8} value to compare with this {@link Field}.
   *
   * @return A {@link Bool} representing if this {@link UInt8} is greater than or equal another {@link UInt8} value.
   */
  greaterThanOrEqual(y: UInt8) {
    return this.lessThan(y).not();
  }

  /**
   * Assert that this {@link UInt8} is greater than another {@link UInt8} value.
   * Calling this function is equivalent to `UInt8(...).greaterThan(...).assertEquals(Bool(true))`.
   * See {@link UInt8.greaterThan} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support UInt8 elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThan(y: UInt8, message?: string) {
    y.assertLessThan(this, message);
  }

  /**
   * Assert that this {@link UInt8} is greater than or equal to another {@link UInt8} value.
   * Calling this function is equivalent to `UInt8(...).greaterThanOrEqual(...).assertEquals(Bool(true))`.
   * See {@link UInt8.greaterThanOrEqual} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support UInt8 elements of size <= 8 bits in provable code.
   * The method will throw if one of the inputs exceeds 8 bits.
   *
   * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThanOrEqual(y: UInt8, message?: string) {
    y.assertLessThanOrEqual(this, message);
  }

  /**
   * Assert that this {@link UInt8} is equal another {@link UInt8} value.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * @param y - the {@link UInt8} value to compare & assert with this {@link UInt8}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertEquals(y: number | bigint | UInt8, message?: string) {
    let y_ = new UInt8(y);
    this.toField().assertEquals(y_.toField(), message);
  }

  /**
   * Serialize the {@link UInt8} to a string, e.g. for printing.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the {@link UInt8}. Use the operation only during debugging.
   *
   * @example
   * ```ts
   * const someUInt8 = UInt8.from(42);
   * console.log(someUInt8 .toString());
   * ```
   *
   * @return A string equivalent to the string representation of the {@link UInt8}.
   */
  toString() {
    return this.value.toString();
  }

  /**
   * Serialize the {@link UInt8} to a bigint, e.g. for printing.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the bigint representation of the {@link UInt8}. Use the operation only during debugging.
   *
   * @example
   * ```ts
   * const someUInt8 = UInt8.from(42);
   * console.log(someUInt8.toBigInt());
   * ```
   *
   * @return A bigint equivalent to the bigint representation of the {@link UInt8}.
   */
  toBigInt() {
    return this.value.toBigInt();
  }

  /**
   * Serialize the {@link UInt8} to a {@link Field}.
   *
   * @example
   * ```ts
   * const someUInt8 = UInt8.from(42);
   * console.log(someUInt8.toField());
   * ```
   *
   * @return A {@link Field} equivalent to the bigint representation of the {@link UInt8}.
   */
  toField() {
    return this.value;
  }

  /**
   * This function is the implementation of {@link Provable.check} in {@link UInt8} type.
   *
   * This function is called by {@link Provable.check} to check if the {@link UInt8} is valid.
   * To check if a {@link UInt8} is valid, we need to check if the value fits in {@link UInt8.NUM_BITS} bits.
   *
   * @param value - the {@link UInt8} element to check.
   */
  static check(x: { value: Field }) {
    Gadgets.rangeCheck8(x.value);
  }

  /**
   * Serialize the {@link UInt8} to a JSON string, e.g. for printing.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the JSON string representation of the {@link UInt8}. Use the operation only during debugging.
   *
   * @example
   * ```ts
   * const someUInt8 = UInt8.from(42);
   * console.log(someUInt8 .toJSON());
   * ```
   *
   * @return A string equivalent to the JSON representation of the {@link Field}.
   */
  toJSON(): string {
    return this.value.toString();
  }

  /**
   * Turns a {@link UInt8} into a {@link UInt32}.
   *
   * @example
   * ```ts
   * const someUInt8 = UInt8.from(42);
   * const someUInt32 = someUInt8.toUInt32();
   * ```
   *
   * @return A {@link UInt32} equivalent to the {@link UInt8}.
   */
  toUInt32(): UInt32 {
    return new UInt32(this.value);
  }

  /**
   * Turns a {@link UInt8} into a {@link UInt64}.
   *
   * @example
   * ```ts
   * const someUInt8 = UInt8.from(42);
   * const someUInt64 = someUInt8.toUInt64();
   * ```
   *
   * @return A {@link UInt64} equivalent to the {@link UInt8}.
   * */
  toUInt64(): UInt64 {
    return new UInt64(this.value);
  }

  /**
   * Check whether this {@link UInt8} element is a hard-coded constant in the constraint system.
   * If a {@link UInt8} is constructed outside a zkApp method, it is a constant.
   *
   * @example
   * ```ts
   * console.log(UInt8.from(42).isConstant()); // true
   * ```
   *
   * @example
   * ```ts
   * \@method myMethod(x: UInt8) {
   *    console.log(x.isConstant()); // false
   * }
   * ```
   *
   * @return A `boolean` showing if this {@link UInt8} is a constant or not.
   */
  isConstant() {
    return this.value.isConstant();
  }

  // TODO: these might be better on a separate `Bytes` class
  static fromHex(xs: string): UInt8[] {
    let bytes = chunkString(xs, 2).map((s) => parseInt(s, 16));
    return bytes.map(UInt8.from);
  }
  static toHex(xs: UInt8[]): string {
    return xs.map((x) => x.toBigInt().toString(16).padStart(2, '0')).join('');
  }

  /**
   * Creates a {@link UInt8} with a value of 255.
   */
  static MAXINT() {
    return new UInt8(Field((1n << BigInt(UInt8.NUM_BITS)) - 1n));
  }

  /**
   * Creates a new {@link UInt8}.
   */
  static from(x: UInt8 | UInt64 | UInt32 | Field | number | bigint) {
    if (x instanceof UInt64 || x instanceof UInt32 || x instanceof UInt8)
      x = x.value;
    return new UInt8(UInt8.checkConstant(Field(x)));
  }

  private static checkConstant(x: Field) {
    if (!x.isConstant()) return x;
    Gadgets.rangeCheck8(x);
    return x;
  }
}
