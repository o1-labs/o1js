import { Bool, Circuit, Field } from '../snarky';
import { CircuitValue, prop } from './circuit_value';
import * as util from 'util';

function argToField(name: string, x: { value: Field } | number): Field {
  if (typeof x === 'number') {
    if (!Number.isInteger(x)) {
      throw new Error(`${name} expected integer argument. Got ${x}`);
    }
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
    return new UInt64(Field.fromJSON(((1n << 64n) - 1n).toString()) as Field);
  }

  static fromNumber(x: number): UInt64 {
    return new UInt64(argToField('UInt64.fromNumber', x));
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

  /** Integer division.
   *
   * `x.div(y)` returns the floor of `x / y`, that is, the greatest
   * `z` such that `x * y <= x`.
   *
   */
  div(y: UInt64 | number): UInt64 {
    return this.divMod(y)[0];
  }

  /** Integer remainder.
   *
   * `x.mod(y)` returns the value `z` such that `0 <= z < y` and
   * `x - z` is divisble by `y`.
   */
  mod(y: UInt64 | number): UInt64 {
    return this.divMod(y)[1];
  }

  /** Multiplication with overflow checking.
   */
  mul(y: UInt64 | number): UInt64 {
    let z = this.value.mul(argToField('UInt64.mul', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  /** Addition with overflow checking.
   */
  add(y: UInt64 | number): UInt64 {
    let z = this.value.add(argToField('UInt64.add', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  /** Subtraction with underflow checking.
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

class Sgn extends CircuitValue {
  // +/- 1
  @prop value: Field;

  static check(x: Sgn) {
    let x_ = x.value.seal();
    x_.mul(x_).assertEquals(Field.one);
  }

  constructor(value: Field) {
    super();
    this.value = value;
  }

  static get Pos() {
    return new Sgn(Field.one);
  }
  static get Neg() {
    return new Sgn(Field.one.neg());
  }
}

export class Int64 {
  // In the range [-2^63, 2^63 - 1]
  @prop value: Field;

  static check() {
    throw 'todo: int64 check';
  }

  /*
  @prop magnitude: UInt64 | null;
  @prop isPos: Sgn | null;
  */

  constructor(x: Field) {
    this.value = x;
  }

  toString(): string {
    const s = this.value.toString();
    const n = BigInt(s);
    if (n < 1n << 64n) {
      return s;
    } else {
      return '-' + this.value.neg().toString();
    }
  }

  static get zero(): Int64 {
    return new Int64(Field.zero);
  }

  static fromUnsigned(x: UInt64): Int64 {
    return new Int64(x.value);
  }

  private static shift(): Field {
    return Field.fromJSON((1n << 64n).toString()) as Field;
  }

  uint64Value(): Field {
    const n = BigInt(this.value.toString());
    if (n < 1n << 64n) {
      return this.value;
    } else {
      const x = this.value.add(Int64.shift());

      return x;
    }
  }

  static sizeInFields(): number {
    return 1;
  }

  neg(): Int64 {
    return new Int64(this.value.neg());
  }

  add(y: Int64 | UInt32 | UInt64) {
    return new Int64(this.value.add(y.value));
  }

  sub(y: Int64 | UInt32 | UInt64) {
    return new Int64(this.value.sub(y.value));
  }

  repr(): { magnitude: Field; isPos: Sgn } {
    throw 'repr';
  }

  static toFields(x: Int64): Field[] {
    return [x.value];
  }

  static ofFields(xs: Field[]) {
    return new Int64(xs[0]);
  }

  toFields(): Field[] {
    return Int64.toFields(this);
  }

  sizeInFields(): number {
    return Int64.sizeInFields();
  }
}
