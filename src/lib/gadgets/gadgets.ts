/**
 * Wrapper file for various gadgets, with a namespace and doccomments.
 */
import { rangeCheck64 } from './range-check.js';
import { not, rotate, xor, and } from './bitwise.js';
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
   * If the input exceeds 64 bits, the gadget is invalid and does not prove correct execution of the rotation.
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
   * Bitwise NOT gate on {@link Field} elements. Similar to the [bitwise
   * NOT `~` operator in JavaScript](https://developer.mozilla.org/en-US/docs/
   * Web/JavaScript/Reference/Operators/Bitwise_NOT).
   *
   * **Note:** The NOT gate only operates over the amount
   * of bits specified by the 'length' paramenter.
   *
   * A NOT gate works by returning `1` in each bit position if the
   * corresponding bit of the operand is `0`, and returning `0` if the
   * corresponding bit of the operand is `1`.
   *
   * The `length` parameter lets you define how many bits to NOT.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints.
   *
   *
   * NOT is implemented in two different ways. If the `checked` parameter is set to `true`
   * the {@link Gadgets.xor} gadget is reusesd the with a second argument to be an
   * all one bitmask the same length. This approach needs as many rows as an XOR would need
   * for a single negation. If the `checked` parameter is set to `false`, NOT is
   * implementad as a subtraction of the input from the all one bitmask. This
   * implementation is returned by default if no `checked` parameter is provided.
   *
   *You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
   *
   * @example
   * ```ts
   * // not-ing 4 bits with the unchecked version
   * let a = Field(0b0101);
   * let b = gadgets.not(a,4,false);
   *
   * b.assertEquals(0b1010);
   *
   * // not-ing 4 bits with the checked version utilizing the xor gadget
   * let a = Field(0b0101);
   * let b = gadgets.not(a,4,true);
   *
   * b.assertEquals(0b1010);
   * ```
   *
   * @param a - The value to apply NOT to.
   * @param length - The number of bits to be considered for the NOT operation.
   * @param checked - Optional Boolean to determine if the checked or unchecked not implementation is used. If it is set to `true` the {@link Gadgets.xor} gadget is reusesd. If it is set to `false`
   * NOT is implementad as a subtraction of the input from the all one bitmask. It is set to `false` by default if no parameter is provided.
   *
   */
  not(a: Field, length: number, checked: boolean = false) {
    return not(a, length, checked);
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
   *You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and)
   *
   * The `length` parameter lets you define how many bits should be compared. `length` is rounded to the nearest multiple of 16, `paddedLength = ceil(length / 16) * 16`, and both input values are constrained to fit into `paddedLength` bits. The output is guaranteed to have at most `paddedLength` bits as well.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints.
   *
   * **Note:** Both {@link Field} elements need to fit into `2^paddedLength - 1`. Otherwise, an error is thrown and no proof can be generated.
   * For example, with `length = 2` (`paddedLength = 16`), `and()` will fail for any input that is larger than `2**16`.
   *
   * ```typescript
   * let a = Field(3);    // ... 000011
   * let b = Field(5);    // ... 000101
   *
   * let c = and(a, b, 2);    // ... 000001
   * c.assertEquals(1);
   * ```
   */
  and(a: Field, b: Field, length: number) {
    return and(a, b, length);
  },
};
