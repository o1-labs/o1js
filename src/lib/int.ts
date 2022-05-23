import { Bool, Circuit, Field } from '../snarky';
import { CircuitValue, prop } from './circuit_value';

export { UInt32, UInt64, Int64 };

class UInt64 extends CircuitValue {
  @prop value: Field;

  constructor(value: Field) {
    super();
    this.value = value;
  }

  static get zero(): UInt64 {
    return new UInt64(Field.zero);
  }

  static get one(): UInt64 {
    return new UInt64(Field.one);
  }

  toString(): string {
    return this.value.toString();
  }

  static check(x: UInt64) {
    let actual = x.value.rangeCheckHelper(64);
    actual.assertEquals(x.value);
  }

  static MAXINT(): UInt64 {
    return new UInt64(Field(((1n << 64n) - 1n).toString()));
  }

  static fromNumber(x: number): UInt64 {
    return new UInt64(argToField('UInt64.fromNumber', x));
  }

  static fromString(s: string) {
    return new UInt64(argToField('UInt64.fromString', s));
  }

  static NUM_BITS = 64;

  divMod(y: UInt64 | number | string): [UInt64, UInt64] {
    let x = this.value;
    let y_ = argToField('UInt64.div', y);

    if (this.value.isConstant() && y_.isConstant()) {
      let xn = BigInt(x.toString());
      let yn = BigInt(y_.toString());
      let q = xn / yn;
      let r = xn - q * yn;
      return [
        new UInt64(new Field(q.toString())),
        new UInt64(new Field(r.toString())),
      ];
    }

    y_ = y_.seal();

    let q = Circuit.witness(
      Field,
      () => new Field((BigInt(x.toString()) / BigInt(y_.toString())).toString())
    );

    q.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    r.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(r);

    let r_ = new UInt64(r);
    let q_ = new UInt64(q);

    r_.assertLt(new UInt64(y_));

    return [q_, r_];
  }

  /**
   * Integer division.
   *
   * `x.div(y)` returns the floor of `x / y`, that is, the greatest
   * `z` such that `x * y <= x`.
   *
   */
  div(y: UInt64 | number): UInt64 {
    return this.divMod(y)[0];
  }

  /**
   * Integer remainder.
   *
   * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
   * `x - z` is divisble by `y`.
   */
  mod(y: UInt64 | number): UInt64 {
    return this.divMod(y)[1];
  }

  /**
   * Multiplication with overflow checking.
   */
  mul(y: UInt64 | number): UInt64 {
    let z = this.value.mul(argToField('UInt64.mul', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  /**
   * Addition with overflow checking.
   */
  add(y: UInt64 | number): UInt64 {
    let z = this.value.add(argToField('UInt64.add', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  /**
   * Subtraction with underflow checking.
   */
  sub(y: UInt64 | number): UInt64 {
    let z = this.value.sub(argToField('UInt64.sub', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  lte(y: UInt64): Bool {
    let xMinusY = this.value.sub(argToField('UInt64.lte', y)).seal();
    let xMinusYFits = xMinusY.rangeCheckHelper(UInt64.NUM_BITS).equals(xMinusY);
    let yMinusXFits = xMinusY
      .rangeCheckHelper(UInt64.NUM_BITS)
      .equals(xMinusY.neg());
    xMinusYFits.or(yMinusXFits).assertEquals(true);
    // x <= y if y - x fits in 64 bits
    return yMinusXFits;
  }

  assertLte(y: UInt64) {
    let yMinusX = argToField('UInt64.lt', y).sub(this.value).seal();
    yMinusX.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(yMinusX);
  }

  lt(y: UInt64): Bool {
    return this.lte(y).and(this.value.equals(y.value).not());
  }

  assertLt(y: UInt64) {
    this.lt(y).assertEquals(true);
  }

  gt(y: UInt64): Bool {
    return y.lt(this);
  }

  assertGt(y: UInt64) {
    y.assertLt(this);
  }
}

class UInt32 extends CircuitValue {
  @prop value: Field;

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

  static check(x: UInt32) {
    let actual = x.value.rangeCheckHelper(32);
    actual.assertEquals(x.value);
  }

  static fromNumber(x: number): UInt32 {
    return new UInt32(argToField('UInt32.fromNumber', x));
  }

  static fromString(s: string) {
    return new UInt32(argToField('UInt32.fromString', s));
  }

  static NUM_BITS = 32;

  static MAXINT(): UInt32 {
    return new UInt32(Field.fromJSON(((1n << 32n) - 1n).toString()) as Field);
  }

  divMod(y: UInt32 | number): [UInt32, UInt32] {
    let x = this.value;
    let y_ = argToField('UInt32.div', y);

    if (this.value.isConstant() && y_.isConstant()) {
      let xn = BigInt(x.toString());
      let yn = BigInt(y_.toString());
      let q = xn / yn;
      let r = xn - q * yn;
      return [
        new UInt32(new Field(q.toString())),
        new UInt32(new Field(r.toString())),
      ];
    }

    y_ = y_.seal();

    let q = Circuit.witness(
      Field,
      () => new Field((BigInt(x.toString()) / BigInt(y_.toString())).toString())
    );

    q.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    r.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(r);

    let r_ = new UInt32(r);
    let q_ = new UInt32(q);

    r_.assertLt(new UInt32(y_));

    return [q_, r_];
  }

  div(y: UInt32 | number): UInt32 {
    const dm = this.divMod(y);
    return dm[0];
  }

  mod(y: UInt32 | number): UInt32 {
    return this.divMod(y)[1];
  }

  mul(y: UInt32 | number): UInt32 {
    let z = this.value.mul(argToField('UInt32.mul', y));
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }

  add(y: UInt32 | number): UInt32 {
    let z = this.value.add(argToField('UInt32.add', y));
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }

  sub(y: UInt32 | number): UInt32 {
    let z = this.value.sub(argToField('UInt32.sub', y));
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }

  lte(y: UInt32): Bool {
    let xMinusY = this.value.sub(argToField('UInt32.lte', y)).seal();
    let xMinusYFits = xMinusY.rangeCheckHelper(UInt32.NUM_BITS).equals(xMinusY);
    let yMinusXFits = xMinusY
      .rangeCheckHelper(UInt32.NUM_BITS)
      .equals(xMinusY.neg());
    xMinusYFits.or(yMinusXFits).assertEquals(true);
    // x <= y if y - x fits in 32 bits
    return yMinusXFits;
  }

  assertLte(y: UInt32) {
    let yMinusX = argToField('UInt32.lt', y).sub(this.value).seal();
    yMinusX.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(yMinusX);
  }

  lt(y: UInt32): Bool {
    return this.lte(y).and(this.value.equals(y.value).not());
  }

  assertLt(y: UInt32) {
    this.lt(y).assertEquals(true);
  }

  gt(y: UInt32): Bool {
    return y.lt(this);
  }

  assertGt(y: UInt32) {
    y.assertLt(this);
  }
}

class Int64 extends CircuitValue {
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

  constructor(magnitude: UInt64, sgn: Field) {
    super();
    this.magnitude = magnitude;
    this.sgn = sgn;
  }

  static fromFieldUnchecked(x: Field) {
    let MINUS_ONE = Field.one.neg();
    let FIELD_ORDER = BigInt(MINUS_ONE.toString()) + 1n;
    let TWO64 = 1n << 64n;
    let xBigInt = BigInt(x.toString());
    let isValidPositive = xBigInt < TWO64; // covers {0,...,2^64 - 1}
    let isValidNegative = FIELD_ORDER - xBigInt < TWO64; // {-2^64 + 1,...,-1}
    if (!isValidPositive && !isValidNegative)
      throw Error(
        `Int64.fromField expected a value between (-2^64, 2^64), got ${x}`
      );
    let magnitude = Field(isValidPositive ? x.toString() : x.neg().toString());
    let sign = isValidPositive ? Field.one : MINUS_ONE;
    return new Int64(new UInt64(magnitude), sign);
  }

  static fromUnsigned(x: UInt64 | UInt32) {
    let x_ = x instanceof UInt32 ? x.toUInt64() : x;
    return new Int64(x_, Field.one);
  }

  static fromNumber(x: number) {
    return Int64.fromFieldUnchecked(Field(String(x)));
  }
  static fromString(x: string) {
    return Int64.fromFieldUnchecked(Field(x));
  }
  static fromBigInt(x: bigint) {
    let xField = x < 0n ? Field((-x).toString()).neg() : Field(x.toString());
    return Int64.fromFieldUnchecked(xField);
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
    return new Int64(UInt64.zero, Field.one);
  }
  static get one() {
    return new Int64(UInt64.one, Field.one);
  }
  static get minusOne() {
    return new Int64(UInt64.one, Field.one.neg());
  }

  toField() {
    return this.magnitude.value.mul(this.sgn);
  }

  static fromField(x: Field): Int64 {
    let getUnchecked = () => Int64.fromFieldUnchecked(x);
    // constant case - just return unchecked value
    if (x.isConstant()) return getUnchecked();
    // variable case - create a new checked witness and prove consistency with original field
    let xInt = Circuit.witness(Int64, getUnchecked);
    xInt.toField().assertEquals(x); // sign(x) * |x| === x
    return xInt;
  }

  neg() {
    // doesn't need further check if `this` is valid
    return new Int64(this.magnitude, this.sgn.neg());
  }

  add(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = argToInt64(y);
    return Int64.fromField(this.toField().add(y_.toField()));
  }
  sub(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = argToInt64(y);
    return Int64.fromField(this.toField().sub(y_.toField()));
  }
  mul(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = argToInt64(y);
    return Int64.fromField(this.toField().mul(y_.toField()));
  }
  div(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = argToInt64(y);
    let [q] = this.magnitude.divMod(y_.magnitude);
    let sign = this.sgn.mul(y_.sgn);
    return new Int64(q, sign);
  }
  mod(y: UInt64 | number | string) {
    let [, r] = this.magnitude.divMod(y);
    return new Int64(r, this.sgn);
  }

  equals(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = argToInt64(y);
    return this.toField().equals(y_.toField());
  }
  assertEquals(y: Int64 | number | string | bigint | UInt64 | UInt32) {
    let y_ = argToInt64(y);
    this.toField().assertEquals(y_.toField());
  }
}

function argToInt64(
  x: number | string | bigint | UInt64 | UInt32 | Int64
): Int64 {
  if (typeof x === 'number') return Int64.fromNumber(x);
  if (typeof x === 'string') return Int64.fromString(x);
  if (typeof x === 'bigint') return Int64.fromBigInt(x);
  if (x instanceof UInt64 || x instanceof UInt32) return Int64.fromUnsigned(x);
  return x;
}

function argToField(
  name: string,
  x: { value: Field } | number | string
): Field {
  if (typeof x === 'number') {
    if (!Number.isInteger(x)) {
      throw new Error(`${name} expected integer argument. Got ${x}`);
    }
    // looks weird that we pass it as a string.. but this will cover far more cases without error than just passing in the number,
    // because the number gets truncated to an int32, while the number -> string is accurate for numbers up to 2^53 - 1
    return new Field(String(x));
  } else if (typeof x === 'string') {
    return new Field(x);
  } else {
    return x.value;
  }
}
