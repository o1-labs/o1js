import type {
  FlexibleProvable,
  InferredProvable,
} from './lib/circuit_value.js';
import type { Account as JsonAccount } from './provable/gen/transaction-json.js';
export {
  Field,
  Bool,
  Group,
  Scalar,
  ProvablePure,
  Provable,
  Circuit,
  CircuitMain,
  Poseidon,
  Keypair,
  Ledger,
  isReady,
  shutdown,
  Pickles,
  Gate,
};

// internal
export { Test };

/**
 * `Provable<T>` is the general circuit type interface. It describes how a type `T` is made up of field elements and auxiliary (non-field element) data.
 *
 * You will find this as the required input type in a few places in snarkyjs. One convenient way to create a `Provable<T>` is using `Struct`.
 */
declare interface Provable<T> {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => any[];
  fromFields: (x: Field[], aux: any[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
}
/**
 * `ProvablePure<T>` is a special kind of `Provable<T>`, where the auxiliary data is empty. This means the type only consists of field elements,
 * in that sense it is "pure".
 *
 * Examples where `ProvablePure<T>` is required are types of on-chain state, events and actions.
 */
declare interface ProvablePure<T> extends Provable<T> {
  toFields: (x: T) => Field[];
  toAuxiliary: (x?: T) => [];
  fromFields: (x: Field[]) => T;
  sizeInFields(): number;
  check: (x: T) => void;
}

/**
 * An element of a finite pasta field of order 28948022309329048855892746252171976963363056481941560715954676764349967630337.
 */
declare function Field(value: Field | number | string | boolean | bigint): Field;
declare class Field {
  /**
   * Coerces anything `field-like` (bigint, boolean, number, string, and {@link Field}) to a {@link Field}.
   * A {@link Field} is an element of a prime order field. Every other provable type is build using the {@link Field} type.
   * The field is the [pasta fp field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) of order 28948022309329048855892746252171976963363056481941560715954676764349967630337.
   * **Warning: You cannot create a {@link Field} from a non-integer number.
   * 
   * ```ts
   * const fieldBigInt = new Field(1n); // Valid Field contruction from a big integer
   * const fieldBoolean = new Field(true); // Valid Field construction from a boolean, equivalent to `new Field(1)`
   * const fieldBoolean = new Field(false); // Valid Field construction from a boolean, equivalent to `new Field(0)`
   * const fieldBumber = new Field(4); // Valid Field construction from a number
   * const fieldWrong = new Field(1.3); // Unvalid Field construction. Will result in error: `Cannot convert a float to a field element`
   * ```
   * 
   * Creating a {@link Field} from a negative number may result in an unexpected behaviour if you are not familiar with [modular arithmatic](https://en.wikipedia.org/wiki/Modular_arithmetic).
   * 
   * ```typescript
   * const field_negative = new Field(-1); // Valid Field contruction, equivalent to `new Field(28948022309329048855892746252171976963363056481941560715954676764349967630336n)`as the order of the pasta field is 28948022309329048855892746252171976963363056481941560715954676764349967630337n
   * ```
   * 
   * **Important: All the functions defined on a Field (arithmetic, logic, etc.) takes their arguments as `field-like`. A {@link Field} itself is also defined as a field-like element.
   * 
   * @param value - the value to coerce to a {@link Field}
   * 
   * @return A {@link Field} element which the value coerced from the argument in the pasta field.
   */
  constructor(value: Field | number | string | boolean | bigint);

  /**
   * Negates a {@link Field}. This is equivalent to multiplying the {@link Field} by -1.
   *
   * ```ts
   * const negOne = Field(1).neg();
   * negOne.assertEquals(-1);
   * ```
   * 
   * ```ts
   * const someField = Field(42);
   * const negation = someField.neg();
   * 
   * negation.neg().assertEquals(someField.mul(Field(-1))); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * **Warning: This is a modular negation. Please see `sub()` function for more details.
   * 
   * @return A {@link Field} element that is equivalent to the element multiplied by -1.
   */
  neg(): Field;

  /**
   * Inverts this {@link Field} element. This is equivalent to equalize the {@link Field} to 1 over its value.
   *
   * ```typescript
   * const someField = Field(42);
   * const inverse = someField.inv();
   * inverse.assertEquals(Field(1).div(example)); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * **Warning: This is a modular inverse. Please see `div()` function for more details.
   *
   * @return A {@link Field} element that is equivalent to one divided by this element.
   */
  inv(): Field;

  /**
   * Adds a `field-like` element to a {@link Field} element and returns the result.
   *
   * ```ts
   * const value1 = Field(3);
   * const value2 = 5; // A `field-like` element
   * 
   * const sum = value1.add(value2);
   * 
   * sum.assertEquals(Field(8));
   * ```
   * 
   * **Warning: This is a modular addition in the pasta field.
   *
   * ```ts
   * const value1 = Field(1);
   * const value2 = Field(-7);
   * 
   * const sum = value1.add(value2);
   * 
   * // If you try to print sum - `console.log(sum.toBigInt())` - you will realize that it prints a very big integer, so you cannot use arithmetic operations on snarkyJS as in regular programming languages.
   * // However, all the operations always stay provable: This means you can use the reverse operation of addition (substraction) to prove the sum is calculated correctly.
   * sum.sub(value1).assertEquals(value2);
   * sum.sub(value2).assertEquals(value1);
   * ```
   * 
   * @param value - a `field-like` value to add to the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular addition of the two value.
   */
  add(value: Field | number | string | boolean): Field;

  /**
   * Substracts another `field-like` element from this {@link Field} and returns the result.
   *
   * ```ts
   * const value1 = Field(3);
   * const value2 = 5; // A `field-like` element
   * 
   * const difference = value1.sub(value2);
   * 
   * difference.assertEquals(Field(-2));
   * ```
   * 
   * **Warning: This is a modular substraction in the pasta field.
   * 
   * ```ts
   * const value1 = Field(1);
   * const value2 = Field(2);
   * 
   * const difference = value1.sub(value2);
   * 
   * // If you try to print difference - `console.log(difference.toBigInt())` - you will realize that it prints a very big integer, so you cannot use arithmetic operations on snarkyJS as in regular programming languages.
   * // However, all the operations always stay provable: This means you can use the reverse operation of substraction (addition) to prove the difference is calculated correctly.
   * difference.add(value2).assertEquals(value1);
   * ```
   * 
   * @param value - a `field-like` value to substract from the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular difference of the two value.
   */
  sub(value: Field | number | string | boolean): Field;

  /**
   * Multiplies another `field-like` element with this {@link Field} and returns the result.
   *
   * ```ts
   * const value1 = Field(3);
   * const value2 = 5; // A `field-like` element
   * 
   * const product = value1.mul(value2);
   * 
   * product.assertEquals(Field(15));
   * ```
   * 
   * **Warning: This is a modular multiplication in the pasta field.
   * 
   * ```ts
   * const value1 = Field(409034234915762252310977182347851274525699134624909316457281397679077977n);
   * const value2 = Field(396799155229642886214345240347513675246314887144578160280866744058082566n);
   * 
   * const product = value1.mul(value2);
   * 
   * // If you try to print product - `console.log(product.toBigInt())` - you will realize that it prints a very big integer, so you cannot use arithmetic operations on snarkyJS as in regular programming languages.
   * // However, all the operations always stay provable: This means you can use the reverse operation of multiplication (division) to prove the product is calculated correctly.
   * product.div(value1).assertEquals(value2);
   * product.div(value2).assertEquals(value1);
   * ```
   * 
   * @param value - a `field-like` value to multiply with the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular difference of the two value.
   */
  mul(value: Field | number | string | boolean): Field;

  /**
   * Divides another `field-like` element through this {@link Field} and returns the result.
   *
   * ```ts
   * const value1 = Field(6);
   * const value2 = 3; // A `field-like` element
   * 
   * const product = value1.div(value2);
   * 
   * product.assertEquals(Field(2));
   * ```
   * 
   * **Warning: This is a modular division in the pasta field. You can think it as the reverse operation of modular multiplication.
   * 
   * ```ts
   * const value1 = Field(2);
   * const value2 = Field(5);
   * 
   * const quotient = value1.div(value2);
   * 
   * // If you try to print product - `console.log(quotient.toBigInt())` - you will realize that it prints a very big integer, so you cannot use arithmetic operations on snarkyJS as in regular programming languages.
   * // However, all the operations always stay provable: This means you can use the reverse operation of division (multiplication) to prove the quotient is calculated correctly.
   * quotient.mul(value2).assertEquals(value1);
   * ```
   * 
   * @param value - a `field-like` value to multiply with the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular difference of the two value.
   */
  div(value: Field | number | string | boolean): Field;

  /**
   * Squares this {@link Field} element.
   *
   * ```typescript
   * const someField = Field(7);
   * const square = someField.square();
   * 
   * square.assertEquals(someField.mul(someField)); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * ** Warning: This is a modular multiplication. Please see `mul()` function for more details.
   * 
   * @return A {@link Field} element equivalent to the multiplication of the {@link Field} element with itself.
   */
  square(): Field;

  /**
   * Squares this {@link Field} element.
   *
   * ```typescript
   * const someField = Field(42);
   * const squareRoot = someField.sqrt();
   * 
   * squareRoot.mul(squareRoot).assertEquals(someField); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * **Warning: This is a modular square root. Please see `div()` function for more details.
   * 
   * @return A {@link Field} element equivalent to the square root of the {@link Field} element.
   */
  sqrt(): Field;

  /**
   * Serialize the {@link Field} to a string, e.g. for printing. If you try to print a {@link Field} without this function it will directly stringify the Field object, resulting in an unreadable output.
   * 
   * **Warning: This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the {@link Field}. Please use it only during debugging.
   * 
   * ```ts
   * const someField = Field(42);
   * console.log(someField.toString());
   * ```
   * 
   * @return A string equivalent to the string representation of the Field.
   */
  toString(): string;

  /**
   * Serialize the {@link Field} to a bigint, e.g. for printing. If you try to print a {@link Field} without this function it will directly stringify the Field object, resulting in an unreadable output.
   * 
   * **Warning: This operation does NOT affect the circuit and can't be used to prove anything about the bigint representation of the {@link Field}. Please use it only during debugging.
   * 
   * ```ts
   * const someField = Field(42);
   * console.log(someField.toBigInt());
   * ```
   * 
   * @return A bigint equivalent to the bigint representation of the Field.
   */
  toBigInt(): bigint;

  /**
   * Serialize the {@link Field} to a JSON string, e.g. for printing. If you try to print a {@link Field} without this function it will directly stringify the Field object, resulting in an unreadable output.
   * 
   * **Warning: This operation does NOT affect the circuit and can't be used to prove anything about the JSON string representation of the {@link Field}. Please use it only during debugging.
   * 
   * ```ts
   * const someField = Field(42);
   * console.log(someField.toJSON());
   * ```
   * 
   * @return A string equivalent to the JSON representation of the Field.
   */
  toJSON(): string;

  /**
   * Returns the size of this type. Size of a {@link Field} is always 1, as it is already the primitive type.
   * This function returns a reular number, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   * 
   * ```ts
   * const someField = Field(42);
   * 
   * console.log(someField.sizeInFields()); // Will always print 1, regardless of the value of `someField`
   * ```
   * 
   * @return A number representing the size of a {@link Field} element in terms of {@link Field} elements.
   */
  sizeInFields(): number;

  /**
   * Serializes this {@link Field} element into an array of {@link Field} elements.
   * You can use this array to calculate the {@link Poseidon} hash of a {@link Field}.
   * This will be always an array of length 1, where the first and only element equals the {@link Field} itself.
   * 
   * @return A {@link Field} array of length 1 created from this {@link Field}.
   */
  toFields(): Field[];

  /**
   * Check if this {@link Field} is lower than another `field-like` value.
   * Returns a {@link Bool}, which is a `provable` type and can be used prove to the validity of this statement.
   *
   * ```ts
   * Field(2).lessThan(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning: As this function compares the bigint value of a {@link Field}, it can result in an unexpected behaviour while comparing negative numbers or floating point operations.
   * 
   * ```ts
   * Field(1).div(Field(3)).lessThan(Field(1).div(Field(2))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the `field-like` value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is less than another `field-like` value.
   */
  lessThan(value: Field | number | string | boolean): Bool;

  /**
   * Check if this {@link Field} is lower than or equal another `field-like` value.
   * Returns a {@link Bool}, which is a `provable` type and can be used to prove the validity of this statement.
   *
   * ```ts
   * Field(3).lessThanOrEqual(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning: As this function compares the bigint value of a {@link Field}, it can result in an unexpected behaviour while comparing negative numbers or floating point operations.
   * 
   * ```ts
   * Field(1).div(Field(3)).lessThanOrEqual(Field(1).div(Field(2))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the `field-like` value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is less than or equal another `field-like` value.
   */
  lessThanOrEqual(value: Field | number | string | boolean): Bool;

  /**
   * Check if this {@link Field} is greater than another `field-like` value.
   * Returns a {@link Bool}, which is a `provable` type and can be used to prove the validity of this statement.
   *
   * ```ts
   * Field(5).greaterThan(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning: As this function compares the bigint value of a {@link Field}, it can result in an unexpected behaviour while comparing negative numbers or floating point operations.
   * 
   * ```ts
   * Field(1).div(Field(2)).greaterThan(Field(1).div(Field(3))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the `field-like` value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is greater than another `field-like` value.
   */
  greaterThan(value: Field | number | string | boolean): Bool;
  
  /**
   * Check if this {@link Field} is greater than or equal another `field-like` value.
   * Returns a {@link Bool}, which is a `provable` type and can be used to prove the validity of this statement.
   *
   * ```ts
   * Field(3).greaterThanOrEqual(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning: As this function compares the bigint value of a {@link Field}, it can result in an unexpected behaviour while comparing negative numbers or floating point operations.
   * 
   * ```ts
   * Field(1).div(Field(2)).greaterThanOrEqual(Field(1).div(Field(3))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the `field-like` value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is greater than or equal another `field-like` value.
   */
  greaterThanOrEqual(value: Field | number | string | boolean): Bool;

  /**
   * Assert that this {@link Field} is less than another `field-like` value.
   * It is equivalent to `Field(...).lessThan(...).assertEquals(Bool(true))`.
   * Please see {@link Field.lessThan} for more details.
   * 
   * **Important: If an assertion fails, the code throws an error.
   * 
   * @param value - the `field-like` value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThan(value: Field | number | string | boolean, message?: string): void;
  
  /**
   * Assert that this {@link Field} is less than or equal another `field-like` value.
   * It is equivalent to `Field(...).lessThanOrEqual(...).assertEquals(Bool(true))`.
   * Please see {@link Field.lessThanOrEqual} for more details.
   * 
   * **Important: If an assertion fails, the code throws an error.
   * 
   * @param value - the `field-like` value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThanOrEqual(value: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is greater than another `field-like` value.
   * It is equivalent to `Field(...).greaterThan(...).assertEquals(Bool(true))`.
   * Please see {@link Field.greaterThan} for more details.
   * 
   * **Important: If an assertion fails, the code throws an error.
   * 
   * @param value - the `field-like` value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThan(value: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is greater than or equal another `field-like` value.
   * It is equivalent to `Field(...).greaterThanOrEqual(...).assertEquals(Bool(true))`.
   * Please see {@link Field.greaterThanOrEqual} for more details.
   * 
   * **Important: If an assertion fails, the code throws an error.
   * 
   * @param value - the `field-like` value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThanOrEqual(value: Field | number | string | boolean, message?: string): void;

  /**
   * @deprecated Deprecated - use {@link lessThan} instead.
   */
  lt(value: Field | number | string | boolean): Bool;
  
  /**
   * @deprecated Deprecated - use {@link lessThanOrEqual} instead.
   */
  lte(value: Field | number | string | boolean): Bool;
  
  /**
   * @deprecated Deprecated - use `{@link greaterThan}` instead.
   */
  gt(value: Field | number | string | boolean): Bool;
  
  /**
   * @deprecated Deprecated - use {@link greaterThanOrEqual} instead.
   */
  gte(value: Field | number | string | boolean): Bool;

  /**
   * @deprecated Deprecated - use {@link assertLessThan} instead
   */
  assertLt(value: Field | number | string | boolean, message?: string): void;
  
  /**
   * @deprecated Deprecated - use {@link assertLessThanOrEqual}instead
   */
  assertLte(value: Field | number | string | boolean, message?: string): void;
  
  /**
   * @deprecated Deprecated - use {@link assertGreaterThan} instead
   */
  assertGt(value: Field | number | string | boolean, message?: string): void;
  
  /**
   *  @deprecated Deprecated - use {@link assertGreaterThanOrEqual} instead
   */
  assertGte(value: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is equal another `field-like` value.
   * It is equivalent to `Field(...).equals(...).assertEquals(Bool(true))`.
   * Please see {@link Field.equals} for more details.
   * 
   * **Important: If an assertion fails, the code throws an error.
   * 
   * @param value - the `field-like` value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertEquals(value: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is equal to 1 or 0 as a `field-like` value.
   * It is equivalent to `Bool.or(Field(...).equals(1), Field(...).equals(0)).assertEquals(Bool(true))`.
   * 
   * **Important: If an assertion fails, the code throws an error.
   * 
   * @param value - the `field-like` value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertBool(message?: string): void;

  /**
   * @deprecated Deprecated - use {@link assertBool} instead.
   */
  assertBoolean(message?: string): void;

  /**
   * Checks if this {@link Field} is 0,
   * It is equivalent to `Field(...).equals(Field(0))`.
   * See {@link Field.equals} for more details.
   * 
   * @return A {@link Bool} representing if this {@link Field} equals 0.
   */
  isZero(): Bool;

  /**
   * Returns an array of {@link Bool} elements representing [little endian binary representation](https://betterexplained.com/articles/understanding-big-and-little-endian-byte-order/) of this {@link Field} element.
   * 
   * **Warning: Binary operations on snarkyJS are currently really costy on chain. Do not use this function if it is not absolutely necessary.
   * 
   * @return An array of {@link Bool} element representing little endian binary representation of this {@link Field}.
   */
  toBits(): Bool[];

  /**
   * Returns an array of {@link Bool} elements representing [little endian binary representation](https://betterexplained.com/articles/understanding-big-and-little-endian-byte-order/) of this {@link Field} element.
   * Throws an error if the element cannot fit in `length` bits.
   * 
   * **Warning: Binary operations on snarkyJS are currently really costy on chain. Do not use this function if it is not absolutely necessary.
   * 
   * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
   * 
   * @return An array of {@link Bool} element representing little endian binary representation of this {@link Field}.
   */
  toBits(length: number): Bool[];

  /**
   * Check if this {@link Field} is equal another `field-like` value.
   * Returns a {@link Bool}, which is a `provable` type and can be used to prove the validity of this statement.
   *
   * ```ts
   * Field(5).equals(5).assertEquals(Bool(true));
   * ```
   * 
   * @param value - the `field-like` value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is equal another `field-like` value.
   */
  equals(value: Field | number | string | boolean): Bool;

  // TODO: Izzy to document
  seal(): Field;
  
  // TODO: Izzy to document
  rangeCheckHelper(numBits: number): Field;

  /**
   * Checks whether this is a hard-coded constant in the Circuit.
   */
  isConstant(): boolean;

  /**
   * Returns a constant.
   */
  toConstant(): Field;

  // value(this: Field | number | string | boolean): Field;

  /* Self members */

  /**
   * @deprecated Static constant values on Field are deprecated in favor of using the constructor `Field(1)`.
   *
   * The number 1 as a {@link Field}.
   */
  static one: Field;

  /**
   * @deprecated Static constant values on Field are deprecated in favor of using the constructor `Field(0)`.
   *
   * The number 0 as a {@link Field}.
   */
  static zero: Field;

  /**
   * @deprecated Static constant values on Field are deprecated in favor of using the constructor `Field(-1)`.
   *
   * The number -1 as a {@link Field}.
   */
  static minusOne: Field;

  /**
   * The order of the pasta curve that {@link Field} type build on as a `bigint`.
   * Order of the {@link Field} is 28948022309329048855892746252171976963363056481941560715954676764349967630337.
   */
  static ORDER: bigint;

  /**
   * A random {@link Field} element.
   * 
   * ```ts
   * console.log(Field.random().toBigInt()); // Run this code twice!
   * ```
   * 
   * @return A random {@link Field} element.
   */
  static random(): Field;

  /*
  static neg(x: Field | number | string | boolean): Field;
  static inv(x: Field | number | string | boolean): Field;

  static add(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static sub(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static mul(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static div(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;

  static square(x: Field | number | string | boolean): Field;
  static sqrt(x: Field | number | string | boolean): Field;

  static toString(x: Field | number | string | boolean): string;
  */

  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  fromFields(fields: Field[]): Field;

  /**
   * Creates a {@link Field} from an array of length 1 serialized from {@link Field} elements.
   * It is equivalent to `fields[0]`, the first index of the {@link Field} array.
   * This function may seem unnecessary. It is designed as the reverse function of {@link Field.toFields}.
   * 
   * @param fields - an array of length 1 serialized from {@link Field} elements.
   * 
   * @return The first {@link Field} element of the given array.
   */
  static fromFields(fields: Field[]): Field;

  /**
   * Returns the size of this type. Size of the {@link Field} type is 1, as it is the primitive type.
   * This function returns a reular number, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   * 
   * This function has the same utility as the {@link Field.sizeInFields}.
   * 
   * ```ts
   * console.log(Field.sizeInFields()); // Prints 1
   * ```
   * 
   * @return A number representing the size of the {@link Field} type in terms of {@link Field} type itself.
   */
  static sizeInFields(): number;

  /**
   * Static function to serializes a {@link Field} into an array of {@link Field} elements.
   * You can use this array to calculate the {@link Poseidon} hash of a {@link Field}.
   * This will be always an array of length 1, where the first and only element equals the given parameter itself.
   * 
   * @param value - the {@link Field} element to cast the array from.
   * 
   * @return A {@link Field} array of length 1 created from this {@link Field}.
   */
  static toFields(value: Field): Field[];

  /**
   * Static method to serialize a {@link Field} into its auxiliary data.
   */
  static toAuxiliary(x?: Field): [];

  /*
  static assertEqual(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Field;
  static assertBoolean(x: Field | number | string | boolean): void;
  static isZero(x: Field | number | string | boolean): Bool;
  */

  /**
   * Converts a bit array into a field element (little endian)
   * Fails if the field element cannot fit given too many bits.
   */
  static fromBits(x: (Bool | boolean)[]): Field;
  /*
  static toBits(x: Field | number | string | boolean): Bool[];
  */

  /*
  static equal(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  ): Bool;
  */

  /**
   * Serialize a {@link Field} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static toJSON(x: Field): string;

  /**
   * Deserialize a JSON structure into a {@link Field}.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static fromJSON(x: string): Field;

  static check(x: Field): void;

  // monkey-patched in JS
  static toInput(x: Field): { fields: Field[] };
  static toBytes(x: Field): number[];
  static fromBytes(bytes: number[]): Field;
  static readBytes(
    bytes: number[],
    offset: number
  ): [value: Field, offset: number];
  static sizeInBytes(): number;
}

/**
 * A boolean value. You can use it like this:
 *
 * ```
 * const x = new Bool(true);
 * ```
 *
 * You can also combine multiple booleans via [[`not`]], [[`and`]], [[`or`]].
 *
 * Use [[assertEquals]] to enforce the value of a Bool.
 */
declare function Bool(x: Bool | boolean): Bool;
declare class Bool {
  constructor(x: Bool | boolean);

  /**
   * Converts a {@link Bool} to a {@link Field}. `false` becomes 0 and `true` becomes 1.
   */
  toField(): Field;

  /**
   * @returns a new {@link Bool} that is the negation of this {@link Bool}.
   */
  not(): Bool;

  /**
   * @param y A {@link Bool} to AND with this {@link Bool}.
   * @returns a new {@link Bool} that is set to true only if
   * this {@link Bool} and `y` are also true.
   */
  and(y: Bool | boolean): Bool;

  /**
   * @param y a {@link Bool} to OR with this {@link Bool}.
   * @returns a new {@link Bool} that is set to true if either
   * this {@link Bool} or `y` is true.
   */
  or(y: Bool | boolean): Bool;

  /**
   * Proves that this {@link Bool} is equal to `y`.
   * @param y a {@link Bool}.
   */
  assertEquals(y: Bool | boolean, message?: string): void;

  /**
   * Proves that this {@link Bool} is `true`.
   */
  assertTrue(message?: string): void;

  /**
   * Proves that this {@link Bool} is `false`.
   */
  assertFalse(message?: string): void;

  /**
   * Returns true if this {@link Bool} is equal to `y`.
   * @param y a {@link Bool}.
   */
  equals(y: Bool | boolean): Bool;

  /**
   * Returns the size of this type.
   */
  sizeInFields(): number;

  /**
   * Serializes this {@link Bool} into {@link Field} elements.
   */
  toFields(): Field[];

  /**
   * Serialize the {@link Bool} to a string, e.g. for printing.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string;
  /**
   * Serialize the {@link Bool} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toJSON(): boolean;

  /**
   * This converts the {@link Bool} to a javascript [[boolean]].
   * This can only be called on non-witness values.
   */
  toBoolean(): boolean;

  /* static members */
  /**
   * The constant {@link Bool} that is `true`.
   */
  //static true: Bool;
  /**
   * The constant {@link Bool} that is `false`.
   */
  //static false: Bool;

  /**
   * Serializes a {@link Bool} into an array of {@link Field} elements.
   */
  static toField(x: Bool | boolean): Field;

  static Unsafe: {
    /**
     * Converts a {@link Field} into a {@link Bool}. This is a **dangerous** operation
     * as it assumes that the field element is either 1 or 0
     * (which might not be true).
     * @param x a {@link Field}
     */
    ofField(x: Field | number | string | boolean): Bool;
  };

  /**
   * Boolean negation.
   */
  static not(x: Bool | boolean): Bool;

  /**
   * Boolean AND operation.
   */
  static and(x: Bool | boolean, y: Bool | boolean): Bool;

  /**
   * Boolean OR operation.
   */
  static or(x: Bool | boolean, y: Bool | boolean): Bool;

  /**
   * Asserts if both {@link Bool} are equal.
   */
  static assertEqual(x: Bool | boolean, y: Bool | boolean): void;

  /**
   * Checks two {@link Bool} for equality.
   */
  static equal(x: Bool | boolean, y: Bool | boolean): Bool;

  /**
   * Counts all elements of type {@link Bool}.
   */
  static count(x: Bool | boolean[]): Field;

  /**
   * Returns the size of this type.
   */
  static sizeInFields(): number;

  /**
   * Static method to serialize a {@link Bool} into an array of {@link Field} elements.
   */
  static toFields(x: Bool): Field[];

  /**
   * Static method to serialize a {@link Bool} into its auxiliary data.
   */
  static toAuxiliary(x?: Bool): [];
  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Bool;

  /**
   * Serialize a {@link Bool} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static toJSON(x: Bool): boolean;
  /**
   * Deserialize a JSON structure into a {@link Bool}.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static fromJSON(x: boolean): Bool;

  static check(x: Bool): void;

  // monkey-patched in JS
  static toInput(x: Bool): { packed: [Field, number][] };
  static toBytes(x: Bool): number[];
  static fromBytes(bytes: number[]): Bool;
  static readBytes(
    bytes: number[],
    offset: number
  ): [value: Bool, offset: number];
  static sizeInBytes(): number;
}

declare interface CircuitMain<W, P> {
  snarkyWitnessTyp: ProvablePure<W>;
  snarkyPublicTyp: ProvablePure<P>;
  snarkyMain: (w: W, p: P) => void;
}

type Gate = {
  type: string;
  wires: { row: number; col: number }[];
  coeffs: string[];
};

/**
 * The {@link Circuit} API is a low level interface to interact and build circuits with
 */
declare class Circuit {
  /**
   * Adds a constraint to the circuit.
   */
  static addConstraint(
    this: Circuit,
    kind: 'multiply',
    x: Field,
    y: Field,
    z: Field
  ): void;
  static addConstraint(
    this: Circuit,
    kind: 'add',
    x: Field,
    y: Field,
    z: Field
  ): void;
  static addConstraint(
    this: Circuit,
    kind: 'equal',
    x: Field,
    y: Field,
    z: Field
  ): void;
  static addConstraint(
    this: Circuit,
    kind: 'boolean',
    x: Field,
    y: Field,
    z: Field
  ): void;

  /**
   * Creates a new variable inside the circuit.
   */
  static newVariable(f: () => Field | number | string | boolean): Field;

  // this convoluted generic typing is needed to give type inference enough flexibility
  static _witness<S extends Provable<any>>(ctor: S, f: () => Field[]): Field[];
  static witness<T, S extends FlexibleProvable<T> = FlexibleProvable<T>>(
    ctor: S,
    f: () => T
  ): T;

  /**
   * Runs code as a prover.
   */
  static asProver(f: () => void): void;

  /**
   * Runs code and checks its correctness.
   */
  static runAndCheck(f: () => void): void;

  /**
   * Runs code in prover mode, without checking correctness.
   */
  static runUnchecked(f: () => void): void;

  /**
   * Returns information about the constraint system in the callback function.
   */
  static constraintSystem<T>(f: () => T): {
    rows: number;
    digest: string;
    result: T;
    gates: Gate[];
    publicInputSize: number;
  };

  /**
   * Returns a low-level JSON representation of the `Circuit` from its {@link Keypair}:
   * a list of gates, each of which represents a row in a table, with certain coefficients and wires to other (row, column) pairs
   */
  static constraintSystemFromKeypair(keypair: Keypair): Gate[];

  /**
   * Creates a {@link Provable} for a generic array.
   */
  static array<A extends FlexibleProvable<any>>(
    elementType: A,
    length: number
  ): InferredProvable<A[]>;

  /**
   * Asserts that two values are equal.
   */
  static assertEqual<T>(ctor: { toFields(x: T): Field[] }, x: T, y: T): void;

  /**
   * Asserts that two values are equal.
   */
  static assertEqual<T>(x: T, y: T): void;

  /**
   * Checks if two elements are equal.
   */
  static equal<T>(ctor: { toFields(x: T): Field[] }, x: T, y: T): Bool;

  /**
   * Checks if two elements are equal.
   */
  static equal<T>(x: T, y: T): Bool;

  /**
   * Circuit-compatible if-statement.
   */
  static if<T>(b: Bool | boolean, ctor: ProvablePure<T>, x: T, y: T): T;
  /**
   * Circuit-compatible if-statement.
   */
  static if<T>(b: Bool | boolean, x: T, y: T): T;

  /**
   * Generalization of `Circuit.if` for choosing between more than two different cases.
   * It takes a "mask", which is an array of `Bool`s that contains only one `true` element, as well as a type/constructor and an array of values of that type.
   * The result is that value which corresponds to the true element of the mask. Example:
   *
   * ```ts
   * let x = Circuit.switch([Bool(false), Bool(true)], Field, [Field(1), Field(2)]);
   * x.assertEquals(2);
   * ```
   */
  static switch<T, A extends FlexibleProvable<T>>(
    mask: Bool[],
    type: A,
    values: T[]
  ): T;

  /**
   * Generates a proving key and a verification key for this circuit.
   */
  static generateKeypair(): Keypair;

  /**
   * Proves a statement using the private input, public input and the {@link Keypair} of the circuit.
   */
  static prove(privateInput: any[], publicInput: any[], kp: Keypair): Proof;

  /**
   * Verifies a proof using the public input, the proof and the initial {@link Keypair} of the circuit.
   */
  static verify(publicInput: any[], vk: VerificationKey, pi: Proof): boolean;

  /**
   * Serializes an element into {@link Field} elements.
   */
  static toFields<A>(a: A): Field[];

  /**
   * Checks if the circuit is in prover mode.
   */
  static inProver(): boolean;

  /**
   * Checks if the circuit is in checked computation mode.
   */
  static inCheckedComputation(): boolean;

  /**
   * Interface to log elements within a circuit. Similar to `Console.log()`.
   */
  static log(...args: any): void;
}

/**
 * Represents a {@link Scalar}.
 */
declare class Scalar {
  /**
   * Serialize this Scalar to Field elements.
   *
   * WARNING: This function is for internal usage by the proof system. It returns 255 field elements
   * which represent the Scalar in a shifted, bitwise format.
   * Check out {@link Scalar.toFieldsCompressed} for a user-friendly serialization that can be used outside proofs.
   */
  toFields(): Field[];

  /**
   * Serialize a Scalar into a Field element plus one bit, where the bit is represented as a Bool.
   *
   * Note: Since the Scalar field is slightly larger than the base Field, an additional high bit
   * is needed to represent all Scalars. However, for a random Scalar, the high bit will be `false` with overwhelming probability.
   */
  static toFieldsCompressed(s: Scalar): { field: Field; highBit: Bool };

  /**
   * Negate a scalar field element.
   * Can only be called outside of circuit execution
   */
  neg(): Scalar;

  /**
   * Add scalar field elements.
   * Can only be called outside of circuit execution
   */
  add(y: Scalar): Scalar;

  /**
   * Subtract scalar field elements.
   * Can only be called outside of circuit execution
   */
  sub(y: Scalar): Scalar;

  /**
   * Multiply scalar field elements.
   * Can only be called outside of circuit execution
   */
  mul(y: Scalar): Scalar;

  /**
   * Divide scalar field elements.
   * Can only be called outside of circuit execution
   */
  div(y: Scalar): Scalar;

  /**
   * Serializes this Scalar to a string
   */
  toJSON(): string;

  /**
   * Static method to serialize a {@link Scalar} into an array of {@link Field} elements.
   */
  static toFields(x: Scalar): Field[];
  /**
   * Static method to serialize a {@link Scalar} into its auxiliary data.
   */
  static toAuxiliary(x?: Scalar): [];
  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Scalar;
  /**
   * Returns the size of this type.
   */
  static sizeInFields(): number;
  /**
   * Creates a data structure from an array of serialized {@link Bool}.
   */
  static fromBits(bits: Bool[]): Scalar;
  /**
   * Returns a random {@link Scalar}.
   * Randomness can not be proven inside a circuit!
   */
  static random(): Scalar;
  /**
   * Serialize a {@link Scalar} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Scalar.
   */
  static toJSON(x: Scalar): string;
  /**
   * Deserialize a JSON structure into a {@link Scalar}.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Scalar.
   */
  static fromJSON(x: string | number | boolean): Scalar;
  /**
   * Create a constant {@link Scalar} from a bigint.
   * If the bigint is too large, it is reduced modulo the scalar field order.
   */
  static fromBigInt(s: bigint): Scalar;
  static check(x: Scalar): void;
}

// TODO: Add this when OCaml bindings are implemented:
// declare class EndoScalar {
//   static toFields(x: Scalar): Field[];
//   static fromFields(fields: Field[]): Scalar;
//   static sizeInFields(): number;
// }

/**
 * Represents a point with x and y coordinates on an elliptic curve.
 */
declare class Group {
  x: Field;
  y: Field;

  /**
   * Adds two {@link Group} elements together.
   */
  add(y: Group): Group;

  /**
   * Subtracts one {@link Group} element from the other.
   */
  sub(y: Group): Group;

  /**
   * Negates this {@link Group} elements and returns a new instance.
   */
  neg(): Group;

  /**
   * Scales this {@link Group} element using a {@link Scalar}.
   */
  scale(y: Scalar): Group;
  // TODO: Add this function when OCaml bindings are implemented : endoScale(y: EndoScalar): Group;

  /**
   * Asserts that two {@link Group} elements are equal.
   */
  assertEquals(y: Group, message?: string): void;

  /**
   * Checks if two {@link Group} elements are equal.
   */
  equals(y: Group): Bool;

  /**
   * Returns the JSON representation of this {@link Group} element.
   */
  toJSON(): { x: string; y: string };

  constructor(args: {
    x: Field | number | string | boolean;
    y: Field | number | string | boolean;
  });
  constructor(
    x: Field | number | string | boolean,
    y: Field | number | string | boolean
  );

  static generator: Group;
  /**
   * Adds two {@link Group} elements together.
   */
  static add(x: Group, y: Group): Group;
  /**
   * Subtracts one {@link Group} element from the other.
   */
  static sub(x: Group, y: Group): Group;
  /**
   * Negates a {@link Group} elements and returns a new instance.
   */
  static neg(x: Group): Group;

  /**
   * Scales this {@link Group} element using a {@link Scalar}.
   */
  static scale(x: Group, y: Scalar): Group;
  // TODO: Add this function when OCaml bindings are implemented : static endoScale(x: Group, y: EndoScalar): Group;

  /**
   * Asserts that two {@link Group} elements are equal.
   */
  static assertEqual(x: Group, y: Group): void;

  /**
   * Checks if two {@link Group} elements are equal.
   */
  static equal(x: Group, y: Group): Bool;
  /**
   * Static method to serialize a {@link Group} into an array of {@link Field} elements.
   */
  static toFields(x: Group): Field[];
  /**
   * Static method to serialize a {@link Group} into its auxiliary data.
   */
  static toAuxiliary(x?: Group): [];
  /**
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Group;
  /**
   * Returns the size of this type.
   */
  static sizeInFields(): number;
  /**
   * Serialize a {@link Group} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Group.
   */
  static toJSON(x: Group): { x: string; y: string };
  /**
   * Deserialize a JSON structure into a {@link Group}.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Group.
   */
  static fromJSON({
    x,
    y,
  }: {
    x: string | number;
    y: string | number;
  }): Group | null;
  static check(g: Group): void;
}

declare const Poseidon: {
  hash(input: Field[], isChecked: boolean): Field;
  update(
    state: [Field, Field, Field],
    input: Field[],
    isChecked: boolean
  ): [Field, Field, Field];
  prefixes: Record<
    | 'event'
    | 'events'
    | 'sequenceEvents'
    | 'body'
    | 'accountUpdateCons'
    | 'accountUpdateNode'
    | 'zkappMemo',
    string
  >;
  spongeCreate(isChecked: boolean): unknown;
  spongeAbsorb(sponge: unknown, x: Field): void;
  spongeSqueeze(sponge: unknown): Field;
};

/**
 * Part of the circuit {@link Keypair}. A verification key can be used to verify a {@link Proof} when you provide the correct public input.
 */
declare class VerificationKey {
  verify(publicInput: any[], proof: Proof): boolean;
}

/**
 * Contains a proving key and {@link VerificationKey} which can be used to verify proofs.
 */
declare class Keypair {
  verificationKey(): VerificationKey;
}

/**
 * Proofs can be verified using a {@link VerificationKey} and the public input.
 */
declare class Proof {
  verify(verificationKey: VerificationKey, publicInput: any[]): boolean;
}

// these types should be implemented by corresponding snarkyjs classes
type PublicKey_ = { x: Field; isOdd: Bool };

/**
 * Represents the Mina ledger.
 */
declare class Ledger {
  /**
   * Creates a fresh ledger.
   */
  static create(
    genesisAccounts: Array<{ publicKey: PublicKey_; balance: string }>
  ): Ledger;

  /**
   * Adds an account and its balance to the ledger.
   */
  addAccount(publicKey: PublicKey_, balance: string): void;

  /**
   * Applies a JSON transaction to the ledger.
   */
  applyJsonTransaction(
    txJson: string,
    accountCreationFee: string,
    networkState: string
  ): void;

  /**
   * Returns an account.
   */
  getAccount(publicKey: PublicKey_, tokenId: Field): JsonAccount | undefined;

  /**
   * Returns the commitment of a JSON transaction.
   */
  static transactionCommitments(txJson: string): {
    commitment: Field;
    fullCommitment: Field;
    feePayerHash: Field;
  };

  /**
   * Returns the public input of a zkApp transaction.
   */
  static zkappPublicInput(
    txJson: string,
    accountUpdateIndex: number
  ): { accountUpdate: Field; calls: Field };

  /**
   * Signs a {@link Field} element.
   */
  static signFieldElement(
    messageHash: Field,
    privateKey: { s: Scalar },
    isMainnet: boolean
  ): string;

  /**
   * Returns a dummy signature.
   */
  static dummySignature(): string;

  /**
   * Signs a transaction as the fee payer.
   */
  static signFeePayer(txJson: string, privateKey: { s: Scalar }): string;

  /**
   * Signs an account update.
   */
  static signOtherAccountUpdate(
    txJson: string,
    privateKey: { s: Scalar },
    i: number
  ): string;

  static customTokenId(publicKey: PublicKey_, tokenId: Field): Field;
  static customTokenIdChecked(publicKey: PublicKey_, tokenId: Field): Field;
  static createTokenAccount(publicKey: PublicKey_, tokenId: Field): string;

  static publicKeyToString(publicKey: PublicKey_): string;
  static publicKeyOfString(publicKeyBase58: string): PublicKey_;
  static privateKeyToString(privateKey: { s: Scalar }): string;
  static privateKeyOfString(privateKeyBase58: string): Scalar;
  static fieldToBase58(field: Field): string;
  static fieldOfBase58(fieldBase58: string): Field;

  static memoToBase58(memoString: string): string;
  static memoHashBase58(memoBase58: string): Field;

  static checkAccountUpdateSignature(
    updateJson: string,
    commitment: Field
  ): boolean;

  static fieldsOfJson(json: string): Field[];
  static hashAccountUpdateFromFields(fields: Field[]): Field;
  static hashAccountUpdateFromJson(json: string): Field;

  static hashInputFromJson: {
    packInput(input: OcamlInput): Field[];
    timing(json: String): OcamlInput;
    permissions(json: String): OcamlInput;
    update(json: String): OcamlInput;
    accountPrecondition(json: String): OcamlInput;
    networkPrecondition(json: String): OcamlInput;
    body(json: String): OcamlInput;
  };

  // low-level encoding helpers
  static encoding: {
    toBase58(s: MlBytes, versionByte: number): string;
    ofBase58(base58: string, versionByte: number): MlBytes;
    versionBytes: Record<
      | 'tokenIdKey'
      | 'receiptChainHash'
      | 'ledgerHash'
      | 'epochSeed'
      | 'stateHash'
      | 'publicKey'
      | 'userCommandMemo',
      number
    >;
  };
}

declare const Test: {
  transactionHash: {
    examplePayment(): string;
    serializePayment(payment: string): { data: Uint8Array };
    serializePaymentV1(payment: string): string;
    serializeCommon(common: string): { data: Uint8Array };
    hashPayment(payment: string): string;
    hashPaymentV1(payment: string): string;
  };
};

/**
 * js_of_ocaml representation of a byte array,
 * see https://github.com/ocsigen/js_of_ocaml/blob/master/runtime/mlBytes.js
 */
type MlBytes = { t: number; c: string; l: number };
type OcamlInput = { fields: Field[]; packed: { field: Field; size: number }[] };

/**
 * This function *must* be called at the end of a nodejs program, otherwise the
 * worker threads will continue running and the program will never terminate.
 * From web applications, this function is a no-op.
 */
declare const shutdown: () => Promise<undefined>;

/**
 * A Promise that resolves when SnarkyJS is ready to be used
 */
declare let isReady: Promise<undefined>;

declare namespace Pickles {
  type Proof = unknown; // opaque to js
  type PublicInput = Field[];
  type ProofWithPublicInput = { publicInput: PublicInput; proof: Proof };
  type Rule = {
    identifier: string;
    main: (publicInput: PublicInput, previousInputs: PublicInput[]) => Bool[];
    proofsToVerify: ({ isSelf: true } | { isSelf: false; tag: unknown })[];
  };
  type Prover = (
    publicInput: Field[],
    previousProofs: ProofWithPublicInput[]
  ) => Promise<Proof>;
}

declare const Pickles: {
  /**
   * This is the core API of the `Pickles` library, exposed from OCaml to JS. It takes a list of circuits --
   * each in the form of a function which takes a public input `{ accountUpdate: Field; calls: Field }` as argument --,
   * and joins them into one single circuit which can not only provide proofs for any of the sub-circuits, but also
   * adds the necessary circuit logic to recursively merge in earlier proofs.
   *
   * After forming that big circuit in the finite field represented by `Field`, it gets wrapped in a
   * recursive circuit in the field represented by `Scalar`. Any SmartContract proof will go through both of these circuits,
   * so that the final proof ends up back in `Field`.
   *
   * The function returns the building blocks needed for SmartContract proving:
   * * `provers` - a list of prover functions, on for each input `rule`
   * * `verify` - a function which can verify proofs from any of the provers
   * * `getVerificationKeyArtifact` - a function which returns the verification key used in `verify`, in base58 format, usable to deploy a zkapp
   *
   * Internal details:
   * `compile` calls each of the input rules four times, inside pickles.ml / compile:
   * 1) let step_data = ...    -> Pickles.Step_branch_data.create -> Pickles.Fix_domains.domains -> Impl.constraint_system
   * 2) let step_keypair = ... -> log_step -> Snarky_log.Constraints.log -> constraint_count
   * 3) let (wrap_pk, wrap_vk) -> log_wrap -> Snarky_log.Constraints.log -> constraint_count
   * 4) let (wrap_pk, wrap_vk) -> log_wrap -> Snarky_log.Constraints.log -> constraint_count (yes, a second time)
   */
  compile: (
    rules: Pickles.Rule[],
    publicInputSize: number
  ) => {
    provers: Pickles.Prover[];
    verify: (
      publicInput: Pickles.PublicInput,
      proof: Pickles.Proof
    ) => Promise<boolean>;
    tag: unknown;
    getVerificationKeyArtifact: () => { data: string; hash: string };
  };

  /**
   * This function has the same inputs as compile, but is a quick-to-compute
   * hash that can be used to short-circuit proofs if rules haven't changed.
   */
  circuitDigest: (rules: Pickles.Rule[], publicInputSize: number) => string;

  verify(
    publicInput: Pickles.PublicInput,
    proof: Pickles.Proof,
    verificationKey: string
  ): Promise<boolean>;

  dummyBase64Proof: () => string;
  dummyVerificationKey: () => { data: string; hash: string };

  proofToBase64: (proof: [0 | 1 | 2, Pickles.Proof]) => string;
  proofOfBase64: (
    base64: string,
    maxProofsVerified: 0 | 1 | 2
  ) => [0 | 1 | 2, Pickles.Proof];

  proofToBase64Transaction: (proof: Pickles.Proof) => string;
};

type AuthRequired = 'Signature' | 'Proof' | 'Either' | 'None' | 'Impossible';
