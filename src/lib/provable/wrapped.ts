import { Field as InternalField } from './field.js';
import { Bool as InternalBool } from './bool.js';
import { Group as InternalGroup } from './group.js';
import { Scalar } from './scalar.js';

export { Field, Bool, Scalar, Group };

/**
 * A {@link Field} is an element of a prime order [finite field](https://en.wikipedia.org/wiki/Finite_field).
 * Every other provable type is built using the {@link Field} type.
 *
 * The field is the [pasta base field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) of order 2^254 + 0x224698fc094cf91b992d30ed00000001 ({@link Field.ORDER}).
 *
 * You can create a new Field from everything "field-like" (`bigint`, integer `number`, decimal `string`, `Field`).
 * @example
 * ```
 * Field(10n); // Field construction from a bigint
 * Field(100); // Field construction from a number
 * Field("1"); // Field construction from a decimal string
 * ```
 *
 * **Beware**: Fields _cannot_ be constructed from fractional numbers or alphanumeric strings:
 * ```ts
 * Field(3.141); // ERROR: Cannot convert a float to a field element
 * Field("abc"); // ERROR: Invalid argument "abc"
 * ```
 *
 * Creating a Field from a negative number can result in unexpected behavior if you are not familiar with [modular arithmetic](https://en.wikipedia.org/wiki/Modular_arithmetic).
 * @example
 * ```
 * const x = Field(-1); // valid Field construction from negative number
 * const y = Field(Field.ORDER - 1n); // same as `x`
 * ```
 *
 * **Important**: All the functions defined on a Field (arithmetic, logic, etc.) take their arguments as "field-like".
 * A Field itself is also defined as a "field-like" element.
 *
 * @param value - the value to convert to a {@link Field}
 *
 * @return A {@link Field} with the value converted from the argument
 */
const Field = toFunctionConstructor(InternalField);
type Field = InternalField;

/**
 * A boolean value. You can create it like this:
 *
 * @example
 * ```
 * const b = Bool(true);
 * ```
 *
 * You can also combine multiple Bools with boolean operations:
 *
 * @example
 * ```ts
 * const c = Bool(false);
 *
 * const d = b.or(c).and(false).not();
 *
 * d.assertTrue();
 * ```
 *
 * Bools are often created by methods on other types such as `Field.equals()`:
 *
 * ```ts
 * const b: Bool = Field(5).equals(6);
 * ```
 */
const Bool = toFunctionConstructor(InternalBool);
type Bool = InternalBool;

/**
 * An element of a Group.
 */
const Group = toFunctionConstructor(InternalGroup);
type Group = InternalGroup;

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
type InferReturn<T> = T extends new (...args: any) => infer Return ? Return : never;
