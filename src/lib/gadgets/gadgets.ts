/**
 * Wrapper file for various gadgets, with a namespace and doccomments.
 */
import { rangeCheck64 } from './range-check.js';
import { rot } from './rot.js';
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
   * rangeCheck64(x); // successfully proves 64-bit range
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * rangeCheck64(xLarge); // throws an error since input exceeds 64 bits
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
   * A (left and right) rotation is similar to the shift operation, `<<` and `>>` in JavaScript, just that bits are being appended to the other side.
   * `direction` is a string which accepts either `'left'` or `'right'`, defining the direction of the rotation.
   *
   * **Important:** The gadgets assumes that its input is at most 64 bits in size.
   * If the input exceeds 64 bits, the gadget is invalid and does not prove correct execution of the rotation.
   * Therefore, to safely use `rot()`, you need to make sure that the values passed in are range checked to 64 bits.
   * For example, this can be done with {@link Gadgets.rangeCheck64}.
   *
   * @param field {@link Field} element to rotate.
   * @param bits amount of bits to rotate this {@link Field} element with.
   * @param direction left or right rotation direction.
   *
   * @throws Throws an error if the input value exceeds 64 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(12));
   * const y = rot(x, 2, 'left'); // left rotation by 2 bits
   * const z = rot(x, 2, 'right'); // right rotation by 2 bits
   * y.assertEquals(48);
   * z.assertEquals(3)
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * rot(xLarge, 32, "left"); // throws an error since input exceeds 64 bits
   * ```
   */
  rot(field: Field, bits: number, direction: 'left' | 'right' = 'left') {
    return rot(field, bits, direction);
  },
};
