import { Circuit, Field, Bool } from '../snarky.js';
import { AnyConstructor, CircuitValue, prop } from './circuit_value.js';
import { Types } from '../provable/types.js';
import { HashInput } from './hash.js';

// external API
export { UInt32, UInt64, Int64, Sign };

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

    let q = Circuit.witness(
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
    let yMinusX = Circuit.inCheckedComputation()
      ? y.value.sub(this.value).seal()
      : y.value.sub(this.value);

    yMinusX.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(yMinusX, message);
  }

  /**
   * Asserts that a {@link UInt64} is less than or equal to another one.
   */
  assertLessThanOrEqual(y: UInt64, message?: string) {
    let yMinusX = Circuit.inCheckedComputation()
      ? y.value.sub(this.value).seal()
      : y.value.sub(this.value);

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

    let q = Circuit.witness(
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
    let yMinusX = Circuit.inCheckedComputation()
      ? y.value.sub(this.value).seal()
      : y.value.sub(this.value);

    yMinusX.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(yMinusX, message);
  }

  /**
   * Asserts that a {@link UInt32} is less than or equal to another one.
   */
  assertLessThanOrEqual(y: UInt32, message?: string) {
    let yMinusX = Circuit.inCheckedComputation()
      ? y.value.sub(this.value).seal()
      : y.value.sub(this.value);

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
    // x^2 == 1  <=>  x == 1 or x == -1
    x.value.square().assertEquals(Field(1));
  }
  static emptyValue(): Sign {
    return Sign.one;
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
  // this is because Circuit.witness calls .check, which calls .check on each prop, i.e. UInt64 and Sign
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
    let xInt = Circuit.witness(Int64, () => Int64.fromFieldUnchecked(x));
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
    rest = Circuit.if(this.isPositive(), rest, y_.value.sub(rest));
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
