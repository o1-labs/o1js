import { Snarky, Provable } from '../snarky.js';
import { Field as Fp } from '../provable/field-bigint.js';
import { defineBinable } from '../bindings/lib/binable.js';
import type { NonNegativeInteger } from '../bindings/crypto/non-negative.js';
import { asProver, inCheckedComputation } from './provable-context.js';
import { Bool } from './bool.js';
import { assert } from './errors.js';

// external API
export { Field };

// internal API
export {
  ConstantField,
  FieldType,
  FieldVar,
  FieldConst,
  isField,
  withMessage,
  readVarMessage,
  toConstantField,
  toFp,
};

type FieldConst = [0, bigint];

function constToBigint(x: FieldConst): Fp {
  return x[1];
}
function constFromBigint(x: Fp): FieldConst {
  return [0, Fp(x)];
}

const FieldConst = {
  fromBigint: constFromBigint,
  toBigint: constToBigint,
  equal(x: FieldConst, y: FieldConst) {
    return x[1] === y[1];
  },
  [0]: constFromBigint(0n),
  [1]: constFromBigint(1n),
  [-1]: constFromBigint(-1n),
};

enum FieldType {
  Constant,
  Var,
  Add,
  Scale,
}

/**
 * `FieldVar` is the core data type in snarky. It is eqivalent to `Cvar.t` in OCaml.
 * It represents a field element that is part of provable code - either a constant or a variable.
 *
 * **Variables** end up filling the witness columns of a constraint system.
 * Think of a variable as a value that has to be provided by the prover, and that has to satisfy all the
 * constraints it is involved in.
 *
 * **Constants** end up being hard-coded into the constraint system as gate coefficients.
 * Think of a constant as a value that is known publicly, at compile time, and that defines the constraint system.
 *
 * Both constants and variables can be combined into an AST using the Add and Scale combinators.
 */
type FieldVar =
  | [FieldType.Constant, FieldConst]
  | [FieldType.Var, number]
  | [FieldType.Add, FieldVar, FieldVar]
  | [FieldType.Scale, FieldConst, FieldVar];

type ConstantFieldVar = [FieldType.Constant, FieldConst];

const FieldVar = {
  constant(x: bigint | FieldConst): ConstantFieldVar {
    let x0 = typeof x === 'bigint' ? FieldConst.fromBigint(x) : x;
    return [FieldType.Constant, x0];
  },
  isConstant(x: FieldVar): x is ConstantFieldVar {
    return x[0] === FieldType.Constant;
  },
  add(x: FieldVar, y: FieldVar): FieldVar {
    if (FieldVar.isConstant(x) && x[1][1] === 0n) return y;
    if (FieldVar.isConstant(y) && y[1][1] === 0n) return x;
    if (FieldVar.isConstant(x) && FieldVar.isConstant(y)) {
      return FieldVar.constant(Fp.add(x[1][1], y[1][1]));
    }
    return [FieldType.Add, x, y];
  },
  scale(c: bigint | FieldConst, x: FieldVar): FieldVar {
    let c0 = typeof c === 'bigint' ? FieldConst.fromBigint(c) : c;
    if (c0[1] === 0n) return FieldVar.constant(0n);
    if (c0[1] === 1n) return x;
    if (FieldVar.isConstant(x)) {
      return FieldVar.constant(Fp.mul(c0[1], x[1][1]));
    }
    return [FieldType.Scale, c0, x];
  },
  [0]: [FieldType.Constant, FieldConst[0]] satisfies ConstantFieldVar,
  [1]: [FieldType.Constant, FieldConst[1]] satisfies ConstantFieldVar,
  [-1]: [FieldType.Constant, FieldConst[-1]] satisfies ConstantFieldVar,
};

type ConstantField = Field & { value: ConstantFieldVar };

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
class Field {
  value: FieldVar;

  /**
   * The order of the pasta curve that {@link Field} type build on as a `bigint`.
   * Order of the {@link Field} is 28948022309329048855892746252171976963363056481941560715954676764349967630337.
   */
  static ORDER = Fp.modulus;

  /**
   * Coerce anything "field-like" (bigint, number, string, and {@link Field}) to a Field.
   */
  constructor(x: bigint | number | string | Field | FieldVar | FieldConst) {
    if (Field.#isField(x)) {
      this.value = x.value;
      return;
    }
    if (Array.isArray(x)) {
      if (typeof x[1] === 'bigint') {
        // FieldConst
        this.value = FieldVar.constant(x as FieldConst);
        return;
      } else {
        // FieldVar
        this.value = x as FieldVar;
        return;
      }
    }
    // TODO this should handle common values efficiently by reading from a lookup table
    this.value = FieldVar.constant(Fp(x));
  }

  // helpers
  static #isField(
    x: bigint | number | string | Field | FieldVar | FieldConst
  ): x is Field {
    return x instanceof Field;
  }
  static #toConst(x: bigint | number | string | ConstantField): FieldConst {
    if (Field.#isField(x)) return x.value[1];
    return FieldConst.fromBigint(Fp(x));
  }
  static #toVar(x: bigint | number | string | Field): FieldVar {
    if (Field.#isField(x)) return x.value;
    return FieldVar.constant(Fp(x));
  }
  static from(x: bigint | number | string | Field): Field {
    if (Field.#isField(x)) return x;
    return new Field(x);
  }

  /**
   * Check whether this {@link Field} element is a hard-coded constant in the constraint system.
   * If a {@link Field} is constructed outside a zkApp method, it is a constant.
   *
   * @example
   * ```ts
   * console.log(Field(42).isConstant()); // true
   * ```
   *
   * @example
   * ```ts
   * \@method myMethod(x: Field) {
   *    console.log(x.isConstant()); // false
   * }
   * ```
   *
   * @return A `boolean` showing if this {@link Field} is a constant or not.
   */
  isConstant(): this is { value: ConstantFieldVar } {
    return this.value[0] === FieldType.Constant;
  }

  #toConstant(name: string): ConstantField {
    return toConstantField(this, name, 'x', 'field element');
  }

  /**
   * Create a {@link Field} element equivalent to this {@link Field} element's value,
   * but is a constant.
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
  toConstant(): ConstantField {
    return this.#toConstant('toConstant');
  }

  /**
   * Serialize the {@link Field} to a bigint, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in unreadable output.
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
  toBigInt() {
    let x = this.#toConstant('toBigInt');
    return FieldConst.toBigint(x.value[1]);
  }

  /**
   * Serialize the {@link Field} to a string, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in unreadable output.
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
  toString() {
    return this.#toConstant('toString').toBigInt().toString();
  }

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
  assertEquals(y: Field | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (this.toBigInt() !== toFp(y)) {
          throw Error(`Field.assertEquals(): ${this} != ${y}`);
        }
        return;
      }
      Snarky.field.assertEqual(this.value, Field.#toVar(y));
    } catch (err) {
      throw withMessage(err, message);
    }
  }

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
  add(y: Field | bigint | number | string): Field {
    if (this.isConstant() && isConstant(y)) {
      return new Field(Fp.add(this.toBigInt(), toFp(y)));
    }
    // return new AST node Add(x, y)
    let z = Snarky.field.add(this.value, Field.#toVar(y));
    return new Field(z);
  }

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
  neg() {
    if (this.isConstant()) {
      return new Field(Fp.negate(this.toBigInt()));
    }
    // return new AST node Scale(-1, x)
    let z = Snarky.field.scale(FieldConst[-1], this.value);
    return new Field(z);
  }

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
  sub(y: Field | bigint | number | string) {
    return this.add(Field.from(y).neg());
  }

  /**
   * Checks if this {@link Field} is even. Returns `true` for even elements and `false` for odd elements.
   *
   * @example
   * ```ts
   * let a = Field(5);
   * a.isEven(); // false
   * a.isEven().assertTrue(); // throws, as expected!
   *
   * let b = Field(4);
   * b.isEven(); // true
   * b.isEven().assertTrue(); // does not throw, as expected!
   * ```
   */
  isEven() {
    if (this.isConstant()) return new Bool(this.toBigInt() % 2n === 0n);

    let [, isOddVar, xDiv2Var] = Snarky.exists(2, () => {
      let bits = Fp.toBits(this.toBigInt());
      let isOdd = bits.shift()! ? 1n : 0n;

      return [
        0,
        FieldConst.fromBigint(isOdd),
        FieldConst.fromBigint(Fp.fromBits(bits)),
      ];
    });

    let isOdd = new Field(isOddVar);
    let xDiv2 = new Field(xDiv2Var);

    // range check for 253 bits
    // WARNING: this makes use of a special property of the Pasta curves,
    // namely that a random field element is < 2^254 with overwhelming probability
    // TODO use 88-bit RCs to make this more efficient
    xDiv2.toBits(253);

    // check composition
    xDiv2.mul(2).add(isOdd).assertEquals(this);

    return new Bool(isOddVar).not();
  }

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
  mul(y: Field | bigint | number | string): Field {
    if (this.isConstant() && isConstant(y)) {
      return new Field(Fp.mul(this.toBigInt(), toFp(y)));
    }
    // if one of the factors is constant, return Scale AST node
    if (isConstant(y)) {
      let z = Snarky.field.scale(Field.#toConst(y), this.value);
      return new Field(z);
    }
    if (this.isConstant()) {
      let z = Snarky.field.scale(this.value[1], y.value);
      return new Field(z);
    }
    // create a new witness for z = x*y
    let z = Snarky.existsVar(() =>
      FieldConst.fromBigint(Fp.mul(this.toBigInt(), toFp(y)))
    );
    // add a multiplication constraint
    Snarky.field.assertMul(this.value, y.value, z);
    return new Field(z);
  }

  /**
   * [Modular inverse](https://en.wikipedia.org/wiki/Modular_multiplicative_inverse) of this {@link Field} element.
   * Equivalent to 1 divided by this {@link Field}, in the sense of modular arithmetic.
   *
   * Proves that this Field is non-zero, or throws a "Division by zero" error.
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
  inv() {
    if (this.isConstant()) {
      let z = Fp.inverse(this.toBigInt());
      if (z === undefined) throw Error('Field.inv(): Division by zero');
      return new Field(z);
    }
    // create a witness for z = x^(-1)
    let z = Snarky.existsVar(() => {
      let z = Fp.inverse(this.toBigInt()) ?? 0n;
      return FieldConst.fromBigint(z);
    });
    // constrain x * z === 1
    Snarky.field.assertMul(this.value, z, FieldVar[1]);
    return new Field(z);
  }

  /**
   * Divide another "field-like" value through this {@link Field}.
   *
   * Proves that the denominator is non-zero, or throws a "Division by zero" error.
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
  div(y: Field | bigint | number | string) {
    // this intentionally uses 2 constraints instead of 1 to avoid an unconstrained output when dividing 0/0
    // (in this version, division by 0 is strictly not allowed)
    return this.mul(Field.from(y).inv());
  }

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
  square() {
    if (this.isConstant()) {
      return new Field(Fp.square(this.toBigInt()));
    }
    // create a new witness for z = x^2
    let z = Snarky.existsVar(() =>
      FieldConst.fromBigint(Fp.square(this.toBigInt()))
    );
    // add a squaring constraint
    Snarky.field.assertSquare(this.value, z);
    return new Field(z);
  }

  /**
   * Take the square root of this {@link Field} element.
   *
   * Proves that the Field element has a square root in the finite field, or throws if it doesn't.
   *
   * @example
   * ```ts
   * let z = x.sqrt();
   * z.mul(z).assertEquals(x); // true for every `x`
   * ```
   *
   * **Warning**: This is a modular square root, which is any number z that satisfies z*z = x (mod p).
   * Note that, if a square root z exists, there also exists a second one, -z (which is different if z != 0).
   * Therefore, this method leaves an adversarial prover the choice between two different values to return.
   *
   * @return A {@link Field} element equivalent to the square root of the {@link Field} element.
   */
  sqrt() {
    if (this.isConstant()) {
      let z = Fp.sqrt(this.toBigInt());
      if (z === undefined)
        throw Error(
          `Field.sqrt(): input ${this} has no square root in the field.`
        );
      return new Field(z);
    }
    // create a witness for sqrt(x)
    let z = Snarky.existsVar(() => {
      let z = Fp.sqrt(this.toBigInt()) ?? 0n;
      return FieldConst.fromBigint(z);
    });
    // constrain z * z === x
    Snarky.field.assertSquare(z, this.value);
    return new Field(z);
  }

  /**
   * @deprecated use `x.equals(0)` which is equivalent
   */
  isZero() {
    if (this.isConstant()) {
      return new Bool(this.toBigInt() === 0n);
    }
    // create witnesses z = 1/x, or z=0 if x=0,
    // and b = 1 - zx
    let [, b, z] = Snarky.exists(2, () => {
      let x = this.toBigInt();
      let z = Fp.inverse(x) ?? 0n;
      let b = Fp.sub(1n, Fp.mul(z, x));
      return [0, FieldConst.fromBigint(b), FieldConst.fromBigint(z)];
    });
    // add constraints
    // b * x === 0
    Snarky.field.assertMul(b, this.value, FieldVar[0]);
    // z * x === 1 - b
    Snarky.field.assertMul(
      z,
      this.value,
      Snarky.field.add(FieldVar[1], Snarky.field.scale(FieldConst[-1], b))
    );
    // ^^^ these prove that b = Bool(x === 0):
    // if x = 0, the 2nd equation implies b = 1
    // if x != 0, the 1st implies b = 0
    return new Bool(b);
  }

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
  equals(y: Field | bigint | number | string): Bool {
    // x == y is equivalent to x - y == 0
    // if one of the two is constant, we just need the two constraints in `isZero`
    if (this.isConstant() || isConstant(y)) {
      return this.sub(y).isZero();
    }
    // if both are variables, we create one new variable for x-y so that `isZero` doesn't create two
    let xMinusY = Snarky.existsVar(() =>
      FieldConst.fromBigint(Fp.sub(this.toBigInt(), toFp(y)))
    );
    Snarky.field.assertEqual(this.sub(y).value, xMinusY);
    return new Field(xMinusY).isZero();
  }

  // internal base method for all comparisons
  #compare(y: FieldVar) {
    // TODO: support all bit lengths
    let maxLength = Fp.sizeInBits - 2;
    asProver(() => {
      let actualLength = Math.max(
        this.toBigInt().toString(2).length,
        new Field(y).toBigInt().toString(2).length
      );
      if (actualLength > maxLength)
        throw Error(
          `Provable comparison functions can only be used on Fields of size <= ${maxLength} bits, got ${actualLength} bits.`
        );
    });
    let [, less, lessOrEqual] = Snarky.field.compare(maxLength, this.value, y);
    return { less: new Bool(less), lessOrEqual: new Bool(lessOrEqual) };
  }

  /**
   * Check if this {@link Field} is less than another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used prove to the validity of this statement.
   *
   * @example
   * ```ts
   * Field(2).lessThan(3).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
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
  lessThan(y: Field | bigint | number | string): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBigInt() < toFp(y));
    }
    return this.#compare(Field.#toVar(y)).less;
  }

  /**
   * Check if this {@link Field} is less than or equal to another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * Field(3).lessThanOrEqual(3).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
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
  lessThanOrEqual(y: Field | bigint | number | string): Bool {
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBigInt() <= toFp(y));
    }
    return this.#compare(Field.#toVar(y)).lessOrEqual;
  }

  /**
   * Check if this {@link Field} is greater than another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * Field(5).greaterThan(3).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods currently only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
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
  greaterThan(y: Field | bigint | number | string) {
    return Field.from(y).lessThan(this);
  }

  /**
   * Check if this {@link Field} is greater than or equal another "field-like" value.
   * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * Field(3).greaterThanOrEqual(3).assertEquals(Bool(true));
   * ```
   *
   * **Warning**: Comparison methods only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
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
  greaterThanOrEqual(y: Field | bigint | number | string) {
    return Field.from(y).lessThanOrEqual(this);
  }

  /**
   * Assert that this {@link Field} is less than another "field-like" value.
   * Calling this function is equivalent to `Field(...).lessThan(...).assertEquals(Bool(true))`.
   * See {@link Field.lessThan} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThan(y: Field | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (!(this.toBigInt() < toFp(y))) {
          throw Error(`Field.assertLessThan(): expected ${this} < ${y}`);
        }
        return;
      }
      let { less } = this.#compare(Field.#toVar(y));
      less.assertTrue();
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Assert that this {@link Field} is less than or equal to another "field-like" value.
   * Calling this function is equivalent to `Field(...).lessThanOrEqual(...).assertEquals(Bool(true))`.
   * See {@link Field.lessThanOrEqual} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThanOrEqual(y: Field | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (!(this.toBigInt() <= toFp(y))) {
          throw Error(`Field.assertLessThan(): expected ${this} <= ${y}`);
        }
        return;
      }
      let { lessOrEqual } = this.#compare(Field.#toVar(y));
      lessOrEqual.assertTrue();
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Assert that this {@link Field} is greater than another "field-like" value.
   * Calling this function is equivalent to `Field(...).greaterThan(...).assertEquals(Bool(true))`.
   * See {@link Field.greaterThan} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThan(y: Field | bigint | number | string, message?: string) {
    Field.from(y).assertLessThan(this, message);
  }

  /**
   * Assert that this {@link Field} is greater than or equal to another "field-like" value.
   * Calling this function is equivalent to `Field(...).greaterThanOrEqual(...).assertEquals(Bool(true))`.
   * See {@link Field.greaterThanOrEqual} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support Field elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThanOrEqual(
    y: Field | bigint | number | string,
    message?: string
  ) {
    Field.from(y).assertLessThanOrEqual(this, message);
  }

  /**
   * Assert that this {@link Field} does not equal another field-like value.
   *
   * Note: This uses fewer constraints than `x.equals(y).assertFalse()`.
   *
   * @example
   * ```ts
   * x.assertNotEquals(0, "expect x to be non-zero");
   * ```
   */
  assertNotEquals(y: Field | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (this.toBigInt() === toFp(y)) {
          throw Error(`Field.assertNotEquals(): ${this} = ${y}`);
        }
        return;
      }
      // inv() proves that a field element is non-zero, using 1 constraint.
      // so this takes 1-2 generic gates, while x.equals(y).assertTrue() takes 3-5
      this.sub(y).inv();
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Assert that this {@link Field} is equal to 1 or 0 as a "field-like" value.
   * Calling this function is equivalent to `Bool.or(Field(...).equals(1), Field(...).equals(0)).assertEquals(Bool(true))`.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * @param value - the "field-like" value to compare & assert with this {@link Field}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertBool(message?: string) {
    try {
      if (this.isConstant()) {
        let x = this.toBigInt();
        if (x !== 0n && x !== 1n) {
          throw Error(`Field.assertBool(): expected ${x} to be 0 or 1`);
        }
        return;
      }
      Snarky.field.assertBoolean(this.value);
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  static #checkBitLength(name: string, length: number) {
    if (length > Fp.sizeInBits)
      throw Error(
        `${name}: bit length must be ${Fp.sizeInBits} or less, got ${length}`
      );
    if (length <= 0)
      throw Error(`${name}: bit length must be positive, got ${length}`);
  }

  /**
   * Returns an array of {@link Bool} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link Field} element.
   *
   * If you use the optional `length` argument, proves that the field element fits in `length` bits.
   * The `length` has to be between 0 and 255 and the method throws if it isn't.
   *
   * **Warning**: The cost of this operation in a zk proof depends on the `length` you specify,
   * which by default is 255 bits. Prefer to pass a smaller `length` if possible.
   *
   * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
   *
   * @return An array of {@link Bool} element representing little endian binary representation of this {@link Field}.
   */
  toBits(length?: number) {
    if (length !== undefined) Field.#checkBitLength('Field.toBits()', length);
    if (this.isConstant()) {
      let bits = Fp.toBits(this.toBigInt());
      if (length !== undefined) {
        if (bits.slice(length).some((bit) => bit))
          throw Error(`Field.toBits(): ${this} does not fit in ${length} bits`);
        return bits.slice(0, length).map((b) => new Bool(b));
      }
      return bits.map((b) => new Bool(b));
    }
    let [, ...bits] = Snarky.field.toBits(length ?? Fp.sizeInBits, this.value);
    return bits.map((b) => new Bool(b));
  }

  /**
   * Convert a bit array into a {@link Field} element using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness)
   *
   * The method throws if the given bits do not fit in a single Field element. A Field element can be at most 255 bits.
   *
   * **Important**: If the given `bytes` array is an array of `booleans` or {@link Bool} elements that all are `constant`, the resulting {@link Field} element will be a constant as well. Or else, if the given array is a mixture of constants and variables of {@link Bool} type, the resulting {@link Field} will be a variable as well.
   *
   * @param bytes - An array of {@link Bool} or `boolean` type.
   *
   * @return A {@link Field} element matching the [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of the given `bytes` array.
   */
  static fromBits(bits: (Bool | boolean)[]) {
    let length = bits.length;
    Field.#checkBitLength('Field.fromBits()', length);
    if (bits.every((b) => typeof b === 'boolean' || b.toField().isConstant())) {
      let bits_ = bits
        .map((b) => (typeof b === 'boolean' ? b : b.toBoolean()))
        .concat(Array(Fp.sizeInBits - length).fill(false));
      return new Field(Fp.fromBits(bits_));
    }
    let bitsVars = bits.map((b): FieldVar => {
      if (typeof b === 'boolean') return b ? FieldVar[1] : FieldVar[0];
      return b.toField().value;
    });
    let x = Snarky.field.fromBits([0, ...bitsVars]);
    return new Field(x);
  }

  /**
   * Create a new {@link Field} element from the first `length` bits of this {@link Field} element.
   *
   * The `length` has to be a multiple of 16, and has to be between 0 and 255, otherwise the method throws.
   *
   * As {@link Field} elements are represented using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness),
   * the resulting {@link Field} element will equal the original one if it fits in `length` bits.
   *
   * @param length - The number of bits to take from this {@link Field} element.
   *
   * @return A {@link Field} element that is equal to the `length` of this {@link Field} element.
   */
  rangeCheckHelper(length: number) {
    Field.#checkBitLength('Field.rangeCheckHelper()', length);
    if (length % 16 !== 0)
      throw Error(
        'Field.rangeCheckHelper(): `length` has to be a multiple of 16.'
      );
    let lengthDiv16 = length / 16;
    if (this.isConstant()) {
      let bits = Fp.toBits(this.toBigInt())
        .slice(0, length)
        .concat(Array(Fp.sizeInBits - length).fill(false));
      return new Field(Fp.fromBits(bits));
    }
    let x = Snarky.field.truncateToBits16(lengthDiv16, this.value);
    return new Field(x);
  }

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   *
   * In o1js, addition and scaling (multiplication of variables by a constant) of variables is represented as an AST - [abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree). For example, the expression `x.add(y).mul(2)` is represented as `Scale(2, Add(x, y))`.
   *
   *  A new internal variable is created only when the variable is needed in a multiplicative or any higher level constraint (for example multiplication of two {@link Field} elements) to represent the operation.
   *
   * The `seal()` function tells o1js to stop building an AST and create a new variable right away.
   *
   * @return A {@link Field} element that is equal to the result of AST that was previously on this {@link Field} element.
   */
  seal() {
    if (this.isConstant()) return this;
    let x = Snarky.field.seal(this.value);
    return new Field(x);
  }

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
  static random() {
    return new Field(Fp.random());
  }

  // internal stuff

  // Provable<Field>

  /**
   * This function is the implementation of {@link Provable.toFields} for the {@link Field} type.
   *
   * Static function to serializes a {@link Field} into an array of {@link Field} elements.
   * This will be always an array of length 1, where the first and only element equals the given parameter itself.
   *
   * @param value - the {@link Field} element to cast the array from.
   *
   * @return A {@link Field} array of length 1 created from this {@link Field}.
   */
  static toFields(x: Field) {
    return [x];
  }

  /**
   * This function is the implementation of {@link Provable.toAuxiliary} for the {@link Field} type.
   *
   * As the primitive {@link Field} type has no auxiliary data associated with it, this function will always return an empty array.
   *
   * @param value - The {@link Field} element to get the auxiliary data of, optional. If not provided, the function returns an empty array.
   */
  static toAuxiliary(): [] {
    return [];
  }

  /**
   * This function is the implementation of {@link Provable.sizeInFields} for the {@link Field} type.
   *
   * Size of the {@link Field} type is 1, as it is the primitive type.
   * This function returns a regular number, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   *
   * @example
   * ```ts
   * console.log(Field.sizeInFields()); // Prints 1
   * ```
   *
   * @return A number representing the size of the {@link Field} type in terms of {@link Field} type itself.
   */
  static sizeInFields() {
    return 1;
  }

  /**
   * Implementation of {@link Provable.fromFields} for the {@link Field} type.
   *
   * **Warning**: This function is designed for internal use. It is not intended to be used by a zkApp developer.
   *
   * Creates a {@link Field} from an array of Fields of length 1.
   *
   * @param fields - an array of length 1 serialized from {@link Field} elements.
   *
   * @return The first {@link Field} element of the given array.
   */
  static fromFields([x]: Field[]) {
    return x;
  }

  /**
   * This function is the implementation of {@link Provable.check} in {@link Field} type.
   *
   * As any field element can be a {@link Field}, this function does not create any assertions, so it does nothing.
   *
   * @param value - the {@link Field} element to check.
   */
  static check() {}

  /**
   * `Provable<Field>.toValue()`
   */
  static toValue(x: Field) {
    return x.toBigInt();
  }

  /**
   * Convert a {@link Field} element to a bigint.
   */
  static toBigint(x: Field) {
    return x.toBigInt();
  }

  /**
   * `Provable<Field>.fromValue()`
   */
  static fromValue(x: Field | bigint | number | string) {
    return Field.from(x);
  }

  /**
   * This function is the implementation of {@link Provable.toFields} for the {@link Field} type.
   *
   * The result will be always an array of length 1, where the first and only element equals the {@link Field} itself.
   *
   * @return A {@link Field} array of length 1 created from this {@link Field}.
   */
  toFields() {
    return Field.toFields(this);
  }

  /**
   * This function is the implementation of {@link Provable.toAuxiliary} for the {@link Field} type.
   *
   * As the primitive {@link Field} type has no auxiliary data associated with it, this function will always return an empty array.
   */
  toAuxiliary() {
    return Field.toAuxiliary();
  }

  // ProvableExtended<Field>

  static empty() {
    return new Field(0n);
  }

  /**
   * Serialize the {@link Field} to a JSON string, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in unreadable output.
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
  toJSON() {
    return this.#toConstant('toJSON').toString();
  }

  /**
   * Serialize the given {@link Field} element to a JSON string, e.g. for printing. Trying to print a {@link Field} without this function will directly stringify the Field object, resulting in unreadable output.
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
  static toJSON(x: Field) {
    return x.toJSON();
  }

  /**
   * Deserialize a JSON string containing a "field-like" value into a {@link Field} element.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the {@link Field}.
   *
   * @param value - the "field-like" value to coerce the {@link Field} from.
   *
   * @return A {@link Field} coerced from the given JSON string.
   */
  static fromJSON(json: string) {
    return new Field(Fp.fromJSON(json));
  }

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   *
   * This function is the implementation of `ProvableExtended.toInput()` for the {@link Field} type.
   *
   * @param value - The {@link Field} element to get the `input` array.
   *
   * @return An object where the `fields` key is a {@link Field} array of length 1 created from this {@link Field}.
   *
   */
  static toInput(x: Field) {
    return { fields: [x] };
  }

  // Binable<Field>

  /**
   * Create an array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link Field} element.
   * Note that the array has always 32 elements as the {@link Field} is a `finite-field` in the order of {@link Field.ORDER}.
   *
   * @param value - The {@link Field} element to generate the array of bytes of.
   *
   * @return An array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link Field} element.
   *
   */
  static toBytes(x: Field) {
    return FieldBinable.toBytes(x);
  }

  /**
   * Part of the `Binable` interface.
   *
   * **Warning**: This function is for internal use. It is not intended to be used by a zkApp developer.
   */
  static readBytes<N extends number>(
    bytes: number[],
    offset: NonNegativeInteger<N>
  ) {
    return FieldBinable.readBytes(bytes, offset);
  }

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
  static fromBytes(bytes: number[]) {
    return FieldBinable.fromBytes(bytes);
  }

  /**
   * The size of a {@link Field} element in bytes - 32.
   */
  static sizeInBytes = Fp.sizeInBytes;

  /**
   * The size of a {@link Field} element in bits - 255.
   */
  static sizeInBits = Fp.sizeInBits;
}

const FieldBinable = defineBinable({
  toBytes(t: Field) {
    let t0 = toConstantField(t, 'toBytes').toBigInt();
    return Fp.toBytes(t0);
  },
  readBytes(bytes, offset) {
    let uint8array = new Uint8Array(32);
    uint8array.set(bytes.slice(offset, offset + 32));
    let x = Fp.fromBytes([...uint8array]);
    return [new Field(x), offset + 32];
  },
});

function isField(x: unknown): x is Field {
  return x instanceof Field;
}

function isConstant(
  x: bigint | number | string | Field
): x is bigint | number | string | ConstantField {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return true;
  }
  return (x as Field).isConstant();
}

function toFp(x: bigint | number | string | Field): Fp {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return Fp(x as bigint | number | string);
  }
  return (x as Field).toBigInt();
}

function withMessage(error: unknown, message?: string) {
  if (message === undefined || !(error instanceof Error)) return error;
  error.message = `${message}\n${error.message}`;
  return error;
}

function toConstantField(
  x: Field,
  methodName: string,
  varName = 'x',
  varDescription = 'field element'
): ConstantField {
  // if this is a constant, return it
  if (x.isConstant()) return x;

  // a non-constant can only appear inside a checked computation. everything else is a bug.
  assert(
    inCheckedComputation(),
    'variables only exist inside checked computations'
  );

  // if we are inside an asProver or witness block, read the variable's value and return it as constant
  if (Snarky.run.inProverBlock()) {
    let value = Snarky.field.readVar(x.value);
    return new Field(value) as ConstantField;
  }

  // otherwise, calling `toConstant()` is likely a mistake. throw a helpful error message.
  throw Error(readVarMessage(methodName, varName, varDescription));
}

function readVarMessage(
  methodName: string,
  varName: string,
  varDescription: string
) {
  return `${varName}.${methodName}() was called on a variable ${varDescription} \`${varName}\` in provable code.
This is not supported, because variables represent an abstract computation, 
which only carries actual values during proving, but not during compiling.

Also, reading out JS values means that whatever you're doing with those values will no longer be
linked to the original variable in the proof, which makes this pattern prone to security holes.

You can check whether your ${varDescription} is a variable or a constant by using ${varName}.isConstant().

To inspect values for debugging, use Provable.log(${varName}). For more advanced use cases,
there is \`Provable.asProver(() => { ... })\` which allows you to use ${varName}.${methodName}() inside the callback.
Warning: whatever happens inside asProver() will not be part of the zk proof.
`;
}
