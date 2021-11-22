import { Bool, Circuit, Field } from "../snarky";
import { CircuitValue, prop } from "./circuit_value";

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
  
  constructor(value: Field) {
    super();
    this.value = value;
  }
  
  static check(x: UInt64) {
    let actual = x.value.rangeCheckHelper(64);
    actual.assertEquals(x.value);
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
        new UInt64(new Field(r.toString()))
      ];
    }

    y_ = y_.seal();

    let q = Circuit.witness(Field, () => 
      new Field ((BigInt(x.toString()) / BigInt(y_.toString())).toString()));

    q.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    r.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(r);
    
    let r_ = new UInt64(r);
    let q_ = new UInt64(q);
    
    r_.assertLt(new UInt64(y_));

    return [ q_, r_ ];
  }
  
  div(y : UInt64 | number): UInt64 {
    return this.divMod(y)[0];
  }

  mod(y : UInt64 | number): UInt64 {
    return this.divMod(y)[1];
  }

  mul(y : UInt64 | number): UInt64 {
    let z = this.value.mul(argToField('UInt64.mul', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  add(y : UInt64 | number): UInt64 {
    let z = this.value.add(argToField('UInt64.add', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  sub(y: UInt64 | number): UInt64 {
    let z = this.value.sub(argToField('UInt64.sub', y));
    z.rangeCheckHelper(UInt64.NUM_BITS).assertEquals(z);
    return new UInt64(z);
  }

  lte(y: UInt64): Bool {
    let xMinusY = this.value.sub(argToField('UInt64.lte', y)).seal();
    let xMinusYFits = xMinusY.rangeCheckHelper(UInt64.NUM_BITS).equals(xMinusY);
    let yMinusXFits = xMinusY.rangeCheckHelper(UInt64.NUM_BITS).equals(xMinusY.neg());
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
  
  constructor(value: Field) {
    super();
    this.value = value;
  }
  
  static check(x: UInt32) {
    let actual = x.value.rangeCheckHelper(32);
    actual.assertEquals(x.value);
  }

  static fromNumber(x: number): UInt32 {
    return new UInt32(argToField('UInt32.fromNumber', x));
  }
  
  static NUM_BITS = 32;
  
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
        new UInt32(new Field(r.toString()))
      ];
    }

    y_ = y_.seal();

    let q = Circuit.witness(Field, () => 
      new Field ((BigInt(x.toString()) / BigInt(y_.toString())).toString()));

    q.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    r.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(r);
    
    let r_ = new UInt32(r);
    let q_ = new UInt32(q);
    
    r_.assertLt(new UInt32(y_));

    return [ q_, r_ ];
  }
  
  div(y : UInt32 | number): UInt32 {
    return this.divMod(y)[0];
  }

  mod(y : UInt32 | number): UInt32 {
    return this.divMod(y)[1];
  }

  mul(y : UInt32 | number): UInt32 {
    let z = this.value.mul(argToField('UInt32.mul', y));
    z.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(z);
    return new UInt32(z);
  }

  add(y : UInt32 | number): UInt32 {
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
    let yMinusXFits = xMinusY.rangeCheckHelper(UInt32.NUM_BITS).equals(xMinusY.neg());
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
    let x_= x.value.seal();
    x_.mul(x_).assertEquals(Field.one);
  }

  constructor(value: Field) {
    super();
    this.value = value;
  }
}

export class Int64 {
  @prop value: Field | null;

  @prop magnitude: UInt64 | null;
  @prop isPos: Sgn | null;

  constructor(magnitude: UInt64, isPos: Sgn) {
    this.value = null;
    this.magnitude = magnitude;
    this.isPos = isPos;
  }
  
  static ofUnsigned(x: UInt64): Int64 {
    return new Int64(x, new Sgn(Field.one));
  }

  static sizeInFieldElements(): number {
    return 2;
  }
  
  neg(): Int64 {
    // TODO
    if (this.magnitude !== null && this.isPos !== null) {
      return new Int64(this.magnitude, this.isPos);
    } else {
      throw 'todo';
    }
  }

  repr(): { magnitude: Field, isPos: Sgn } {
    throw 'todo';
  }

  static toFieldElements(x: Int64): Field[] {
    let r = x.repr();
    return [r.magnitude, r.isPos.value];
  }

  static ofFieldElements(xs: Field[]) {
    return new Int64(new UInt64(xs[0]), new Sgn(xs[1]));
  }

  toFieldElements(): Field[] {
    return Int64.toFieldElements(this);
  }

  sizeInFieldElements(): number {
    return Int64.sizeInFieldElements();
  }
}
