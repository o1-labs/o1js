import { Circuit, Field, Types } from '../snarky';
import { CircuitValue, prop } from './circuit_value';

export { UInt32, UInt64, Int64 };

class UInt64 extends CircuitValue implements Types.UInt64 {
  @prop value: Field;
  static NUM_BITS = 64;
  _type?: 'UInt64';

  constructor(value: Field) {
    super();
    this.value = value;
  }

  static get zero() {
    return new UInt64(Field.zero);
  }

  static get one() {
    return new UInt64(Field.one);
  }

  toString() {
    return this.value.toString();
  }

  static check(x: Types.UInt64) {
    let actual = x.value.rangeCheckHelper(64);
    actual.assertEquals(x.value);
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
  static from(x: UInt64 | UInt32 | Field | number | string | bigint) {
    if (x instanceof UInt64 || x instanceof UInt32) x = x.value;
    return new this(this.checkConstant(Field(x)));
  }
  static fromNumber(x: number) {
    return this.from(x);
  }
  static fromString(x: string) {
    return this.from(x);
  }
  static fromBigInt(x: bigint) {
    return this.from(x);
  }

  static MAXINT() {
    return new UInt64(Field((1n << 64n) - 1n));
  }

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

    r_.assertLt(new UInt64(y_));

    return { quotient: q_, rest: r_ };
  }

  /**
   * Integer division.
   *
   * `x.div(y)` returns the floor of `x / y`, that is, the greatest
   * `z` such that `x * y <= x`.
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

  lte(y: UInt64) {
    let xMinusY = this.value.sub(y.value).seal();
    let xMinusYFits = xMinusY.rangeCheckHelper(UInt64.NUM_BITS).equals(xMinusY);
    let yMinusXFits = xMinusY
      .rangeCheckHelper(UInt64.NUM_BITS)
      .equals(xMinusY.neg());
    xMinusYFits.or(yMinusXFits).assertEquals(true);
    // x <= y if y - x fits in 64 bits
    return yMinusXFits;
  }

  assertLte(y: UInt64) {
    let yMinusX = y.value.sub(this.value).seal();
    yMinusX.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(yMinusX);
  }

  lt(y: UInt64) {
    return this.lte(y).and(this.value.equals(y.value).not());
  }

  assertLt(y: UInt64) {
    this.lt(y).assertEquals(true);
  }

  gt(y: UInt64) {
    return y.lt(this);
  }

  assertGt(y: UInt64) {
    y.assertLt(this);
  }
}

class UInt32 extends CircuitValue implements Types.UInt32 {
  @prop value: Field;
  static NUM_BITS = 32;
  _type?: 'UInt32';

  constructor(value: Field) {
    super();
    this.value = value;
  }

  static get zero(): UInt32 {
    return new UInt32(Field.zero);
  }

  static get one(): UInt32 {
    return new UInt32(Field.one);
  }

  toString(): string {
    return this.value.toString();
  }

  toUInt64(): UInt64 {
    // this is safe, because the UInt32 range is included in the UInt64 range
    return new UInt64(this.value);
  }

  static check(x: Types.UInt32) {
    let actual = x.value.rangeCheckHelper(32);
    actual.assertEquals(x.value);
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
  static from(x: UInt32 | Field | number | string | bigint) {
    if (x instanceof UInt32) x = x.value;
    return new this(this.checkConstant(Field(x)));
  }
  static fromNumber(x: number) {
    return this.from(x);
  }
  static fromString(x: string) {
    return this.from(x);
  }
  static fromBigInt(x: bigint) {
    return this.from(x);
  }

  static MAXINT() {
    return new UInt32(Field((1n << 32n) - 1n));
  }

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

    r_.assertLt(new UInt32(y_));

    return { quotient: q_, rest: r_ };
  }

  div(y: UInt32 | number) {
    return this.divMod(y).quotient;
  }

  mod(y: UInt32 | number) {
    return this.divMod(y).rest;
  }

  mul(y: UInt32 | number) {
    let z = this.value.mul(UInt32.from(y).value);
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }

  add(y: UInt32 | number) {
    let z = this.value.add(UInt32.from(y).value);
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }

  sub(y: UInt32 | number) {
    let z = this.value.sub(UInt32.from(y).value);
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }

  lte(y: UInt32) {
    let xMinusY = this.value.sub(y.value).seal();
    let xMinusYFits = xMinusY.rangeCheckHelper(UInt32.NUM_BITS).equals(xMinusY);
    let yMinusXFits = xMinusY
      .rangeCheckHelper(UInt32.NUM_BITS)
      .equals(xMinusY.neg());
    xMinusYFits.or(yMinusXFits).assertEquals(true);
    // x <= y if y - x fits in 32 bits
    return yMinusXFits;
  }

  assertLte(y: UInt32) {
    let yMinusX = y.value.sub(this.value).seal();
    yMinusX.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(yMinusX);
  }

  lt(y: UInt32) {
    return this.lte(y).and(this.value.equals(y.value).not());
  }

  assertLt(y: UInt32) {
    this.lt(y).assertEquals(true);
  }

  gt(y: UInt32) {
    return y.lt(this);
  }

  assertGt(y: UInt32) {
    y.assertLt(this);
  }
}

type BalanceChange = Types.Party['body']['balanceChange'];

class Int64 extends CircuitValue implements BalanceChange {
  // * in the range [-2^64+1, 2^64-1], unlike a normal int64
  // * under- and overflowing is disallowed, similar to UInt64, unlike a normal int64+

  @prop magnitude: UInt64; // absolute value
  @prop sgn: Field; // +/- 1

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

  constructor(magnitude: UInt64, sgn = Field.one) {
    super();
    this.magnitude = magnitude;
    this.sgn = sgn;
  }

  private static fromFieldUnchecked(x: Field) {
    let TWO64 = 1n << 64n;
    let xBigInt = x.toBigInt();
    let isValidPositive = xBigInt < TWO64; // covers {0,...,2^64 - 1}
    let isValidNegative = Field.ORDER - xBigInt < TWO64; // {-2^64 + 1,...,-1}
    if (!isValidPositive && !isValidNegative)
      throw Error(`Int64: Expected a value between (-2^64, 2^64), got ${x}`);
    let magnitude = Field(isValidPositive ? x.toString() : x.neg().toString());
    let sign = isValidPositive ? Field.one : Field.minusOne;
    return new Int64(new UInt64(magnitude), sign);
  }

  // this doesn't check ranges because we assume they're already checked on UInts
  static fromUnsigned(x: UInt64 | UInt32) {
    return new Int64(x instanceof UInt32 ? x.toUInt64() : x);
  }

  // this checks the range if the argument is a constant
  static from(x: Int64 | UInt32 | UInt64 | Field | number | string | bigint) {
    if (x instanceof Int64) return x;
    if (x instanceof UInt64 || x instanceof UInt32) {
      return Int64.fromUnsigned(x);
    }
    return Int64.fromFieldUnchecked(Field(x));
  }
  static fromNumber(x: number) {
    return Int64.fromFieldUnchecked(Field(x));
  }
  static fromString(x: string) {
    return Int64.fromFieldUnchecked(Field(x));
  }
  static fromBigInt(x: bigint) {
    return Int64.fromFieldUnchecked(Field(x));
  }

  toString() {
    let abs = this.magnitude.toString();
    let sgn = this.sgn.equals(Field.one).toBoolean() || abs === '0' ? '' : '-';
    return sgn + abs;
  }

  isConstant() {
    return this.magnitude.value.isConstant() && this.sgn.isConstant();
  }

  // --- circuit-compatible operations below ---
  // the assumption here is that all Int64 values that appear in a circuit are already checked as valid
  // this is because Circuit.witness calls .check
  // so we only have to do additional checks if an operation on valid inputs can have an invalid outcome (example: overflow)

  static check(x: Int64) {
    UInt64.check(x.magnitude); // |x| < 2^64
    x.sgn.square().assertEquals(Field.one); // sign(x)^2 === 1
  }

  static get zero() {
    return new Int64(UInt64.zero);
  }
  static get one() {
    return new Int64(UInt64.one);
  }
  static get minusOne() {
    return new Int64(UInt64.one).neg();
  }

  toField() {
    return this.magnitude.value.mul(this.sgn);
  }

  static fromField(x: Field): Int64 {
    // constant case - just return unchecked value
    if (x.isConstant()) return Int64.fromFieldUnchecked(x);
    // variable case - create a new checked witness and prove consistency with original field
    let xInt = Circuit.witness(Int64, () => Int64.fromFieldUnchecked(x));
    xInt.toField().assertEquals(x); // sign(x) * |x| === x
    return xInt;
  }

  neg() {
    // doesn't need further check if `this` is valid
    return new Int64(this.magnitude, this.sgn.neg());
  }

  add(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return Int64.fromField(this.toField().add(y_.toField()));
  }
  sub(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return Int64.fromField(this.toField().sub(y_.toField()));
  }
  mul(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return Int64.fromField(this.toField().mul(y_.toField()));
  }
  div(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    let { quotient } = this.magnitude.divMod(y_.magnitude);
    let sign = this.sgn.mul(y_.sgn);
    return new Int64(quotient, sign);
  }
  mod(y: UInt64 | number | string | bigint | UInt32) {
    let y_ = UInt64.from(y);
    let rest = this.magnitude.divMod(y_).rest.value;
    rest = Circuit.if(this.isPositive(), rest, y_.value.sub(rest));
    return new Int64(new UInt64(rest));
  }

  equals(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    return this.toField().equals(y_.toField());
  }
  assertEquals(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = Int64.from(y);
    this.toField().assertEquals(y_.toField());
  }
  isPositive() {
    return this.sgn.equals(Field.one);
  }
}
