/**
 * Wrapper file for various gadgets, with a namespace and doccomments.
 */
import {
  compactMultiRangeCheck,
  multiRangeCheck,
  rangeCheck8,
  rangeCheck16,
  rangeCheck32,
  rangeCheck64,
  rangeCheckN,
  isDefinitelyInRangeN,
} from './range-check.js';
import {
  not,
  rotate32,
  rotate64,
  xor,
  and,
  or,
  leftShift64,
  rightShift64,
  leftShift32,
} from './bitwise.js';
import { Field } from '../wrapped.js';
import {
  ForeignField,
  Field3,
  Sum as ForeignFieldSum,
} from './foreign-field.js';
import { divMod32, addMod32, divMod64, addMod64 } from './arithmetic.js';
import { SHA256 } from './sha256.js';
import { BLAKE2B } from './blake2b.js';
import { rangeCheck3x12 } from './lookup.js';
import { arrayGet } from './basic.js';

export { Gadgets, Field3, ForeignFieldSum };

const Gadgets = {
  /**
   * Get value from array at a Field element index, in O(n) constraints, where n is the array length.
   *
   * **Warning**: This gadget assumes that the index is within the array bounds `[0, n)`,
   * and returns an unconstrained result otherwise.
   * To use it with an index that is not already guaranteed to be within the array bounds, you should add a suitable range check.
   *
   * ```ts
   * let array = Provable.witnessFields(3, () => [1n, 2n, 3n]);
   * let index = Provable.witness(Field, () => 1n);
   *
   * let value = Gadgets.arrayGet(array, index);
   * ```
   *
   * **Note**: This saves n constraints compared to `Provable.switch(array.map((_, i) => index.equals(i)), type, array)`.
   */
  arrayGet,

  /**
   * Asserts that the input value is in the range [0, 2^64).
   *
   * This function proves that the provided field element can be represented with 64 bits.
   * If the field element exceeds 64 bits, an error is thrown.
   *
   * @param x - The value to be range-checked.
   *
   * @throws Throws an error if the input value exceeds 64 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(12345678n));
   * Gadgets.rangeCheck64(x); // successfully proves 64-bit range
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * Gadgets.rangeCheck64(xLarge); // throws an error since input exceeds 64 bits
   * ```
   *
   * **Note**: Small "negative" field element inputs are interpreted as large integers close to the field size,
   * and don't pass the 64-bit check. If you want to prove that a value lies in the int64 range [-2^63, 2^63),
   * you could use `rangeCheck64(x.add(1n << 63n))`.
   *
   * _Advanced usage_: This returns the 4 highest limbs of x, in reverse order, i.e. [x52, x40, x28, x16].
   * This is useful if you want to do a range check for 52, 40, 28, or 16 bits instead of 64,
   * by constraining some of the returned limbs to be 0.
   */
  rangeCheck64(x: Field) {
    return rangeCheck64(x);
  },

  /**
   * Asserts that the input value is in the range [0, 2^32).
   *
   * This function proves that the provided field element can be represented with 32 bits.
   * If the field element exceeds 32 bits, an error is thrown.
   *
   * @param x - The value to be range-checked.
   *
   * @throws Throws an error if the input value exceeds 32 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(12345678n));
   * Gadgets.rangeCheck32(x); // successfully proves 32-bit range
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * Gadgets.rangeCheck32(xLarge); // throws an error since input exceeds 32 bits
   * ```
   *
   * **Note**: Small "negative" field element inputs are interpreted as large integers close to the field size,
   * and don't pass the 32-bit check. If you want to prove that a value lies in the int32 range [-2^31, 2^31),
   * you could use `rangeCheck32(x.add(1n << 31n))`.
   */
  rangeCheck32(x: Field) {
    return rangeCheck32(x);
  },

  /**
   * Asserts that the input value is in the range [0, 2^n). `n` must be a multiple of 16.
   *
   * This function proves that the provided field element can be represented with `n` bits.
   * If the field element exceeds `n` bits, an error is thrown.
   *
   * @param x - The value to be range-checked.
   * @param n - The number of bits to be considered for the range check.
   * @param message - Optional message to be displayed when the range check fails.
   *
   * @throws Throws an error if the input value exceeds `n` bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(12345678n));
   * Gadgets.rangeCheckN(32, x); // successfully proves 32-bit range
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * Gadgets.rangeCheckN(32, xLarge); // throws an error since input exceeds 32 bits
   * ```
   */
  rangeCheckN(n: number, x: Field, message?: string) {
    return rangeCheckN(n, x, message);
  },

  /**
   * Returns a boolean which being true proves that x is in the range [0, 2^n).
   *
   * **Beware**: The output being false does **not** prove that x is not in the range [0, 2^n).
   * This should not be viewed as a standalone provable method but as an advanced helper function
   * for gadgets which need a weakened form of range check.
   *
   * @param x - The value to be weakly range-checked.
   * @param n - The number of bits to be considered for the range check.
   *
   * @returns a Bool that is definitely only true if the input is in the range [0, 2^n),
   * but could also be false _even if_ the input is in the range [0, 2^n).
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(12345678n));
   * let definitelyInRange = Gadgets.isDefinitelyInRangeN(32, x); // could be true or false
   * ```
   */
  isDefinitelyInRangeN(n: number, x: Field) {
    return isDefinitelyInRangeN(n, x);
  },
  /*
   * Asserts that the input value is in the range [0, 2^16).
   *
   * See {@link Gadgets.rangeCheck64} for analogous details and usage examples.
   */
  rangeCheck16(x: Field) {
    return rangeCheck16(x);
  },

  /**
   * Asserts that the input value is in the range [0, 2^8).
   *
   * See {@link Gadgets.rangeCheck64} for analogous details and usage examples.
   */
  rangeCheck8(x: Field) {
    return rangeCheck8(x);
  },

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
   * **Important:** The gadget assumes that its input is at most 64 bits in size.
   *
   * If the input exceeds 64 bits, the gadget is invalid and fails to prove correct execution of the rotation.
   * To safely use `rotate64()`, you need to make sure that the value passed in is range-checked to 64 bits;
   * for example, using {@link Gadgets.rangeCheck64}.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#rotation)
   *
   * @param field {@link Field} element to rotate.
   * @param bits amount of bits to rotate this {@link Field} element with.
   * @param direction left or right rotation direction.
   *
   * @throws Throws an error if the input value exceeds 64 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(0b001100));
   * const y = Gadgets.rotate64(x, 2, 'left'); // left rotation by 2 bits
   * const z = Gadgets.rotate64(x, 2, 'right'); // right rotation by 2 bits
   * y.assertEquals(0b110000);
   * z.assertEquals(0b000011);
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * Gadgets.rotate64(xLarge, 32, "left"); // throws an error since input exceeds 64 bits
   * ```
   */
  rotate64(field: Field, bits: number, direction: 'left' | 'right' = 'left') {
    return rotate64(field, bits, direction);
  },
  /**
   * A (left and right) rotation operates similarly to the shift operation (`<<` for left and `>>` for right) in JavaScript,
   * with the distinction that the bits are circulated to the opposite end of a 32-bit representation rather than being discarded.
   * For a left rotation, this means that bits shifted off the left end reappear at the right end.
   * Conversely, for a right rotation, bits shifted off the right end reappear at the left end.
   *
   * It’s important to note that these operations are performed considering the big-endian 32-bit representation of the number,
   * where the most significant (32th) bit is on the left end and the least significant bit is on the right end.
   * The `direction` parameter is a string that accepts either `'left'` or `'right'`, determining the direction of the rotation.
   *
   * **Important:** The gadget assumes that its input is at most 32 bits in size.
   *
   * If the input exceeds 32 bits, the gadget is invalid and fails to prove correct execution of the rotation.
   * To safely use `rotate32()`, you need to make sure that the value passed in is range-checked to 32 bits;
   * for example, using {@link Gadgets.rangeCheck32}.
   *
   *
   * @param field {@link Field} element to rotate.
   * @param bits amount of bits to rotate this {@link Field} element with.
   * @param direction left or right rotation direction.
   *
   * @throws Throws an error if the input value exceeds 32 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(0b001100));
   * const y = Gadgets.rotate32(x, 2, 'left'); // left rotation by 2 bits
   * const z = Gadgets.rotate32(x, 2, 'right'); // right rotation by 2 bits
   * y.assertEquals(0b110000);
   * z.assertEquals(0b000011);
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * Gadgets.rotate32(xLarge, 32, "left"); // throws an error since input exceeds 32 bits
   * ```
   */
  rotate32(field: Field, bits: number, direction: 'left' | 'right' = 'left') {
    return rotate32(field, bits, direction);
  },
  /**
   * Bitwise XOR gadget on {@link Field} elements. Equivalent to the [bitwise XOR `^` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR).
   * A XOR gate works by comparing two bits and returning `1` if two bits differ, and `0` if two bits are equal.
   *
   * This gadget builds a chain of XOR gates recursively. Each XOR gate can verify 16 bit at most. If your input elements exceed 16 bit, another XOR gate will be added to the chain.
   *
   * The `length` parameter lets you define how many bits should be compared. `length` is rounded to the nearest multiple of 16, `paddedLength = ceil(length / 16) * 16`, and both input values are constrained to fit into `paddedLength` bits. The output is guaranteed to have at most `paddedLength` bits as well.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints.
   *
   * It is also important to mention that specifying a smaller `length` allows the verifier to infer the length of the original input data (e.g. smaller than 16 bit if only one XOR gate has been used).
   * A zkApp developer should consider these implications when choosing the `length` parameter and carefully weigh the trade-off between increased amount of constraints and security.
   *
   * **Important:** Both {@link Field} elements need to fit into `2^paddedLength - 1`. Otherwise, an error is thrown and no proof can be generated.
   *
   * For example, with `length = 2` (`paddedLength = 16`), `xor()` will fail for any input that is larger than `2**16`.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#xor-1)
   *
   * @param a {@link Field} element to compare.
   * @param b {@link Field} element to compare.
   * @param length amount of bits to compare.
   *
   * @throws Throws an error if the input values exceed `2^paddedLength - 1`.
   *
   * @example
   * ```ts
   * let a = Field(0b0101);
   * let b = Field(0b0011);
   *
   * let c = Gadgets.xor(a, b, 4); // xor-ing 4 bits
   * c.assertEquals(0b0110);
   * ```
   */
  xor(a: Field, b: Field, length: number) {
    return xor(a, b, length);
  },

  /**
   * Bitwise NOT gate on {@link Field} elements. Similar to the [bitwise
   * NOT `~` operator in JavaScript](https://developer.mozilla.org/en-US/docs/
   * Web/JavaScript/Reference/Operators/Bitwise_NOT).
   *
   * **Note:** The NOT gate only operates over the amount
   * of bits specified by the `length` parameter.
   *
   * A NOT gate works by returning `1` in each bit position if the
   * corresponding bit of the operand is `0`, and returning `0` if the
   * corresponding bit of the operand is `1`.
   *
   * The `length` parameter lets you define how many bits to NOT.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints. The operation will fail if the length or the input value is larger than 254.
   *
   * NOT is implemented in two different ways. If the `checked` parameter is set to `true`
   * the {@link Gadgets.xor} gadget is reused with a second argument to be an
   * all one bitmask the same length. This approach needs as many rows as an XOR would need
   * for a single negation. If the `checked` parameter is set to `false`, NOT is
   * implemented as a subtraction of the input from the all one bitmask. This
   * implementation is returned by default if no `checked` parameter is provided.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
   *
   * @example
   * ```ts
   * // not-ing 4 bits with the unchecked version
   * let a = Field(0b0101);
   * let b = Gadgets.not(a,4,false);
   *
   * b.assertEquals(0b1010);
   *
   * // not-ing 4 bits with the checked version utilizing the xor gadget
   * let a = Field(0b0101);
   * let b = Gadgets.not(a,4,true);
   *
   * b.assertEquals(0b1010);
   * ```
   *
   * @param a - The value to apply NOT to. The operation will fail if the value is larger than 254.
   * @param length - The number of bits to be considered for the NOT operation.
   * @param checked - Optional boolean to determine if the checked or unchecked not implementation is used. If it
   * is set to `true` the {@link Gadgets.xor} gadget is reused. If it is set to `false`, NOT is implemented
   *  as a subtraction of the input from the all one bitmask. It is set to `false` by default if no parameter is provided.
   *
   * @throws Throws an error if the input value exceeds 254 bits.
   */
  not(a: Field, length: number, checked: boolean = false) {
    return not(a, length, checked);
  },

  /**
   * Performs a left shift operation on the provided {@link Field} element.
   * This operation is similar to the `<<` shift operation in JavaScript,
   * where bits are shifted to the left, and the overflowing bits are discarded.
   *
   * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   *
   * **Important:** The gadgets assumes that its input is at most 64 bits in size.
   *
   * If the input exceeds 64 bits, the gadget is invalid and fails to prove correct execution of the shift.
   * Therefore, to safely use `leftShift()`, you need to make sure that the values passed in are range checked to 64 bits.
   * For example, this can be done with {@link Gadgets.rangeCheck64}.
   *
   * @param field {@link Field} element to shift.
   * @param bits Amount of bits to shift the {@link Field} element to the left. The amount should be between 0 and 64 (or else the shift will fail).
   *
   * @throws Throws an error if the input value exceeds 64 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(0b001100)); // 12 in binary
   * const y = Gadgets.leftShift64(x, 2); // left shift by 2 bits
   * y.assertEquals(0b110000); // 48 in binary
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * leftShift64(xLarge, 32); // throws an error since input exceeds 64 bits
   * ```
   */
  leftShift64(field: Field, bits: number) {
    return leftShift64(field, bits);
  },

  /**
   * Performs a left shift operation on the provided {@link Field} element.
   * This operation is similar to the `<<` shift operation in JavaScript,
   * where bits are shifted to the left, and the overflowing bits are discarded.
   *
   * It’s important to note that these operations are performed considering the big-endian 32-bit representation of the number,
   * where the most significant (32th) bit is on the left end and the least significant bit is on the right end.
   *
   * **Important:** The gadgets assumes that its input is at most 32 bits in size.
   *
   * The output is range checked to 32 bits.
   *
   * @param field {@link Field} element to shift.
   * @param bits Amount of bits to shift the {@link Field} element to the left. The amount should be between 0 and 32 (or else the shift will fail).
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(0b001100)); // 12 in binary
   * const y = Gadgets.leftShift32(x, 2); // left shift by 2 bits
   * y.assertEquals(0b110000); // 48 in binary
   * ```
   */
  leftShift32(field: Field, bits: number) {
    return leftShift32(field, bits);
  },
  /**
   * Performs a right shift operation on the provided {@link Field} element.
   * This is similar to the `>>` shift operation in JavaScript, where bits are moved to the right.
   * The `rightShift64` function utilizes the rotation method internally to implement this operation.
   *
   * * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   *
   * **Important:** The gadgets assumes that its input is at most 64 bits in size.
   *
   * If the input exceeds 64 bits, the gadget is invalid and fails to prove correct execution of the shift.
   * To safely use `rightShift64()`, you need to make sure that the value passed in is range-checked to 64 bits;
   * for example, using {@link Gadgets.rangeCheck64}.
   *
   * @param field {@link Field} element to shift.
   * @param bits Amount of bits to shift the {@link Field} element to the right. The amount should be between 0 and 64 (or else the shift will fail).
   *
   * @throws Throws an error if the input value exceeds 64 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(0b001100)); // 12 in binary
   * const y = Gadgets.rightShift64(x, 2); // right shift by 2 bits
   * y.assertEquals(0b000011); // 3 in binary
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * rightShift64(xLarge, 32); // throws an error since input exceeds 64 bits
   * ```
   */
  rightShift64(field: Field, bits: number) {
    return rightShift64(field, bits);
  },
  /**
   * Bitwise AND gadget on {@link Field} elements. Equivalent to the [bitwise AND `&` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND).
   * The AND gate works by comparing two bits and returning `1` if both bits are `1`, and `0` otherwise.
   *
   * It can be checked by a double generic gate that verifies the following relationship between the values 
   * below (in the process it also invokes the {@link Gadgets.xor} gadget which will create additional constraints depending on `length`).
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
   * The `length` parameter lets you define how many bits should be compared. `length` is rounded
   * to the nearest multiple of 16, `paddedLength = ceil(length / 16) * 16`, and both input values 
   * are constrained to fit into `paddedLength` bits. The output is guaranteed to have at most `paddedLength` bits as well.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints.
   *
   * **Note:** Both {@link Field} elements need to fit into `2^paddedLength - 1`. Otherwise, an error is thrown and no proof can be generated.
   * For example, with `length = 2` (`paddedLength = 16`), `and()` will fail for any input that is larger than `2**16`.
   *
   * @example
   * ```typescript
   * let a = Field(3);    // ... 000011
   * let b = Field(5);    // ... 000101
   *
   * let c = Gadgets.and(a, b, 2);    // ... 000001
   * c.assertEquals(1);
   * ```
   */
  and(a: Field, b: Field, length: number) {
    return and(a, b, length);
  },
  /**
   * Bitwise OR gadget on {@link Field} elements. Equivalent to the [bitwise OR `|` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_OR).
   * The OR gate works by comparing two bits and returning `1` if at least one bit is `1`, and `0` otherwise.
   *
   * The `length` parameter lets you define how many bits should be compared. `length` is rounded 
   * to the nearest multiple of 16, `paddedLength = ceil(length / 16) * 16`, and both input values 
   * are constrained to fit into `paddedLength` bits. The output is guaranteed to have at most `paddedLength` bits as well.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints.
   *
   * **Note:** Both {@link Field} elements need to fit into `2^paddedLength - 1`. Otherwise, an error is thrown and no proof can be generated.
   * For example, with `length = 2` (`paddedLength = 16`), `and()` will fail for any input that is larger than `2**16`.
   *
   * @example
   * ```typescript
   * let a = Field.from(3);    // ... 000011
   * let b = Field.from(5);    // ... 000101
   *
   * let c = Gadgets.or(a, b, 16);    // ... 000111
   * c.assertEquals(7);
   * ```
   */
  or(a: Field, b: Field, length: number) {
    return or(a, b, length);
  },

  /**
   * Multi-range check.
   *
   * Proves that x, y, z are all in the range [0, 2^88).
   *
   * This takes 4 rows, so it checks 88*3/4 = 66 bits per row. This is slightly more efficient
   * than 64-bit range checks, which can do 64 bits in 1 row.
   *
   * In particular, the 3x88-bit range check supports bigints up to 264 bits, which in turn is enough
   * to support foreign field multiplication with moduli up to 2^259.
   *
   * @example
   * ```ts
   * Gadgets.multiRangeCheck([x, y, z]);
   * ```
   *
   * @throws Throws an error if one of the input values exceeds 88 bits.
   */
  multiRangeCheck(limbs: Field3) {
    multiRangeCheck(limbs);
  },

  /**
   * Compact multi-range check
   *
   * This is a variant of {@link multiRangeCheck} where the first two variables are passed in
   * combined form xy = x + 2^88*y.
   *
   * The gadget
   * - splits up xy into x and y
   * - proves that xy = x + 2^88*y
   * - proves that x, y, z are all in the range [0, 2^88).
   *
   * The split form [x, y, z] is returned.
   *
   * @example
   * ```ts
   * let [x, y] = Gadgets.compactMultiRangeCheck([xy, z]);
   * ```
   *
   * @throws Throws an error if `xy` exceeds 2*88 = 176 bits, or if z exceeds 88 bits.
   */
  compactMultiRangeCheck(xy: Field, z: Field) {
    return compactMultiRangeCheck(xy, z);
  },

  /**
   * Checks that three {@link Field} elements are in the range [0, 2^12) (using only one row).
   *
   * Internally, this gadget relies on the 12-bit [range check table](https://github.com/o1-labs/proof-systems/blob/master/kimchi/src/circuits/lookup/tables/mod.rs).
   * All three inputs are checked to be included in that table.
   *
   * It's possible to use this as a range check for bit lengths n < 12, by passing in _two values_.
   * - the value to be checked, `x`, to prove that x in [0, 2^12)
   * - x scaled by 2^(12 - n), to prove that either x in [0, 2^n) or `x * 2^(12 - n)` overflows the field size (which is excluded by the first check)
   *
   * Note that both of these checks are necessary to prove x in [0, 2^n).
   *
   * You can find more details about lookups in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=lookup%20gate#lookup)
   *
   * @param v0 - The first {@link Field} element to be checked.
   * @param v1 - The second {@link Field} element to be checked.
   * @param v2 - The third {@link Field} element to be checked.
   *
   * @throws Throws an error if one of the input values exceeds 2^12.
   *
   * @example
   * ```typescript
   * let a = Field(4000);
   * rangeCheck3x12(a, Field(0), Field(0)); // works, since `a` is less than 12 bits
   *
   * let aScaled = a.mul(1 << 4); // scale `a`, to assert that it's less than 8 bits
   * rangeCheck3x12(a, aScaled, Field(0)); // throws an error, since  `a` is greater than 8 bits (and so `aScaled` is greater than 12 bits)
   * ```
   */
  rangeCheck3x12(v0: Field, v1: Field, v2: Field) {
    return rangeCheck3x12(v0, v1, v2);
  },

  /**
   * Gadgets for foreign field operations.
   *
   * A _foreign field_ is a finite field different from the native field of the proof system.
   *
   * The `ForeignField` namespace exposes operations like modular addition and multiplication,
   * which work for any finite field of size less than 2^259.
   *
   * Foreign field elements are represented as 3 limbs of native field elements.
   * Each limb holds 88 bits of the total, in little-endian order.
   *
   * All `ForeignField` gadgets expect that their input limbs are constrained to the range [0, 2^88).
   * Range checks on outputs are added by the gadget itself.
   */
  ForeignField: {
    /**
     * Foreign field addition: `x + y mod f`
     *
     * The modulus `f` does not need to be prime.
     *
     * Inputs and outputs are 3-tuples of native Fields.
     * Each input limb is assumed to be in the range [0, 2^88), and the gadget is invalid if this is not the case.
     * The result limbs are guaranteed to be in the same range.
     *
     * @example
     * ```ts
     * let x = Provable.witness(Field3, () => 9n);
     * let y = Provable.witness(Field3, () => 10n);
     *
     * // range check x and y
     * Gadgets.multiRangeCheck(x);
     * Gadgets.multiRangeCheck(y);
     *
     * // compute x + y mod 17
     * let z = ForeignField.add(x, y, 17n);
     *
     * Provable.log(z); // ['2', '0', '0'] = limb representation of 2 = 9 + 10 mod 17
     * ```
     *
     * **Warning**: The gadget does not assume that inputs are reduced modulo f,
     * and does not prove that the result is reduced modulo f.
     * It only guarantees that the result is in the correct residue class.
     *
     * @param x left summand
     * @param y right summand
     * @param f modulus
     * @returns x + y mod f
     */
    add(x: Field3, y: Field3, f: bigint) {
      return ForeignField.add(x, y, f);
    },

    /**
     * Foreign field subtraction: `x - y mod f`
     *
     * See {@link Gadgets.ForeignField.add} for assumptions and usage examples.
     *
     * @throws fails if `x - y < -f`, where the result cannot be brought back to a positive number by adding `f` once.
     */
    sub(x: Field3, y: Field3, f: bigint) {
      return ForeignField.sub(x, y, f);
    },

    /**
     * Foreign field negation: `-x mod f = f - x`
     *
     * See {@link ForeignField.add} for assumptions and usage examples.
     *
     * @throws fails if `x > f`, where `f - x < 0`.
     */
    neg(x: Field3, f: bigint) {
      return ForeignField.negate(x, f);
    },

    /**
     * Foreign field sum: `xs[0] + signs[0] * xs[1] + ... + signs[n-1] * xs[n] mod f`
     *
     * This gadget takes a list of inputs and a list of signs (of size one less than the inputs),
     * and computes a chain of additions or subtractions, depending on the sign.
     * A sign is of type `1n | -1n`, where `1n` represents addition and `-1n` represents subtraction.
     *
     * **Note**: For 3 or more inputs, `sum()` uses fewer constraints than a sequence of `add()` and `sub()` calls,
     * because we can avoid range checks on intermediate results.
     *
     * See {@link Gadgets.ForeignField.add} for assumptions on inputs.
     *
     * @example
     * ```ts
     * let x = Provable.witness(Field3, () => 4n);
     * let y = Provable.witness(Field3, () => 5n);
     * let z = Provable.witness(Field3, () => 10n);
     *
     * // range check x, y, z
     * Gadgets.multiRangeCheck(x);
     * Gadgets.multiRangeCheck(y);
     * Gadgets.multiRangeCheck(z);
     *
     * // compute x + y - z mod 17
     * let sum = ForeignField.sum([x, y, z], [1n, -1n], 17n);
     *
     * Provable.log(sum); // ['16', '0', '0'] = limb representation of 16 = 4 + 5 - 10 mod 17
     * ```
     */
    sum(xs: Field3[], signs: (1n | -1n)[], f: bigint) {
      return ForeignField.sum(xs, signs, f);
    },

    /**
     * Foreign field multiplication: `x * y mod f`
     *
     * The modulus `f` does not need to be prime, but has to be smaller than 2^259.
     *
     * **Assumptions**: In addition to the assumption that input limbs are in the range [0, 2^88), as in all foreign field gadgets,
     * this assumes an additional bound on the inputs: `x * y < 2^264 * p`, where p is the native modulus.
     * We usually assert this bound by proving that `x[2] < f[2] + 1`, where `x[2]` is the most significant limb of x.
     * To do this, we use an 88-bit range check on `2^88 - x[2] - (f[2] + 1)`, and same for y.
     * The implication is that x and y are _almost_ reduced modulo f.
     *
     * All of the above assumptions are checked by {@link Gadgets.ForeignField.assertAlmostReduced}.
     *
     * **Warning**: This gadget does not add the extra bound check on the result.
     * So, to use the result in another foreign field multiplication, you have to add the bound check on it yourself, again.
     *
     * @example
     * ```ts
     * // example modulus: secp256k1 prime
     * let f = (1n << 256n) - (1n << 32n) - 0b1111010001n;
     *
     * let x = Provable.witness(Field3, () => f - 1n);
     * let y = Provable.witness(Field3, () => f - 2n);
     *
     * // range check x, y and prove additional bounds x[2] <= f[2]
     * ForeignField.assertAlmostReduced([x, y], f);
     *
     * // compute x * y mod f
     * let z = ForeignField.mul(x, y, f);
     *
     * Provable.log(z); // ['2', '0', '0'] = limb representation of 2 = (-1)*(-2) mod f
     * ```
     */
    mul(x: Field3, y: Field3, f: bigint) {
      return ForeignField.mul(x, y, f);
    },

    /**
     * Foreign field inverse: `x^(-1) mod f`
     *
     * See {@link Gadgets.ForeignField.mul} for assumptions on inputs and usage examples.
     *
     * This gadget adds an extra bound check on the result, so it can be used directly in another foreign field multiplication.
     */
    inv(x: Field3, f: bigint) {
      return ForeignField.inv(x, f);
    },

    /**
     * Foreign field division: `x * y^(-1) mod f`
     *
     * See {@link Gadgets.ForeignField.mul} for assumptions on inputs and usage examples.
     *
     * This gadget adds an extra bound check on the result, so it can be used directly in another foreign field multiplication.
     *
     * @throws Different than {@link Gadgets.ForeignField.mul}, this fails on unreduced input `x`, because it checks that `x === (x/y)*y` and the right side will be reduced.
     */
    div(x: Field3, y: Field3, f: bigint) {
      return ForeignField.div(x, y, f);
    },

    /**
     * Optimized multiplication of sums in a foreign field, for example: `(x - y)*z = a + b + c mod f`
     *
     * Note: This is much more efficient than using {@link Gadgets.ForeignField.add} and {@link Gadgets.ForeignField.sub} separately to
     * compute the multiplication inputs and outputs, and then using {@link Gadgets.ForeignField.mul} to constrain the result.
     *
     * The sums passed into this method are "lazy sums" created with {@link Gadgets.ForeignField.Sum}.
     * You can also pass in plain {@link Field3} elements.
     *
     * **Assumptions**: The assumptions on the _summands_ are analogous to the assumptions described in {@link Gadgets.ForeignField.mul}:
     * - each summand's limbs are in the range [0, 2^88)
     * - summands that are part of a multiplication input satisfy `x[2] <= f[2]`
     *
     * @throws if the modulus is so large that the second assumption no longer suffices for validity of the multiplication.
     * For small sums and moduli < 2^256, this will not fail.
     *
     * @throws if the provided multiplication result is not correct modulo f.
     *
     * @example
     * ```ts
     * // range-check x, y, z, a, b, c
     * ForeignField.assertAlmostReduced([x, y, z], f);
     * Gadgets.multiRangeCheck(a);
     * Gadgets.multiRangeCheck(b);
     * Gadgets.multiRangeCheck(c);
     *
     * // create lazy input sums
     * let xMinusY = ForeignField.Sum(x).sub(y);
     * let aPlusBPlusC = ForeignField.Sum(a).add(b).add(c);
     *
     * // assert that (x - y)*z = a + b + c mod f
     * ForeignField.assertMul(xMinusY, z, aPlusBPlusC, f);
     * ```
     */
    assertMul(
      x: Field3 | ForeignFieldSum,
      y: Field3 | ForeignFieldSum,
      z: Field3 | ForeignFieldSum,
      f: bigint
    ) {
      return ForeignField.assertMul(x, y, z, f);
    },

    /**
     * Lazy sum of {@link Field3} elements, which can be used as input to {@link Gadgets.ForeignField.assertMul}.
     */
    Sum(x: Field3) {
      return ForeignField.Sum(x);
    },

    /**
     * Prove that each of the given {@link Field3} elements is "almost" reduced modulo f,
     * i.e., satisfies the assumptions required by {@link Gadgets.ForeignField.mul} and other gadgets:
     * - each limb is in the range [0, 2^88)
     * - the most significant limb is less or equal than the modulus, x[2] <= f[2]
     *
     * **Note**: This method is most efficient when the number of input elements is a multiple of 3.
     *
     * @throws if any of the assumptions is violated.
     *
     * @example
     * ```ts
     * let x = Provable.witness(Field3, () => 4n);
     * let y = Provable.witness(Field3, () => 5n);
     * let z = Provable.witness(Field3, () => 10n);
     *
     * ForeignField.assertAlmostReduced([x, y, z], f);
     *
     * // now we can use x, y, z as inputs to foreign field multiplication
     * let xy = ForeignField.mul(x, y, f);
     * let xyz = ForeignField.mul(xy, z, f);
     *
     * // since xy is an input to another multiplication, we need to prove that it is almost reduced again!
     * ForeignField.assertAlmostReduced([xy], f); // TODO: would be more efficient to batch this with 2 other elements
     * ```
     */
    assertAlmostReduced(xs: Field3[], f: bigint, { skipMrc = false } = {}) {
      ForeignField.assertAlmostReduced(xs, f, skipMrc);
    },

    /**
     * Prove that x < f for any constant f < 2^264, or for another `Field3` f.
     *
     * If f is a finite field modulus, this means that the given field element is fully reduced modulo f.
     * This is a stronger statement than {@link ForeignField.assertAlmostReduced}
     * and also uses more constraints; it should not be needed in most use cases.
     *
     * **Note**: This assumes that the limbs of x are in the range [0, 2^88), in contrast to
     * {@link ForeignField.assertAlmostReduced} which adds that check itself.
     *
     * @throws if x is greater or equal to f.
     *
     * @example
     * ```ts
     * let x = Provable.witness(Field3, () => 0x1235n);
     *
     *  // range check limbs of x
     * Gadgets.multiRangeCheck(x);
     *
     * // prove that x is fully reduced mod f
     * Gadgets.ForeignField.assertLessThan(x, f);
     * ```
     */
    assertLessThan(x: Field3, f: bigint | Field3) {
      ForeignField.assertLessThan(x, f);
    },

    /**
     * Prove that x <= f for any constant f < 2^264, or for another `Field3` f.
     *
     * See {@link ForeignField.assertLessThan} for details and usage examples.
     */
    assertLessThanOrEqual(x: Field3, f: bigint | Field3) {
      ForeignField.assertLessThanOrEqual(x, f);
    },

    /**
     * Convert x, which may be unreduced, to a canonical representative xR < f
     * such that x = xR mod f
     *
     * Note: This method is complete, it works for all unreduced field elements.
     * It can therefore be used to protect against incompleteness of field operations in other places.
     */
    toCanonical(x: Field3, f: bigint) {
      return ForeignField.toCanonical(x, f);
    },
  },

  /**
   * Helper methods to interact with 3-limb vectors of Fields.
   *
   * **Note:** This interface does not contain any provable methods.
   */
  Field3,
  /**
   * Division modulo 2^32. The operation decomposes a {@link Field} element in the range [0, 2^64) into two 32-bit limbs, `remainder` and `quotient`, using the following equation: `n = quotient * 2^32 + remainder`.
   *
   * **Note:** The gadget acts as a proof that the input is in the range [0, 2^64). If the input exceeds 64 bits, the gadget fails.
   *
   * Asserts that both `remainder` and `quotient` are in the range [0, 2^32) using {@link Gadgets.rangeCheck32}.
   *
   * @example
   * ```ts
   * let n = Field((1n << 32n) + 8n)
   * let { remainder, quotient } = Gadgets.divMod32(n);
   * // remainder = 8, quotient = 1
   *
   * n.assertEquals(quotient.mul(1n << 32n).add(remainder));
   * ```
   */
  divMod32,

  /**
   * Addition modulo 2^32. The operation adds two {@link Field} elements in the range [0, 2^32) and returns the result modulo 2^32.
   *
   * Asserts that the result is in the range [0, 2^32) using {@link Gadgets.rangeCheck32}.
   *
   * It uses {@link Gadgets.divMod32} internally by adding the two {@link Field} elements and then decomposing the result into `remainder` and `quotient` and returning the `remainder`.
   *
   * **Note:** The gadget assumes both inputs to be in the range [0, 2^64). When called with non-range-checked inputs, be aware that the sum `a + b` can overflow the native field and the gadget can succeed but return an invalid result.
   *
   * @example
   * ```ts
   * let a = Field(8n);
   * let b = Field(1n << 32n);
   *
   * Gadgets.addMod32(a, b).assertEquals(Field(8n));
   * ```
   *    */
  addMod32,

  /**
   * Division modulo 2^64. The operation decomposes a {@link Field} element in the range [0, 2^128) into two 64-bit limbs, `remainder` and `quotient`, using the following equation: `n = quotient * 2^64 + remainder`.
   *
   * **Note:** The gadget acts as a proof that the input is in the range [0, 2^128). If the input exceeds 128 bits, the gadget fails.
   *
   * Asserts that both `remainder` and `quotient` are in the range [0, 2^64) using {@link Gadgets.rangeCheck64}.
   *
   * @example
   * ```ts
   * let n = Field((1n << 64n) + 8n)
   * let { remainder, quotient } = Gadgets.divMod64(n);
   * // remainder = 8, quotient = 1
   *
   * n.assertEquals(quotient.mul(1n << 64n).add(remainder));
   * ```
   */
  divMod64,

  /**
   * Addition modulo 2^64. The operation adds two {@link Field} elements in the range [0, 2^64) and returns the result modulo 2^64.
   *
   * Asserts that the result is in the range [0, 2^64) using {@link Gadgets.rangeCheck64}.
   *
   * It uses {@link Gadgets.divMod64} internally by adding the two {@link Field} elements and then decomposing the result into `remainder` and `quotient` and returning the `remainder`.
   *
   * **Note:** The gadget assumes both inputs to be in the range [0, 2^64). When called with non-range-checked inputs, be aware that the sum `a + b` can overflow the native field and the gadget can succeed but return an invalid result.
   *
   * @example
   * ```ts
   * let a = Field(8n);
   * let b = Field(1n << 64n);
   *
   * Gadgets.addMod64(a, b).assertEquals(Field(8n));
   * ```
   */
  addMod64,

  /**
   * Implementation of the [SHA256 hash function.](https://en.wikipedia.org/wiki/SHA-2) Hash function with 256bit output.
   *
   * Applies the SHA2-256 hash function to a list of byte-sized elements.
   *
   * The function accepts {@link Bytes} as the input message, which is a type that represents a static-length list of byte-sized field elements (range-checked using {@link Gadgets.rangeCheck8}).
   * Alternatively, you can pass plain `number[]`, `bigint[]` or `Uint8Array` to perform a hash outside provable code.
   *
   * Produces an output of {@link Bytes} that conforms to the chosen bit length.
   *
   * @param data - {@link Bytes} representing the message to hash.
   *
   * ```ts
   * let preimage = Bytes.fromString("hello world");
   * let digest = Gadgets.SHA256.hash(preimage);
   * ```
   *
   */
  SHA256: SHA256,

  /**
   * Implementation of the [BLAKE2b hash function.](https://en.wikipedia.org/wiki/BLAKE_(hash_function)#BLAKE2) Hash function with arbitrary length output.
   *
   * Applies the BLAKE2b hash function to a list of byte-sized elements.
   *
   * The function accepts {@link Bytes} as the input message, which is a type that represents a static-length list of byte-sized field elements (range-checked using {@link Gadgets.rangeCheck8}).
   * Alternatively, you can pass plain `number[]`, `bigint[]` or `Uint8Array` to perform a hash outside provable code.
   *
   * Produces an output of {@link Bytes} that conforms to the chosen digest length.
   *
   * @param data - {@link Bytes} representing the message to hash.
   *
   * ```ts
   * let preimage = Bytes.fromString("hello world");
   * let digest = Gadgets.BLAKE2b.hash(preimage);
   * ```
   *
   */
  BLAKE2B: BLAKE2B,
};
