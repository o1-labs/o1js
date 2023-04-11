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
 * An element of a finite field.
 */
declare function Field(x: Field | number | string | boolean | bigint): Field;
declare class Field {
  /**
   * Coerces anything field-like to a {@link Field}.
   */
  constructor(x: Field | number | string | boolean | bigint);

  /**
   * Negates this {@link Field}. This is equivalent to multiplying the {@link Field}
   * by -1.
   *
   * ```typescript
   * const negOne = Field(1).neg();
   * negOne.assertEquals(-1);
   * ```
   */
  neg(): Field;

  /**
   * Inverts this {@link Field} element.
   *
   * ```typescript
   * const invX = x.inv();
   * invX.assertEquals(Field(1).div(x));
   * ```
   *
   * @return A {@link Field} element that is equivalent to one divided by this element.
   */
  inv(): Field;

  /**
   * Adds this {@link Field} element to another to a {@link Field} element.
   *
   * ```ts
   * let a = Field(3);
   * let sum = a.add(5)
   * ```
   */
  add(y: Field | number | string | boolean): Field;

  /**
   * Subtracts another {@link Field}-like element from this one.
   */
  sub(y: Field | number | string | boolean): Field;

  /**
   * Multiplies this {@link Field} element with another coercible to a field.
   */
  mul(y: Field | number | string | boolean): Field;

  /**
   * Divides this {@link Field} element through another coercible to a field.
   */
  div(y: Field | number | string | boolean): Field;

  /**
   * Squares this {@link Field} element.
   *
   * ```typescript
   * const x2 = x.square();
   * x2.assertEquals(x.mul(x));
   * ```
   */
  square(): Field;

  /**
   * Square roots this {@link Field} element.
   *
   * ```typescript
   * x.square().sqrt().assertEquals(x);
   * ```
   */
  sqrt(): Field;

  /**
   * Serialize the {@link Field} to a string, e.g. for printing.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toString(): string;
  /**
   * Serialize this instance of a {@link Field} to a bigint.
   * This operation does NOT affect the circuit and can't be used to prove anything about the bigint representation of the Field.
   */
  toBigInt(): bigint;
  /**
   * Serialize this instance of a {@link Field} to a JSON string.
   * This operation does NOT affect the circuit and can't be used to prove anything about the string representation of the Field.
   */
  toJSON(): string;

  /**
   * Returns the size of this type.
   */
  sizeInFields(): number;

  /**
   * Serializes this data structure into {@link Field} elements.
   */
  toFields(): Field[];

  /**
   *
   * Check if this {@link Field} is lower than another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).lessThan(3); // Bool(true)
   * ```
   */
  lessThan(y: Field | number | string | boolean): Bool;
  /**
   *
   * Check if this {@link Field} is lower than or equal to another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).lessThanOrEqual(3); // Bool(true)
   * ```
   */
  lessThanOrEqual(y: Field | number | string | boolean): Bool;
  /**
   *
   * Check if this {@link Field} is greater than another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).greaterThan(1); // Bool(true)
   * ```
   */
  greaterThan(y: Field | number | string | boolean): Bool;
  /**
   *
   * Check if this {@link Field} is greater than or equal to another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).greaterThanOrEqual(1); // Bool(true)
   * ```
   */
  greaterThanOrEqual(y: Field | number | string | boolean): Bool;

  // TODO: Make these long form version
  /**
   *
   * Assert that this {@link Field} is lower than another Field-like value.
   *
   * ```ts
   * Field(1).assertLessThan(2);
   * ```
   *
   */
  assertLessThan(y: Field | number | string | boolean, message?: string): void;
  /**
   *
   * Assert that this {@link Field} is lower than or equal to another Field-like value.
   *
   * ```ts
   * Field(1).assertLessThanOrEqual(2);
   * ```
   *
   */
  assertLessThanOrEqual(
    y: Field | number | string | boolean,
    message?: string
  ): void;
  /**
   *
   * Assert that this {@link Field} is greater than another Field-like value.
   *
   * ```ts
   * Field(1).assertGt(0);
   * ```
   *
   */
  assertGreaterThan(
    y: Field | number | string | boolean,
    message?: string
  ): void;
  /**
   *
   * Assert that this {@link Field} is greater than or equal to another Field-like value.
   *
   * ```ts
   * Field(1).assertGte(0);
   * ```
   *
   */
  assertGreaterThanOrEqual(
    y: Field | number | string | boolean,
    message?: string
  ): void;

  /**
   * @deprecated Deprecated - use {@link lessThan} instead
   *
   * Check if this {@link Field} is lower than another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).lt(3); // Bool(true)
   * ```
   */
  lt(y: Field | number | string | boolean): Bool;
  /**
   * @deprecated Deprecated - use {@link lessThanOrEqual} instead
   *
   * Check if this {@link Field} is lower than or equal to another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).lte(3); // Bool(true)
   * ```
   */
  lte(y: Field | number | string | boolean): Bool;
  /**
   * @deprecated Deprecated - use `{@link greaterThan}` instead
   *
   * Check if this {@link Field} is greater than another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).gt(1); // Bool(true)
   * ```
   */
  gt(y: Field | number | string | boolean): Bool;
  /**
   * @deprecated Deprecated - use {@link greaterThanOrEqual} instead
   *
   * Check if this {@link Field} is greater than or equal to another Field-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).gte(1); // Bool(true)
   * ```
   */
  gte(y: Field | number | string | boolean): Bool;

  // TODO: Make these long form version
  /**
   * @deprecated Deprecated - use {@link assertLessThan} instead
   *
   * Assert that this {@link Field} is lower than another Field-like value.
   *
   * ```ts
   * Field(1).assertLessThan(2);
   * ```
   *
   */
  assertLt(y: Field | number | string | boolean, message?: string): void;
  /**
   * @deprecated Deprecated - use {@link assertLessThanOrEqual}instead
   *
   * Assert that this {@link Field} is lower than or equal to another Field-like value.
   *
   * ```ts
   * Field(1).assertLte(2);
   * ```
   */
  assertLte(y: Field | number | string | boolean, message?: string): void;
  /**
   * @deprecated Deprecated - use {@link assertGreaterThan} instead
   *
   * Assert that this {@link Field} is greater than another Field-like value.
   *
   * ```ts
   * Field(1).assertGt(0);
   * ```
   *
   */
  assertGt(y: Field | number | string | boolean, message?: string): void;
  /**
   *  @deprecated Deprecated - use {@link assertGreaterThanOrEqual} instead
   *
   * Assert that this {@link Field} is greater than or equal to another Field-like value.
   *
   * ```ts
   * Field(1).assertGte(0);
   * ```
   *
   */
  assertGte(y: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} equals another Field-like value.
   * Throws an error if the assertion fails.
   *
   * ```ts
   * Field(1).assertEquals(1);
   * ```
   */
  assertEquals(y: Field | number | string | boolean, message?: string): void;

  /**
   * Assert that this {@link Field} is either 0 or 1.
   *
   * ```ts
   * Field(0).assertBool();
   * ```
   *
   */
  assertBool(message?: string): void;

  /**
   * @deprecated Deprecated - use {@link assertBool} instead
   *
   * Assert that this {@link Field} is either 0 or 1.
   *
   * ```ts
   * Field(0).assertBoolean();
   * ```
   *
   */
  assertBoolean(message?: string): void;

  isZero(): Bool;

  /**
   * Little endian binary representation of the field element.
   */
  toBits(): Bool[];

  /**
   * Little endian binary representation of the field element.
   * Fails if the field element cannot fit in `length` bits.
   */
  toBits(length: number): Bool[];

  /**
   * Check if this {@link Field} equals another {@link Field}-like value.
   * Returns a {@link Bool}.
   *
   * ```ts
   * Field(2).equals(2); // Bool(true)
   * ```
   */
  equals(y: Field | number | string | boolean): Bool;

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
   * The number 1 as a [[`Field`]].
   */
  static one: Field;
  /**
   * @deprecated Static constant values on Field are deprecated in favor of using the constructor `Field(0)`.
   *
   * The number 0 as a [[`Field`]].
   */
  static zero: Field;
  /**
   * @deprecated Static constant values on Field are deprecated in favor of using the constructor `Field(-1)`.
   *
   * The number -1 as a [[`Field`]].
   */
  static minusOne: Field;
  /**
   * The field order as a `bigint`.
   */
  static ORDER: bigint;

  /**
   * A random field element.
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
   * Creates a data structure from an array of serialized {@link Field} elements.
   */
  static fromFields(fields: Field[]): Field;

  /**
   * Returns the size of this type.
   */
  static sizeInFields(): number;

  /**
   * Static method to serialize a {@link Field} into an array of {@link Field} elements.
   */
  static toFields(x: Field): Field[];
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
