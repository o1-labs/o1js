import { Bool, Circuit, Field } from '../snarky';
import { CircuitValue, prop } from './circuit_value';

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

export class UInt64 extends CircuitValue {
  @prop value: Field;

  static get zero(): UInt64 {
    return new UInt64(Field.zero);
  }
  constructor(value: Field) {
    super();
    this.value = value;
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

  divMod(y: UInt64 | number): [UInt64, UInt64] {
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

export class UInt32 extends CircuitValue {
  @prop value: Field;

  static get zero(): UInt32 {
    return new UInt32(Field.zero);
  }

  constructor(value: Field) {
    super();
    this.value = value;
  }

  toString(): string {
    return this.value.toString();
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

class Int65 extends CircuitValue {
  // * in the range [-2^64+1, 2^64-1], unlike a normal int64
  // * under- and overflowing is disallowed, similar to UInt64, unlike a normal int64
  //
  // Some thoughts regarding the representation as field elements:
  // toFields returns the in-circuit representation, so the main objective is to minimize the number of constraints
  // that result from this representation. Therefore, I think the only candidate for an efficient 1-field representation
  // is the one where the Int65 is the field: toFields = int65 => [int65.magnitude.mul(int65.sign)]. Anything else involving
  // bit packing would just lead to very inefficient circuit operations, IIUC.
  //
  // So, is magnitude * sign ("1-field") a more efficient representation than (magnitude, sign) ("2-field")?
  // Several common operations like add, mul, etc, operate on 1-field so in 2-field they result in one additional multiplication
  // constraint per operand. However, the check operation (constraining to 64 bits + a sign) which is called at the introduction
  // of every witness, and also at the end of add, mul, etc, operates on 2-field. So here, the 1-field representation needs
  // to add an additional magnitude * sign = int65 multiplication constraint, which will typically cancel out most of the gains
  // achieved by 1-field elsewhere.
  // There are some notable operations for which 2-field is definitely better:
  //
  // * div and mod (which do integer division with rounding on the magnitude)
  // * converting the Int64 to a Currency.Amount.Signed (for the zkapp balance), which has the exact same (magnitude, sign) representation we use here.
  //
  // The second point is one of the main things an Int64 is used for, and was my original motivation to use 2 fields.
  // Overall, I think the existing implementation is the optimal one, but happy to be corrected.

  @prop magnitude: Field; // absolute value, restricted like UInt64
  @prop sign: Field; // +/- 1

  constructor(magnitude: Field, sign: Field) {
    super();
    this.magnitude = magnitude;
    this.sign = sign;
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
    return new Int65(magnitude, sign);
  }

  static fromUnsigned(x: UInt64) {
    return new Int65(x.value, Field.one);
  }

  static fromNumber(x: number) {
    return Int65.fromFieldUnchecked(Field(x));
  }
  static fromString(x: string) {
    return Int65.fromFieldUnchecked(Field(x));
  }
  static fromBigInt(x: bigint) {
    let xField = x < 0n ? Field((-x).toString()).neg() : Field(x.toString());
    return Int65.fromFieldUnchecked(xField);
  }

  toString() {
    let abs = this.magnitude.toString();
    let sgn = this.sign.equals(Field.one).toBoolean() || abs === '0' ? '' : '-';
    return sgn + abs;
  }

  isConstant() {
    return this.magnitude.isConstant() && this.sign.isConstant();
  }

  // --- circuit-compatible operations below ---
  // the assumption here is that all Int65 values that appear in a circuit are already checked as valid
  // this is because Circuit.witness calls .check
  // so we only have to do additional checks if an operation on valid inputs can have an invalid outcome (example: overflow)

  static check(x: Int65) {
    UInt64.check(new UInt64(x.magnitude)); // |x| < 2^64
    x.sign.square().assertEquals(Field.one); // sign(x)^2 === 1
  }

  static get zero() {
    return new Int65(Field.zero, Field.one);
  }

  toField() {
    return this.magnitude.mul(this.sign);
  }

  static fromField(x: Field): Int65 {
    let getUnchecked = () => Int65.fromFieldUnchecked(x);
    // constant case - just return unchecked value
    if (x.isConstant()) return getUnchecked();
    // variable case - create a new checked witness and prove consistency with original field
    let xInt = Circuit.witness(Int65, getUnchecked);
    xInt.toField().assertEquals(x); // sign(x) * |x| === x
    return xInt;
  }

  neg() {
    // doesn't need further check if `this` is valid
    return new Int65(this.magnitude, this.sign.neg());
  }

  add(y: Int65) {
    return Int65.fromField(this.toField().add(y.toField()));
  }
  sub(y: Int65) {
    return Int65.fromField(this.toField().sub(y.toField()));
  }
  mul(y: Int65) {
    return Int65.fromField(this.toField().mul(y.toField()));
  }
  div(y: Int65) {
    let [q] = new UInt64(this.magnitude).divMod(new UInt64(y.magnitude));
    let sign = this.sign.mul(y.sign);
    return new Int65(q.value, sign);
  }
  mod(y: UInt64) {
    let [, r] = new UInt64(this.magnitude).divMod(y);
    return new Int65(r.value, this.sign);
  }

  equals(y: Int65) {
    return this.toField().equals(y.toField());
  }
  assertEquals(y: Int65) {
    this.toField().assertEquals(y.toField());
  }
}
