import { FieldBn254 as InternalField } from './field-bn254.js';
import { BoolBn254 as InternalBool } from './bool-bn254.js';

export { FieldBn254, BoolBn254 };

/**
 * A {@link FieldBn254} is an element of a prime order [finite field](https://en.wikipedia.org/wiki/Finite_field).
 * Every other provable type is built using the {@link FieldBn254} type.
 *
 * The field is the [pasta base field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) of order 2^254 + 0x224698fc094cf91b992d30ed00000001 ({@link FieldBn254.ORDER}).
 *
 * You can create a new FieldBn254 from everything "field-like" (`bigint`, integer `number`, decimal `string`, `FieldBn254`).
 * @example
 * ```
 * FieldBn254(10n); // FieldBn254 construction from a bigint
 * FieldBn254(100); // FieldBn254 construction from a number
 * FieldBn254("1"); // FieldBn254 construction from a decimal string
 * ```
 *
 * **Beware**: Fields _cannot_ be constructed from fractional numbers or alphanumeric strings:
 * ```ts
 * FieldBn254(3.141); // ERROR: Cannot convert a float to a field element
 * FieldBn254("abc"); // ERROR: Invalid argument "abc"
 * ```
 *
 * Creating a FieldBn254 from a negative number can result in unexpected behavior if you are not familiar with [modular arithmetic](https://en.wikipedia.org/wiki/Modular_arithmetic).
 * @example
 * ```
 * const x = FieldBn254(-1); // valid FieldBn254 construction from negative number
 * const y = FieldBn254(FieldBn254.ORDER - 1n); // same as `x`
 * ```
 *
 * **Important**: All the functions defined on a FieldBn254 (arithmetic, logic, etc.) take their arguments as "field-like".
 * A FieldBn254 itself is also defined as a "field-like" element.
 *
 * @param value - the value to convert to a {@link FieldBn254}
 *
 * @return A {@link FieldBn254} with the value converted from the argument
 */
const FieldBn254 = toFunctionConstructor(InternalField);
type FieldBn254 = InternalField;

/**
 * A boolean value. You can create it like this:
 *
 * @example
 * ```
 * const b = BoolBn254(true);
 * ```
 *
 * You can also combine multiple Bools with boolean operations:
 *
 * @example
 * ```ts
 * const c = BoolBn254(false);
 *
 * const d = b.or(c).and(false).not();
 *
 * d.assertTrue();
 * ```
 *
 * Bools are often created by methods on other types such as `FieldBn254.equals()`:
 *
 * ```ts
 * const b: BoolBn254 = FieldBn254(5).equals(6);
 * ```
 */
const BoolBn254 = toFunctionConstructor(InternalBool);
type BoolBn254 = InternalBool;

function toFunctionConstructor<Class extends new (...args: any) => any>(
  Class: Class
): Class & ((...args: InferArgs<Class>) => InferReturn<Class>) {
  function Constructor(...args: any) {
    return new Class(...args);
  }
  Object.defineProperties(Constructor, Object.getOwnPropertyDescriptors(Class));
  return Constructor as any;
}

type InferArgs<T> = T extends new (...args: infer Args) => any ? Args : never;
type InferReturn<T> = T extends new (...args: any) => infer Return
  ? Return
  : never;
