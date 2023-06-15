import type { Account as JsonAccount } from './bindings/mina-transaction/gen/transaction-json.js';
export {
  Field,
  Bool,
  Group,
  Scalar,
  ProvablePure,
  Provable,
  Poseidon,
  Ledger,
  isReady,
  shutdown,
  Pickles,
  Gate,
};

// internal
export { Snarky, Test, JsonGate };

/**
 * `Provable<T>` is the general circuit type interface in SnarkyJS. `Provable<T>` interface describes how a type `T` is made up of {@link Field} elements and "auxiliary" (non-provable) data.
 *
 * `Provable<T>` is the required input type in a few places in SnarkyJS. One convenient way to create a `Provable<T>` is using `Struct`.
 * 
 * The properties and methods on the provable type exist in all base SnarkyJS types as well (aka. {@link Field}, {@link Bool}, etc.). In most cases, a zkApp developer does not need these functions to create Dapps.
 */
declare interface Provable<T> {
  /**
   * A function that takes `value`, an element of type `T`, as argument and returns an array of {@link Field} elements that made up the provable data of `value`.
   * 
   * @param value - the element of type `T` to generate the {@link Field} array from.
   * 
   * @return A {@link Field} array describing how this `T` element is made up of {@link Field} elements.
   */
  toFields: (value: T) => Field[];

   /**
   * A function that takes `value` (optional), an element of type `T`, as argument and returns an array of any type that made up the "auxilary" (non-provable) data of `value`.
   * 
   * @param value - the element of type `T` to generate the auxilary data array from, optional. If not provided, an empty array is returned.
   * 
   * @return An array of any type describing how this `T` element is made up of "auxilary" (non-provable) data.
   */
  toAuxiliary: (value?: T) => any[];

  /**
   * A function that returns an element of type `T` from the given provable and "auxilary" data.
   * 
   * **Important**: For any element of type `T`, this function is the reverse operation of calling {@link toFields} and {@link toAuxilary} methods on an element of type `T`.
   * 
   * @param fields - an array of {@link Field} elements describing the provable data of the new `T` element.
   * @param aux - an array of any type describing the "auxilary" data of the new `T` element, optional.
   * 
   * @return An element of type `T` generated from the given provable and "auxilary" data.
   */
  fromFields: (fields: Field[], aux: any[]) => T;

  /**
   * Return the size of the `T` type in terms of {@link Field} type, as {@link Field} is the primitive type.
   * 
   * **Warning**: This function returns a `number`, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   * 
   * **Beware**: Calling the statement `x.sizeInFields()` is equivalent to `x.toFields().length`.
   * 
   * @return A `number` representing the size of the `T` type in terms of {@link Field} type.
   */
  sizeInFields(): number;

  /**
   * Add assertions to the proof to check if `value` is a valid member of type `T`.
   * This function does not return anything, instead it creates any number of assertions to prove that `value` is a valid member of the type `T`.
   * 
   * For instance, calling check function on the type {@link Bool} asserts that the value of the element is either 1 or 0.
   * 
   * @param value - the element of type `T` to put assertions on.
   */
  check: (value: T) => void;
}

/**
 * `ProvablePure<T>` is a special kind of {@link Provable} interface, where the "auxiliary" (non-provable) data is empty. This means the type consists only of field elements, in that sense it is "pure".
 * Any element on the interface `ProvablePure<T>` is also an element of the interface `Provable<T>` where the "auxilary" data is empty.
 * 
 * Examples where `ProvablePure<T>` is required are types of on-chain state, events and actions.
 * 
 * It includes the same properties and methods as the {@link Provable} interface.
 */
declare interface ProvablePure<T> extends Provable<T> {
  /**
   * A function that takes `value`, an element of type `T`, as argument and returns an array of {@link Field} elements that made up the provable data of `value`.
   * 
   * @param value - the element of type `T` to generate the {@link Field} array from.
   * 
   * @return A {@link Field} array describing how this `T` element is made up of {@link Field} elements.
   */
  toFields: (value: T) => Field[];

   /**
   * A function that takes `value` (optional), an element of type `T`, as argument and returns an array of any type that made up the "auxilary" (non-provable) data of `value`.
   * As any element of the interface `ProvablePure<T>` includes no "auxilary" data by definition, this function always return an empty array.
   * 
   * @param value - the element of type `T` to generate the auxilary data array from, optional. If not provided, an empty array is returned.
   * 
   * @return An empty array, as any element of the interface `ProvablePure<T>` includes no "auxilary" data by definition.
   */
  toAuxiliary: (value?: T) => any[];

  /**
   * A function that returns an element of type `T` from the given provable data.
   * 
   * **Important**: For any element of type `T`, this function is the reverse operation of calling {@link toFields} method on an element of type `T`.
   * 
   * @param fields - an array of {@link Field} elements describing the provable data of the new `T` element.
   * 
   * @return An element of type `T` generated from the given provable data.
   */
  fromFields: (fields: Field[]) => T;

  /**
   * Return the size of the `T` type in terms of {@link Field} type, as {@link Field} is the primitive type.
   * 
   * **Warning**: This function returns a `number`, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   * 
   * **Beware**: Calling the statement `x.sizeInFields()` is equivalent to `x.toFields().length`.
   * 
   * @return A `number` representing the size of the `T` type in terms of {@link Field} type.
   */
  sizeInFields(): number;

  /**
   * Assert some statements on the chain to check if `value` element is a valid member of type `T`.
   * This function does not return anything, rather creates any number of assertions on the chain to prove `value` is a valid member of the type `T`.
   * 
   * For instance, calling check function on the type {@link Bool} asserts that the value of the element is either 1 or 0.
   * 
   * @param value - the element of type `T` to put assertions on.
   */
  check: (value: T) => void;
}

declare namespace Snarky {
  type Keypair = unknown;
  type VerificationKey = unknown;
  type Proof = unknown;
}

/**
 * Internal interface to snarky-ml
 *
 * Note for devs: This module is intended to closely mirror snarky-ml's core, low-level APIs.
 */
declare const Snarky: {
  /**
   * witness `sizeInFields` field element variables
   */
  exists(sizeInFields: number, compute: () => Field[]): Field[];
  /**
   * Runs code as a prover.
   */
  asProver(f: () => void): void;
  /**
   * Runs code and checks its correctness.
   */
  runAndCheck(f: () => void): void;
  /**
   * Runs code in prover mode, without checking correctness.
   */
  runUnchecked(f: () => void): void;
  /**
   * Returns information about the constraint system in the callback function.
   */
  constraintSystem(f: () => void): {
    rows: number;
    digest: string;
    json: JsonConstraintSystem;
  };

  /**
   * The circuit API is a low level interface to create zero-knowledge proofs
   */
  circuit: {
    /**
     * Generates a proving key and a verification key for the provable function `main`
     */
    compile(
      main: (publicInput: Field[]) => void,
      publicInputSize: number
    ): Snarky.Keypair;

    /**
     * Proves a statement using the private input, public input and the keypair of the circuit.
     */
    prove(
      main: (publicInput: Field[]) => void,
      publicInputSize: number,
      publicInput: Field[],
      keypair: Snarky.Keypair
    ): Snarky.Proof;

    /**
     * Verifies a proof using the public input, the proof and the verification key of the circuit.
     */
    verify(
      publicInput: Field[],
      proof: Snarky.Proof,
      verificationKey: Snarky.VerificationKey
    ): boolean;

    keypair: {
      getVerificationKey(keypair: Snarky.Keypair): Snarky.VerificationKey;
      /**
       * Returns a low-level JSON representation of the circuit:
       * a list of gates, each of which represents a row in a table, with certain coefficients and wires to other (row, column) pairs
       */
      getConstraintSystemJSON(keypair: Snarky.Keypair): JsonConstraintSystem;
    };
  };
};

type JsonGate = {
  typ: string;
  wires: { row: number; col: number }[];
  coeffs: number[][];
};
type JsonConstraintSystem = { gates: JsonGate[]; public_input_size: number };

/**
 * A {@link Field} is an element of a prime order [finite field](https://en.wikipedia.org/wiki/Finite_field).
 * Every other provable type is built using the {@link Field} type.
 *
 * The field is the [pasta base field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) of order 2^254 + 0x224698fc094cf91b992d30ed00000001 ({@link Field.ORDER}).
 *
 * You can create a new Field from everything "field-like" (`bigint`, integer `number`, decimal `string`, `Field`).
 * @example
 * ```
 * Field(10n); // Field contruction from a big integer
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
 * const x = Field(-1); // Valid Field construction from negative number
 * const y = Field(Field.ORDER - 1n); // equivalent to `x`
 * ```
 *
 * **Important**: All the functions defined on a Field (arithmetic, logic, etc.) take their arguments as "field-like". A Field itself is also defined as a "field-like" element.
 *
 * @param value - the value to convert to a {@link Field}
 *
 * @return A {@link Field} with the value converted from the argument
 */
declare function Field(value: Field | number | string | boolean | bigint): Field;

declare class Field {
  /**
   * Coerce anything "field-like" (bigint, boolean, number, string, and {@link Field}) to a {@link Field}.
   * A {@link Field} is an element of a prime order field. Every other provable type is build using the {@link Field} type.
   * 
   * The field is the [pasta base field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) of order 2^254 + 0x224698fc094cf91b992d30ed00000001 ({@link Field.ORDER}).
   * 
   * You can create a new Field from everything "field-like" (`bigint`, integer `number`, decimal `string`, `Field`).
   * @example
   * ```
   * new Field(10n); // Field contruction from a big integer
   * new Field(100); // Field construction from a number
   * new Field("1"); // Field construction from a decimal string
   * ```
   *
   * **Beware**: Fields can _not_ be constructed from fractional numbers or alphanumeric strings:
   * ```ts
   * new Field(3.141); // ERROR: Cannot convert a float to a field element
   * new Field("abc"); // ERROR: Invalid argument "abc"
   * ```
   * 
   * Creating a {@link Field} from a negative number can result in unexpected behavior if you are not familiar with [modular arithmetic](https://en.wikipedia.org/wiki/Modular_arithmetic).```
   * @example
   * ```
   * const x = new Field(-1); // Valid Field construction from negative number
   * const y = new Field(Field.ORDER - 1n); // equivalent to `x`
   * ```
   * 
   * **Important**: All the functions defined on a Field (arithmetic, logic, etc.) take their arguments as "field-like". A {@link Field} itself is also defined as a "field-like" value.
   * 
   * @param value - the value to coerce to a {@link Field}
   * 
   * @return A {@link Field} element which the value coerced from the argument in the pasta field.
   */
  constructor(value: Field | number | string | boolean | bigint);

  /**
   * Negate a {@link Field}. This is equivalent to multiplying the {@link Field} by -1.
   *
   * @example
   * ```ts
   * const negOne = Field(1).neg();
   * negOne.assertEquals(-1);
   * ```
   * 
   * @example
   * ```ts
   * const someField = Field(42);
   * someField.neg().assertEquals(someField.mul(Field(-1))); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * **Warning**: This is a modular negation. For details, see the {@link sub} method.
   * 
   * @return A {@link Field} element that is equivalent to the element multiplied by -1.
   */
  neg(): Field;

  /**
   * [Modular inverse](https://en.wikipedia.org/wiki/Modular_multiplicative_inverse) of this {@link Field} element. Equivalent to 1 divided by this {@link Field}, in the sense of modular arithmetic. 
   *
   * @example
   * ```ts
   * const someField = Field(42);
   * const inverse = someField.inv();
   * inverse.assertEquals(Field(1).div(example)); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * **Warning**: This is a modular inverse. See {@link div} method for more details.
   *
   * @return A {@link Field} element that is equivalent to one divided by this element.
   */
  inv(): Field;

  /**
   * Add a "field-like" value to this {@link Field} element.
   *
   * @example
   * ```ts
   * const x = Field(3);
   * const sum = x.add(5);
   * 
   * sum.assertEquals(Field(8));
   * ```
   * 
   * **Warning**: This is a modular addition in the pasta field.
   * @example
   * ```ts
   * const x = Field(1);
   * const sum = x.add(Field(-7));
   * 
   * // If you try to print sum - `console.log(sum.toBigInt())` - you will realize that it prints a very big integer because this is modular arithmetic, and 1 + (-7) circles around the field to become p - 6.
   * // You can use the reverse operation of addition (substraction) to prove the sum is calculated correctly.
   * 
   * sum.sub(x).assertEquals(Field(-7));
   * sum.sub(Field(-7)).assertEquals(x);
   * ```
   * 
   * @param value - a "field-like" value to add to the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular addition of the two value.
   */
  add(value: Field | number | string | boolean): Field;

  /**
   * Substract another "field-like" value from this {@link Field} element.
   *
   * @example
   * ```ts
   * const x = Field(3);
   * const difference = x.sub(5);
   * 
   * difference.assertEquals(Field(-2));
   * ```
   * 
   * **Warning**: This is a modular substraction in the pasta field.
   * 
   * @example
   * ```ts
   * const x = Field(1);
   * const difference = x.sub(Field(2));
   * 
   * // If you try to print difference - `console.log(difference.toBigInt())` - you will realize that it prints a very big integer because this is modular arithmetic, and 1 - 2 circles around the field to become p - 1.
   * // You can use the reverse operation of substraction (addition) to prove the difference is calculated correctly.
   * difference.add(Field(2)).assertEquals(x);
   * ```
   * 
   * @param value - a "field-like" value to substract from the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular difference of the two value.
   */
  sub(value: Field | number | string | boolean): Field;

  /**
   * Multiply another "field-like" value with this {@link Field} element.
   *
   * @example
   * ```ts
   * const x = Field(3);
   * const product = x.mul(Field(5));
   * 
   * product.assertEquals(Field(15));
   * ```
   * 
   * @param value - a "field-like" value to multiply with the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular difference of the two value.
   */
  mul(value: Field | number | string | boolean): Field;

  /**
   * Divide another "field-like" value through this {@link Field}.
   *
   * @example
   * ```ts
   * const x = Field(6);
   * const quotient = x.div(Field(3));
   * 
   * quotient.assertEquals(Field(2));
   * ```
   * 
   * **Warning**: This is a modular division in the pasta field. You can think this as the reverse operation of modular multiplication.
   * 
   * @example
   * ```ts
   * const x = Field(2);
   * const y = Field(5);
   * 
   * const quotient = x.div(y);
   * 
   * // If you try to print quotient - `console.log(quotient.toBigInt())` - you will realize that it prints a very big integer because this is a modular inverse.
   * // You can use the reverse operation of division (multiplication) to prove the quotient is calculated correctly.
   * 
   * quotient.mul(y).assertEquals(x);
   * ```
   * 
   * @param value - a "field-like" value to divide with the {@link Field}.
   * 
   * @return A {@link Field} element equivalent to the modular division of the two value.
   */
  div(value: Field | number | string | boolean): Field;

  /**
   * Square this {@link Field} element.
   *
   * @example
   * ```ts
   * const someField = Field(7);
   * const square = someField.square();
   * 
   * square.assertEquals(someField.mul(someField)); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * ** Warning: This is a modular multiplication. See `mul()` method for more details.
   * 
   * @return A {@link Field} element equivalent to the multiplication of the {@link Field} element with itself.
   */
  square(): Field;

  /**
   * Take the square root of this {@link Field} element.
   *
   * @example
   * ```ts
   * const someField = Field(42);
   * const squareRoot = someField.sqrt();
   * 
   * squareRoot.mul(squareRoot).assertEquals(someField); // This statement is always true regardless of the value of `someField`
   * ```
   * 
   * **Warning**: This is a modular square root. See `div()` method for more details.
   * 
   * @return A {@link Field} element equivalent to the square root of the {@link Field} element.
   */
  sqrt(): Field;

  /**
   * Serialize the {@link Field} to a string, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in an unreadable output.
   * 
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the {@link Field}. Use the operation only during debugging.
   * 
   * @example
   * ```ts
   * const someField = Field(42);
   * console.log(someField.toString());
   * ```
   * 
   * @return A string equivalent to the string representation of the Field.
   */
  toString(): string;

  /**
   * Serialize the {@link Field} to a bigint, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in an unreadable output.
   * 
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the bigint representation of the {@link Field}. Use the operation only during debugging.
   * 
   * @example
   * ```ts
   * const someField = Field(42);
   * console.log(someField.toBigInt());
   * ```
   * 
   * @return A bigint equivalent to the bigint representation of the Field.
   */
  toBigInt(): bigint;

  /**
   * Serialize the {@link Field} to a JSON string, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in an unreadable output.
   * 
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the JSON string representation of the {@link Field}. Use the operation only during debugging.
   * 
   * @example
   * ```ts
   * const someField = Field(42);
   * console.log(someField.toJSON());
   * ```
   * 
   * @return A string equivalent to the JSON representation of the {@link Field}.
   */
  toJSON(): string;

  /**
   * This function is the implementation of {@link Provable.toFields} in {@link Field} type.
   * You can use this array to calculate the {@link Poseidon} hash of a {@link Field}.
   * This data structure will be always an array of length 1, where the first and only element equals the {@link Field} itself.
   * 
   * @return A {@link Field} array of length 1 created from this {@link Field}.
   */
  toFields(): Field[];

  /**
   * Check if this {@link Field} is less than another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used prove to the validity of this statement.
   *
   * @example
   * ```ts
   * Field(2).lessThan(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behavior when used with negative inputs or modular division.
   * 
   * @example
   * ```ts
   * Field(1).div(Field(3)).lessThan(Field(1).div(Field(2))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the "field-like" value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is less than another "field-like" value.
   */
  lessThan(value: Field | number | string | boolean): Bool;

  /**
   * Check if this {@link Field} is less than or equal to another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * Field(3).lessThanOrEqual(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behaviour when used with negative inputs or modular division.
   * 
   * @example
   * ```ts
   * Field(1).div(Field(3)).lessThanOrEqual(Field(1).div(Field(2))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the "field-like" value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is less than or equal another "field-like" value.
   */
  lessThanOrEqual(value: Field | number | string | boolean): Bool;

  /**
   * Check if this {@link Field} is greater than another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * Field(5).greaterThan(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behaviour when used with negative inputs or modular division.
   * 
   * @example
   * ```ts
   * Field(1).div(Field(2)).greaterThan(Field(1).div(Field(3))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the "field-like" value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is greater than another "field-like" value.
   */
  greaterThan(value: Field | number | string | boolean): Bool;
  
  /**
   * Check if this {@link Field} is greater than or equal another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * Field(3).greaterThanOrEqual(3).assertEquals(Bool(true));
   * ```
   * 
   * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behaviour when used with negative inputs or modular division.
   * 
   * @example
   * ```ts
   * Field(1).div(Field(2)).greaterThanOrEqual(Field(1).div(Field(3))).assertEquals(Bool(true)); // This code will throw an error
   * ```
   * 
   * @param value - the "field-like" value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is greater than or equal another "field-like" value.
   */
  greaterThanOrEqual(value: Field | number | string | boolean): Bool;

  /**
   * Assert that this {@link Field} is less than another "field-like" value.
   * Calling this function is equivalent to `Field(...).lessThan(...).assertEquals(Bool(true))`.
   * See {@link Field.lessThan} for more details.
   * 
   * **Important**: If an assertion fails, the code throws an error.
   * 
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThan(value: Field | number | string | boolean, message?: string): void;
  
  /**
   * Assert that this {@link Field} is less than or equal to another "field-like" value.
   * Calling this function is equivalent to `Field(...).lessThanOrEqual(...).assertEquals(Bool(true))`.
   * See {@link Field.lessThanOrEqual} for more details.
   * 
   * **Important**: If an assertion fails, the code throws an error.
   * 
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThanOrEqual(value: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is greater than another "field-like" value.
   * Calling this function is equivalent to `Field(...).greaterThan(...).assertEquals(Bool(true))`.
   * See {@link Field.greaterThan} for more details.
   * 
   * **Important**: If an assertion fails, the code throws an error.
   * 
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThan(value: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is greater than or equal to another "field-like" value.
   * Calling this function is equivalent to `Field(...).greaterThanOrEqual(...).assertEquals(Bool(true))`.
   * See {@link Field.greaterThanOrEqual} for more details.
   * 
   * **Important**: If an assertion fails, the code throws an error.
   * 
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
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
   * Assert that this {@link Field} is equal another "field-like" value.
   * Calling this function is equivalent to `Field(...).equals(...).assertEquals(Bool(true))`.
   * See {@link Field.equals} for more details.
   * 
   * **Important**: If an assertion fails, the code throws an error.
   * 
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertEquals(value: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is equal to 1 or 0 as a "field-like" value.
   * Calling this function is equivalent to `Bool.or(Field(...).equals(1), Field(...).equals(0)).assertEquals(Bool(true))`.
   * 
   * **Important**: If an assertion fails, the code throws an error.
   * 
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertBool(message?: string): void;

  /**
   * @deprecated Deprecated - use {@link assertBool} instead.
   */
  assertBoolean(message?: string): void;

  /**
   * Checks if this {@link Field} is 0,
   * Calling this function is equivalent to `Field(...).equals(Field(0))`.
   * See {@link Field.equals} for more details.
   * 
   * @return A {@link Bool} representing if this {@link Field} equals 0.
   */
  isZero(): Bool;

  /**
   * Returns an array of {@link Bool} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link Field} element.
   * 
   * **Warning**: This is a costly operation in a zk proof, because a Field can have 255 bits, each of which has to be constrained to prove that the bits equal the original field element. To reduce the maximum amount of bits that the input can have, use this method with the optional `length` argument.
   * 
   * @return An array of {@link Bool} element representing little endian binary representation of this {@link Field}.
   */
  toBits(): Bool[];

  /**
   * Returns an array of {@link Bool} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link Field} element.
   * Throws an error if the element cannot fit in `length` bits.
   * 
   * **Warning**: The cost of this operation in a zk proof depends on the `length` you specify, so prefer a smaller value if possible.
   * 
   * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
   * 
   * @return An array of {@link Bool} element representing little endian binary representation of this {@link Field}.
   */
  toBits(length: number): Bool[];

  /**
   * Check if this {@link Field} is equal another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * Field(5).equals(5).assertEquals(Bool(true));
   * ```
   * 
   * @param value - the "field-like" value to compare with this {@link Field}.
   * 
   * @return A {@link Bool} representing if this {@link Field} is equal another "field-like" value.
   */
  equals(value: Field | number | string | boolean): Bool;

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   * 
   * In SnarkyJS, addition and scaling (multiplication of variables by a constant) of variables is represented as an AST - [abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree). For example, the expression `x.add(y).mul(2)` is represented as `Scale(2, Add(x, y))`.
   * 
   *  A new internal variable is created only when the variable is needed in a multiplicative or any higher level constraint (for example multiplication of two {@link Field} elements) to represent the operation.
   * 
   * The `seal()` function tells SnarkyJS to stop building an AST and create a new variable right away.
   * 
   * @return A {@link Field} element that is equal to the result of AST that was previously on this {@link Field} element.
   */
  seal(): Field;
  
  /**
   * Create a new {@link Field} element from the first `numBits` of this {@link Field} element.
   * As {@link Field} elements are represented using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness), the resulting {@link Field} element will equal the original one if the variable fits in `numBits` bits.
   * 
   * @param numBits - The number of bits to take from this {@link Field} element.
   * 
   * @return A {@link Field} element that is equal to the `numBits` of this {@link Field} element.
   */
  rangeCheckHelper(numBits: number): Field;

  /**
   * Check whether this {@link Field} element is a hard-coded constant in the Circuit.
   * If a {@link Field} is constructed outside a zkApp method, it is a constant.
   * 
   * @example
   * ```ts
   * console.log(Field(42).isConstant()); // True
   * ```
   * 
   * @example
   * ```ts
   * @method(x: Field) {
   *    console.log(x.isConstant()); // False
   * }
   * ```
   * 
   * @return A `boolean` showing if this {@link Field} is a constant or not.
   */
  isConstant(): boolean;

  /**
   * Create a {@link Field} element equivalent to this {@link Field} elements value, but it is a constant in the Circuit.
   * See {@link Field.isConstant} for more information about what is a constant {@link Field}.
   * 
   * @example
   * ```ts
   * const someField = Field(42);
   * someField.toConstant().assertEquals(someField); // Always true
   * ```
   * 
   * @return A constant {@link Field} element equivalent to this {@link Field} element.
   */
  toConstant(): Field;

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
   * @example
   * ```ts
   * console.log(Field.random().toBigInt()); // Run this code twice!
   * ```
   * 
   * @return A random {@link Field} element.
   */
  static random(): Field;

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   * 
   * Creates a {@link Field} from an array of length 1 serialized from {@link Field} elements.
   * Calling this function is equivalent to `fields[0]`, the first index of the {@link Field} array.
   * This function might seem unnecessary for Dapps since it is designed as the reverse function of {@link Field.toFields}.
   * 
   * @param fields - an array of length 1 serialized from {@link Field} elements.
   * 
   * @return The first {@link Field} element of the given array.
   */
  static fromFields(fields: Field[]): Field;

  /**
   * This function is the implementation of {@link Provable.sizeInFields} in {@link Field} type.
   * Size of the {@link Field} type is always 1, as it is the primitive type.
   * This function returns a `number`, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   * 
   * This function has the same utility as the {@link Field.sizeInFields}.
   * 
   * @example
   * ```ts
   * console.log(Field.sizeInFields()); // Prints 1
   * ```
   * 
   * @return A `number` representing the size of the {@link Field} type in terms of {@link Field} type itself.
   */
  static sizeInFields(): number;

  /**
   * This function is the implementation of {@link Provable.toFields} in {@link Field} type.
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
   * This function is the implementation of {@link Provable.toAuxiliary} in {@link Field} type.
   * As the primitive {@link Field} type has no auxiliary data associated with it, this function will always return an empty array.
   * 
   * @param value - The {@link Field} element to get the auxiliary data of, optional. If not provided, the function returns an empty array.
   */
  static toAuxiliary(value?: Field): [];

  /**
   * Convert a bit array into a {@link Field} element using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness)
   * The function fails if the element cannot fit given too many bits. Note that a {@link Field} element can be 254 bits at most.
   * 
   * **Important**: If the given `bytes` array is an array of `booleans` or {@link Bool} elements that all are `constant`, the resulting {@link Field} element will be a constant as well. Or else, if the given array is a mixture of constants and variables of {@link Bool} type, the resulting {@link Field} will be a variable as well.
   * 
   * @param bytes - An array of {@link Bool} or `boolean` type.
   * 
   * @return A {@link Field} element matching the [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of the given `bytes` array.
   */
  static fromBits(bytes: (Bool | boolean)[]): Field;

  /**
   * Serialize the given {@link Field} element to a JSON string, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in an unreadable output.
   * 
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the JSON string representation of the {@link Field}. Use the operation only during debugging.
   * 
   * @example
   * ```ts
   * const someField = Field(42);
   * console.log(Field.toJSON(someField));
   * ```
   * 
   * @param value - The JSON string to coerce the {@link Field} from.
   * 
   * @return A string equivalent to the JSON representation of the given {@link Field}.
   */
  static toJSON(value: Field): string;

  /**
   * Deserialize a JSON string containing a "field-like" value into a {@link Field} element.
   * 
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the {@link Field}.
   * 
   * @param value - the "field-like" value to coerce the {@link Field} from.
   * 
   * @return A {@link Field} coerced from the given JSON string.
   */
  static fromJSON(value: string): Field;

  /**
   * This function is the implementation of {@link Provable.check} in {@link Field} type.
   * 
   * As any {@link Provable} type can be a {@link Field}, this function does not create any assertions on the chain, so it basically does nothing :)
   * 
   * @param value - the {@link Field} element to check.
   */
  static check(value: Field): void;

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   * 
   * This function is the implementation of {@link Provable.toInput} in {@link Field} type.
   * 
   * @param value - The {@link Field} element to get the `input` array.
   * 
   * @return An object where the `fields` key is a {@link Field} array of length 1 created from this {@link Field}.
   * 
   */
  static toInput(value: Field): { fields: Field[] };

  /**
   * Create an array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link Field} element.
   * Note that the array has always 32 elements as the {@link Field} is a `finite-field` in the order of {@link Field.ORDER}.
   * 
   * @param value - The {@link Field} element to generate the array of bytes of.
   * 
   * @return An array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link Field} element.
   * 
   */
  static toBytes(value: Field): number[];

  /**
   * Coerce a new {@link Field} element using the [little-endian](https://en.wikipedia.org/wiki/Endianness) representation of the given `bytes` array.
   * Note that the given `bytes` array may have at most 32 elements as the {@link Field} is a `finite-field` in the order of {@link Field.ORDER}.
   * 
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the byte representation of the {@link Field}.
   * 
   * @param bytes - The bytes array to coerce the {@link Field} from.
   * 
   * @return A new {@link Field} element created using the [little-endian](https://en.wikipedia.org/wiki/Endianness) representation of the given `bytes` array.
   */
  static fromBytes(bytes: number[]): Field;

  /**
   * 
   * @param bytes 
   * @param offset 
   */
  static readBytes(
    bytes: number[],
    offset: number
  ): [value: Field, offset: number];

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   * 
   * As all {@link Field} elements have 31 bits, this function returns 31.
   * 
   * @return The size of a {@link Field} element - 31.
   */
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
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string;
  /**
   * Serialize the {@link Bool} to a JSON string.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
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
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  static toJSON(x: Bool): boolean;
  /**
   * Deserialize a JSON structure into a {@link Bool}.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Field.
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

type Gate = {
  type: string;
  wires: { row: number; col: number }[];
  coeffs: string[];
};

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
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Scalar.
   */
  static toJSON(x: Scalar): string;
  /**
   * Deserialize a JSON structure into a {@link Scalar}.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Scalar.
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
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Group.
   */
  static toJSON(x: Group): { x: string; y: string };
  /**
   * Deserialize a JSON structure into a {@link Group}.
   * This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the Group.
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
  hashToGroup(
    input: Field[],
    isChecked: boolean
  ): {
    x: Field;
    y: Field;
  };
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
 * @deprecated `shutdown()` is no longer needed, and is a no-op. Remove it from your code.
 */
declare const shutdown: () => Promise<undefined>;

/**
 * @deprecated `await isReady` is no longer needed. Remove it from your code.
 */
declare let isReady: Promise<undefined>;

declare namespace Pickles {
  type Proof = unknown; // opaque to js
  type Statement = { input: Field[]; output: Field[] };
  type ProofWithStatement = {
    publicInput: Field[];
    publicOutput: Field[];
    proof: Proof;
  };
  type Rule = {
    identifier: string;
    main: (publicInput: Field[]) => {
      publicOutput: Field[];
      previousStatements: Statement[];
      shouldVerify: Bool[];
    };
    proofsToVerify: ({ isSelf: true } | { isSelf: false; tag: unknown })[];
  };
  type Prover = (
    publicInput: Field[],
    previousProofs: Proof[]
  ) => Promise<{ publicOutput: Field[]; proof: Proof }>;
}

declare const Pickles: {
  /**
   * This is the core API of the `Pickles` library, exposed from OCaml to JS. It takes a list of circuits --
   * each in the form of a function which takes a public input `{ accountUpdate: Field; calls: Field }` as argument --,
   * and augments them to add the necessary circuit logic to recursively merge in earlier proofs.
   *
   * After forming those augmented circuits in the finite field represented by `Field`, they gets wrapped in a
   * single recursive circuit in the field represented by `Scalar`. Any SmartContract proof will go through both of these steps,
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
    signature: { publicInputSize: number; publicOutputSize: number }
  ) => {
    provers: Pickles.Prover[];
    verify: (
      statement: Pickles.Statement,
      proof: Pickles.Proof
    ) => Promise<boolean>;
    tag: unknown;
    getVerificationKeyArtifact: () => { data: string; hash: string };
  };

  verify(
    statement: Pickles.Statement,
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
