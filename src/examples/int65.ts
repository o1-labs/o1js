// TODO: review and potentially make this snarkyjs' Int64

import { Field, UInt64, prop, CircuitValue, Circuit, isReady } from 'snarkyjs';

export { Int65 };

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

// test();

async function test() {
  await isReady;

  let x = Int65.fromNumber(-128);
  let y = new Int65(Field(128), Field(1));

  // check arithmetic

  x.add(y).assertEquals(Int65.zero);
  console.assert(x.sub(y).toString() === '-256');
  console.assert(y.add(x.neg()).toString() === '256');
  console.assert(x.mul(y).toString() == (-(128 ** 2)).toString());
  console.assert(y.div(x).neg().toString() === '1');
  console.assert(y.div(Int65.fromNumber(129)).toString() === '0');

  // check if size limits are enforced correctly

  // should work
  Int65.fromBigInt((1n << 64n) - 1n).add(Int65.zero);
  Int65.fromBigInt(-(1n << 64n) + 1n).add(Int65.zero);

  // should fail
  let fail = true;
  try {
    Int65.fromBigInt(1n << 64n);
    fail = false;
  } catch {}
  try {
    Int65.fromBigInt(-(1n << 64n));
    fail = false;
  } catch {}
  try {
    new Int65(Field((1n << 64n).toString()), Field(1)).add(Int65.zero);
    fail = false;
  } catch {}
  console.assert(fail === true);
  console.log('everything ok!');
}
