import { Field, Bool } from './core.js';
import { AnyConstructor, CircuitValue, prop } from './circuit_value.js';
import { Types } from '../bindings/mina-transaction/types.js';
import { HashInput } from './hash.js';
import { Provable } from './provable.js';
import { Gadgets } from './gadgets/gadgets.js';

// external API
export { UInt32, UInt64, Int64, Sign };

/**
 * A 64 bit unsigned integer with values ranging from 0 to 18,446,744,073,709,551,615.
 */
class UInt64 extends CircuitValue {
  @prop value: Field;
  static NUM_BITS = 64;

  constructor(x: UInt64 | UInt32 | Field | number | string | bigint) {
    if (x instanceof UInt64 || x instanceof UInt32) x = x.value;
    else if (!(x instanceof Field)) x = Field(x);
    super(x);
  }

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
    Gadgets.rangeCheckN(UInt64.NUM_BITS, x.value);
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

    Gadgets.rangeCheckN(UInt64.NUM_BITS, q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    Gadgets.rangeCheckN(UInt64.NUM_BITS, r);

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
    Gadgets.rangeCheckN(UInt64.NUM_BITS, z);
    return new UInt64(z);
  }

  /**
   * Addition with overflow checking.
   */
  add(y: UInt64 | number) {
    let z = this.value.add(UInt64.from(y).value);
    Gadgets.rangeCheckN(UInt64.NUM_BITS, z);
    return new UInt64(z);
  }

  /**
   * Subtraction with underflow checking.
   */
  sub(y: UInt64 | number) {
    let z = this.value.sub(UInt64.from(y).value);
    Gadgets.rangeCheckN(UInt64.NUM_BITS, z);
    return new UInt64(z);
  }

  /**
   * Bitwise XOR gadget on {@link Field} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
   * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
   *
   * This gadget builds a chain of XOR gates recursively.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#xor-1)
   *
   * @param x {@link UInt64} element to XOR.
   *
   * @example
   * ```ts
   * let a = UInt64.from(0b0101);
   * let b = UInt64.from(0b0011);
   *
   * let c = a.xor(b);
   * c.assertEquals(0b0110);
   * ```
   */
  xor(x: UInt64) {
    return Gadgets.xor(this.value, x.value, UInt64.NUM_BITS);
  }

  /**
   * Bitwise NOT gate on {@link Field} elements. Similar to the [bitwise
   * NOT `~` operator in JavaScript](https://developer.mozilla.org/en-US/docs/
   * Web/JavaScript/Reference/Operators/Bitwise_NOT).
   *
   * **Note:** The NOT gate operates over 64 bit for UInt64 types.
   *
   * A NOT gate works by returning `1` in each bit position if the
   * corresponding bit of the operand is `0`, and returning `0` if the
   * corresponding bit of the operand is `1`.
   *
   * NOT is implemented as a subtraction of the input from the all one bitmask
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
   *
   * @example
   * ```ts
   * // NOTing 4 bits with the unchecked version
   * let a = UInt64.from(0b0101);
   * let b = a.not(false);
   *
   * console.log(b.toBigInt().toString(2));
   * // 1111111111111111111111111111111111111111111111111111111111111010
   *
   * ```
   *
   * @param a - The value to apply NOT to.
   *
   */
  not() {
    return Gadgets.not(this.value, UInt64.NUM_BITS, false);
  }

  /**
   * A (left and right) rotation operates similarly to the shift operation (`<<` for left and `>>` for right) in JavaScript,
   * with the distinction that the bits are circulated to the opposite end of a 64-bit representation rather than being discarded.
   * For a left rotation, this means that bits shifted off the left end reappear at the right end.
   * Conversely, for a right rotation, bits shifted off the right end reappear at the left end.
   *
   * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   * The `direction` parameter is a string that accepts either `'left'` or `'right'`, determining the direction of the rotation.
   *
   * To safely use `rotate()`, you need to make sure that the value passed in is range-checked to 64 bits;
   * for example, using {@link Gadgets.rangeCheck64}.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#rotation)
   *
   * @param bits amount of bits to rotate this {@link UInt64} element with.
   * @param direction left or right rotation direction.
   *
   *
   * @example
   * ```ts
   * const x = UInt64.from(0b001100);
   * const y = x.rotate(2, 'left');
   * const z = x.rotate(2, 'right'); // right rotation by 2 bits
   * y.assertEquals(0b110000);
   * z.assertEquals(0b000011);
   * ```
   */
  rotate(bits: number, direction: 'left' | 'right' = 'left') {
    return Gadgets.rotate64(this.value, bits, direction);
  }

  /**
   * Performs a left shift operation on the provided {@link UInt64} element.
   * This operation is similar to the `<<` shift operation in JavaScript,
   * where bits are shifted to the left, and the overflowing bits are discarded.
   *
   * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   *
   * @param bits Amount of bits to shift the {@link UInt64} element to the left. The amount should be between 0 and 64 (or else the shift will fail).
   *
   * @example
   * ```ts
   * const x = UInt64.from(0b001100); // 12 in binary
   * const y = x.leftShift(2); // left shift by 2 bits
   * y.assertEquals(0b110000); // 48 in binary
   * ```
   */
  leftShift(bits: number) {
    return Gadgets.leftShift64(this.value, bits);
  }

  /**
   * Performs a left right operation on the provided {@link UInt64} element.
   * This operation is similar to the `>>` shift operation in JavaScript,
   * where bits are shifted to the right, and the overflowing bits are discarded.
   *
   * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   *
   * @param bits Amount of bits to shift the {@link UInt64} element to the right. The amount should be between 0 and 64 (or else the shift will fail).
   *
   * @example
   * ```ts
   * const x = UInt64.from(0b001100); // 12 in binary
   * const y = x.rightShift(2); // left shift by 2 bits
   * y.assertEquals(0b000011); // 48 in binary
   * ```
   */
  rightShift(bits: number) {
    return Gadgets.leftShift64(this.value, bits);
  }

  /**
   * Bitwise AND gadget on {@link UInt64} elements. Equivalent to the [bitwise AND `&` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND).
   * The AND gate works by comparing two bits and returning `1` if both bits are `1`, and `0` otherwise.
   *
   * It can be checked by a double generic gate that verifies the following relationship between the values below.
   *
   * The generic gate verifies:\
   * `a + b = sum` and the conjunction equation `2 * and = sum - xor`\
   * Where:\
   * `a + b = sum`\
   * `a ^ b = xor`\
   * `a & b = and`
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and)
   *
   *
   * @example
   * ```typescript
   * let a = UInt64.from(3);    // ... 000011
   * let b = UInt64.from(5);    // ... 000101
   *
   * let c = a.and(b);    // ... 000001
   * c.assertEquals(1);
   * ```
   */
  and(x: UInt64) {
    return Gadgets.and(this.value, x.value, UInt64.NUM_BITS);
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

      let xMinusYFits = Gadgets.isInRangeN(UInt64.NUM_BITS, xMinusY);

      let yMinusXFits = Gadgets.isInRangeN(UInt64.NUM_BITS, yMinusX);

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

      let xMinusYFits = Gadgets.isInRangeN(UInt64.NUM_BITS, xMinusY);

      let yMinusXFits = Gadgets.isInRangeN(UInt64.NUM_BITS, yMinusX);

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
    Gadgets.rangeCheckN(UInt64.NUM_BITS, yMinusX, message);
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

  constructor(x: UInt32 | Field | number | string | bigint) {
    if (x instanceof UInt32) x = x.value;
    else if (!(x instanceof Field)) x = Field(x);
    super(x);
  }

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
    Gadgets.rangeCheck32(x.value);
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

    Gadgets.rangeCheck32(q);

    // TODO: Could be a bit more efficient
    let r = x.sub(q.mul(y_)).seal();
    Gadgets.rangeCheck32(r);

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
    Gadgets.rangeCheck32(z);
    return new UInt32(z);
  }
  /**
   * Addition with overflow checking.
   */
  add(y: UInt32 | number) {
    let z = this.value.add(UInt32.from(y).value);
    Gadgets.rangeCheck32(z);
    return new UInt32(z);
  }
  /**
   * Subtraction with underflow checking.
   */
  sub(y: UInt32 | number) {
    let z = this.value.sub(UInt32.from(y).value);
    Gadgets.rangeCheck32(z);
    return new UInt32(z);
  }

  /**
   * Bitwise XOR gadget on {@link UInt32} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
   * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
   *
   * This gadget builds a chain of XOR gates recursively.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#xor-1)
   *
   * @param x {@link UInt32} element to compare.
   *
   * @example
   * ```ts
   * let a = UInt32.from(0b0101);
   * let b = UInt32.from(0b0011);
   *
   * let c = a.xor(b);
   * c.assertEquals(0b0110);
   * ```
   */
  xor(x: UInt32) {
    return Gadgets.xor(this.value, x.value, UInt32.NUM_BITS);
  }

  /**
   * Bitwise NOT gate on {@link UInt32} elements. Similar to the [bitwise
   * NOT `~` operator in JavaScript](https://developer.mozilla.org/en-US/docs/
   * Web/JavaScript/Reference/Operators/Bitwise_NOT).
   *
   * **Note:** The NOT gate operates over 32 bit for UInt32 types.
   *
   * A NOT gate works by returning `1` in each bit position if the
   * corresponding bit of the operand is `0`, and returning `0` if the
   * corresponding bit of the operand is `1`.
   *
   * NOT is implemented as a subtraction of the input from the all one bitmask.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
   *
   * @example
   * ```ts
   * // NOTing 4 bits with the unchecked version
   * let a = UInt32.from(0b0101);
   * let b = a.not();
   *
   * console.log(b.toBigInt().toString(2));
   * // 11111111111111111111111111111010
   * ```
   *
   * @param a - The value to apply NOT to.
   */
  not() {
    return Gadgets.not(this.value, UInt32.NUM_BITS, false);
  }

  /**
   * A (left and right) rotation operates similarly to the shift operation (`<<` for left and `>>` for right) in JavaScript,
   * with the distinction that the bits are circulated to the opposite end of a 64-bit representation rather than being discarded.
   * For a left rotation, this means that bits shifted off the left end reappear at the right end.
   * Conversely, for a right rotation, bits shifted off the right end reappear at the left end.
   *
   * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   * The `direction` parameter is a string that accepts either `'left'` or `'right'`, determining the direction of the rotation.
   *
   * To safely use `rotate()`, you need to make sure that the value passed in is range-checked to 64 bits;
   * for example, using {@link Gadgets.rangeCheck64}.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#rotation)
   *
   * @param bits amount of bits to rotate this {@link UInt32} element with.
   * @param direction left or right rotation direction.
   *
   *
   * @example
   * ```ts
   * const x = UInt32.from(0b001100);
   * const y = x.rotate(2, 'left');
   * const z = x.rotate(2, 'right'); // right rotation by 2 bits
   * y.assertEquals(0b110000);
   * z.assertEquals(0b000011);
   * ```
   */
  rotate(bits: number, direction: 'left' | 'right' = 'left') {
    return Gadgets.rotate32(this.value, bits, direction);
  }

  /**
   * Performs a left shift operation on the provided {@link UInt32} element.
   * This operation is similar to the `<<` shift operation in JavaScript,
   * where bits are shifted to the left, and the overflowing bits are discarded.
   *
   * It’s important to note that these operations are performed considering the big-endian 32-bit representation of the number,
   * where the most significant (32th) bit is on the left end and the least significant bit is on the right end.
   *
   * The operation expects the input to be range checked to 32 bit.
   *
   * @param bits Amount of bits to shift the {@link UInt32} element to the left. The amount should be between 0 and 32 (or else the shift will fail).
   *
   * @example
   * ```ts
   * const x = UInt32.from(0b001100); // 12 in binary
   * const y = x.leftShift(2); // left shift by 2 bits
   * y.assertEquals(0b110000); // 48 in binary
   * ```
   */
  leftShift(bits: number) {
    return Gadgets.leftShift32(this.value, bits);
  }

  /**
   * Performs a left right operation on the provided {@link UInt32} element.
   * This operation is similar to the `>>` shift operation in JavaScript,
   * where bits are shifted to the right, and the overflowing bits are discarded.
   *
   * It’s important to note that these operations are performed considering the big-endian 32-bit representation of the number,
   * where the most significant (32th) bit is on the left end and the least significant bit is on the right end.
   *
   * @param bits Amount of bits to shift the {@link UInt32} element to the right. The amount should be between 0 and 32 (or else the shift will fail).
   *
   * @example
   * ```ts
   * const x = UInt32.from(0b001100); // 12 in binary
   * const y = x.rightShift(2); // left shift by 2 bits
   * y.assertEquals(0b000011); // 48 in binary
   * ```
   */
  rightShift(bits: number) {
    return Gadgets.rightShift64(this.value, bits);
  }

  /**
   * Bitwise AND gadget on {@link UInt32} elements. Equivalent to the [bitwise AND `&` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND).
   * The AND gate works by comparing two bits and returning `1` if both bits are `1`, and `0` otherwise.
   *
   * It can be checked by a double generic gate that verifies the following relationship between the values below.
   *
   * The generic gate verifies:\
   * `a + b = sum` and the conjunction equation `2 * and = sum - xor`\
   * Where:\
   * `a + b = sum`\
   * `a ^ b = xor`\
   * `a & b = and`
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and)
   *
   *
   * @example
   * ```typescript
   * let a = UInt32.from(3);    // ... 000011
   * let b = UInt32.from(5);    // ... 000101
   *
   * let c = a.and(b, 2);    // ... 000001
   * c.assertEquals(1);
   * ```
   */
  and(x: UInt32) {
    return Gadgets.and(this.value, x.value, UInt32.NUM_BITS);
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
      let xMinusYFits = Gadgets.isInRangeN(UInt32.NUM_BITS, xMinusY);
      let yMinusXFits = Gadgets.isInRangeN(UInt32.NUM_BITS, yMinusX);
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
      let xMinusYFits = Gadgets.isInRangeN(UInt32.NUM_BITS, xMinusY);
      let yMinusXFits = Gadgets.isInRangeN(UInt32.NUM_BITS, yMinusX);
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
    Gadgets.rangeCheckN(UInt32.NUM_BITS, yMinusX, message);
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
