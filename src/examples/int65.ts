// TODO: review and potentially make this snarkyjs' Int64

import { Field, UInt64, prop, CircuitValue, Circuit, isReady } from 'snarkyjs';

export { Int65 };

class Int65 extends CircuitValue {
  // * in the range [-2^64+1, 2^64-1], unlike a normal int64
  // * under- and overflowing is disallowed, similar to UInt64, unlike a normal int64

  @prop magnitude: Field; // absolute value, restricted like UInt64
  @prop sign: Field; // +/- 1

  constructor(magnitude: Field, sign: Field) {
    super();
    this.magnitude = magnitude;
    this.sign = sign;
  }

  static fromFieldUnchecked(x: Field) {
    let MINUS_ONE = Field.one.neg();
    let FIELD_MAX = BigInt(MINUS_ONE.toString());
    let TWO64 = 1n << 64n;
    let xBigInt = BigInt(x.toString());
    let isValidPositive = xBigInt < TWO64; // includes 0
    let isValidNegative = FIELD_MAX - xBigInt < TWO64;
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
    return new Int65(Field(Math.abs(x)), x >= 0 ? Field.one : Field.one.neg());
  }

  toString() {
    let sign = this.sign.equals(Field.one).toBoolean() ? '' : '-';
    return sign + this.magnitude;
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

  x.add(y).assertEquals(Int65.zero);

  console.assert(x.sub(y).toString() === '-256');
  console.assert(y.add(x.neg()).toString() === '256');
  console.assert(x.mul(y).toString() == (-(128 ** 2)).toString());
  console.log('everything ok!');
}
