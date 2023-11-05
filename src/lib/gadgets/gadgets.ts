/**
 * Wrapper file for various gadgets, with a namespace and doccomments.
 */
import {
  compactMultiRangeCheck,
  multiRangeCheck,
  rangeCheck64,
} from './range-check.js';
import { rotate, xor, and, leftShift, rightShift } from './bitwise.js';
import { Field } from '../core.js';

export { Gadgets };

const Gadgets = {
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
   * To safely use `rotate()`, you need to make sure that the value passed in is range-checked to 64 bits;
   * for example, using {@link Gadgets.rangeCheck64}.
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
   * const y = Gadgets.rotate(x, 2, 'left'); // left rotation by 2 bits
   * const z = Gadgets.rotate(x, 2, 'right'); // right rotation by 2 bits
   * y.assertEquals(0b110000);
   * z.assertEquals(0b000011);
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * Gadgets.rotate(xLarge, 32, "left"); // throws an error since input exceeds 64 bits
   * ```
   */
  rotate(field: Field, bits: number, direction: 'left' | 'right' = 'left') {
    return rotate(field, bits, direction);
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
   * const y = Gadgets.leftShift(x, 2); // left shift by 2 bits
   * y.assertEquals(0b110000); // 48 in binary
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * leftShift(xLarge, 32); // throws an error since input exceeds 64 bits
   * ```
   */
  leftShift(field: Field, bits: number) {
    return leftShift(field, bits);
  },

  /**
   * Performs a right shift operation on the provided {@link Field} element.
   * This is similar to the `>>` shift operation in JavaScript, where bits are moved to the right.
   * The `rightShift` function utilizes the rotation method internally to implement this operation.
   *
   * * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   *
   * **Important:** The gadgets assumes that its input is at most 64 bits in size.
   *
   * If the input exceeds 64 bits, the gadget is invalid and fails to prove correct execution of the shift.
   * To safely use `rightShift()`, you need to make sure that the value passed in is range-checked to 64 bits;
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
   * const y = Gadgets.rightShift(x, 2); // right shift by 2 bits
   * y.assertEquals(0b000011); // 3 in binary
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * rightShift(xLarge, 32); // throws an error since input exceeds 64 bits
   * ```
   */
  rightShift(field: Field, bits: number) {
    return rightShift(field, bits);
  },
  /**
   * Bitwise AND gadget on {@link Field} elements. Equivalent to the [bitwise AND `&` operator in JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_AND).
   * The AND gate works by comparing two bits and returning `1` if both bits are `1`, and `0` otherwise.
   *
   * It can be checked by a double generic gate that verifies the following relationship between the values below (in the process it also invokes the {@link Gadgets.xor} gadget which will create additional constraints depending on `length`).
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
   * The `length` parameter lets you define how many bits should be compared. `length` is rounded to the nearest multiple of 16, `paddedLength = ceil(length / 16) * 16`, and both input values are constrained to fit into `paddedLength` bits. The output is guaranteed to have at most `paddedLength` bits as well.
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
  multiRangeCheck(limbs: [Field, Field, Field]) {
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
};
