import { Snarky, ProvableBn254 } from '../snarky.js';
import { FieldBn254 as Fp } from '../provable/field-bn254-bigint.js';
import { defineBinable } from '../bindings/lib/binable.js';
import type { NonNegativeInteger } from '../bindings/crypto/non-negative.js';
import { asProverBn254, inCheckedComputation } from './provable-context-bn254.js';
import { BoolBn254 } from './bool-bn254.js';
import { assert } from './errors.js';

// external API
export { FieldBn254 };

// internal API
export {
  FieldType,
  FieldVar,
  FieldConst,
  ConstantField,
  VarField,
  VarFieldVar,
  withMessage,
  readVarMessage,
  toConstantField,
  toFp,
  checkBitLength,
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
type VarFieldVar = [FieldType.Var, number];

const FieldVar = {
  constant(x: bigint | FieldConst): ConstantFieldVar {
    let x0 = typeof x === 'bigint' ? FieldConst.fromBigint(x) : x;
    return [FieldType.Constant, x0];
  },
  isConstant(x: FieldVar): x is ConstantFieldVar {
    return x[0] === FieldType.Constant;
  },
  isVar(x: FieldVar): x is VarFieldVar {
    return x[0] === FieldType.Var;
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

type ConstantField = FieldBn254 & { value: ConstantFieldVar };
type VarField = FieldBn254 & { value: VarFieldVar };

/**
 * A {@link FieldBn254} is an element of a prime order [finite field](https://en.wikipedia.org/wiki/Finite_field).
 * Every other provable type is built using the {@link FieldBn254} type.
 *
 * The field is the [pasta base field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) of order 2^254 + 0x224698fc094cf91b992d30ed00000001 ({@link FieldBn254.ORDER}).
 *
 * You can create a new FieldBn254 from everything "field-like" (`bigint`, integer `number`, decimal `string`, `FieldBn254`).
 * @example
 * ```
 * FieldBn254(10n); // FieldBn254 construction from a big integer
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
 * const x = FieldBn254(-1); // Valid FieldBn254 construction from negative number
 * const y = FieldBn254(FieldBn254.ORDER - 1n); // equivalent to `x`
 * ```
 *
 * **Important**: All the functions defined on a FieldBn254 (arithmetic, logic, etc.) take their arguments as "field-like". A FieldBn254 itself is also defined as a "field-like" element.
 *
 * @param value - the value to convert to a {@link FieldBn254}
 *
 * @return A {@link FieldBn254} with the value converted from the argument
 */
class FieldBn254 {
  value: FieldVar;

  /**
   * The order of the pasta curve that {@link FieldBn254} type build on as a `bigint`.
   * Order of the {@link FieldBn254} is 28948022309329048855892746252171976963363056481941560715954676764349967630337.
   */
  static ORDER = Fp.modulus;

  /**
   * Coerce anything "field-like" (bigint, number, string, and {@link FieldBn254}) to a FieldBn254.
   */
  constructor(x: bigint | number | string | FieldBn254 | FieldVar | FieldConst) {
    if (x instanceof FieldBn254) {
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

  static from(x: bigint | number | string | FieldBn254): FieldBn254 {
    if (x instanceof FieldBn254) return x;
    return new FieldBn254(x);
  }

  /**
   * Check whether this {@link FieldBn254} element is a hard-coded constant in the constraint system.
   * If a {@link FieldBn254} is constructed outside a zkApp method, it is a constant.
   *
   * @example
   * ```ts
   * console.log(FieldBn254(42).isConstant()); // true
   * ```
   *
   * @example
   * ```ts
   * \@method myMethod(x: FieldBn254) {
   *    console.log(x.isConstant()); // false
   * }
   * ```
   *
   * @return A `boolean` showing if this {@link FieldBn254} is a constant or not.
   */
  isConstant(): this is { value: ConstantFieldVar } {
    return this.value[0] === FieldType.Constant;
  }

  /**
   * Create a {@link FieldBn254} element equivalent to this {@link FieldBn254} element's value,
   * but is a constant.
   * See {@link FieldBn254.isConstant} for more information about what is a constant {@link FieldBn254}.
   *
   * @example
   * ```ts
   * const someField = FieldBn254(42);
   * someField.toConstant().assertEquals(someField); // Always true
   * ```
   *
   * @return A constant {@link FieldBn254} element equivalent to this {@link FieldBn254} element.
   */
  toConstant(): ConstantField {
    return toConstant(this, 'toConstant');
  }

  /**
   * Serialize the {@link FieldBn254} to a bigint, e.g. for printing. Trying to print a {@link FieldBn254} without this function will directly stringify the FieldBn254 object, resulting in unreadable output.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the bigint representation of the {@link FieldBn254}. Use the operation only during debugging.
   *
   * @example
   * ```ts
   * const someField = FieldBn254(42);
   * console.log(someField.toBigInt());
   * ```
   *
   * @return A bigint equivalent to the bigint representation of the FieldBn254.
   */
  toBigInt() {
    let x = toConstant(this, 'toBigInt');
    return FieldConst.toBigint(x.value[1]);
  }

  /**
   * Serialize the {@link FieldBn254} to a string, e.g. for printing. Trying to print a {@link FieldBn254} without this function will directly stringify the FieldBn254 object, resulting in unreadable output.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the {@link FieldBn254}. Use the operation only during debugging.
   *
   * @example
   * ```ts
   * const someField = FieldBn254(42);
   * console.log(someField.toString());
   * ```
   *
   * @return A string equivalent to the string representation of the FieldBn254.
   */
  toString() {
    return toConstant(this, 'toString').toBigInt().toString();
  }

  /**
   * Assert that this {@link FieldBn254} is equal another "field-like" value.
   * Calling this function is equivalent to `FieldBn254(...).equals(...).assertEquals(BoolBn254(true))`.
   * See {@link FieldBn254.equals} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * @param value - the "field-like" value to compare & assert with this {@link FieldBn254}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertEquals(y: FieldBn254 | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (this.toBigInt() !== toFp(y)) {
          throw Error(`FieldBn254.assertEquals(): ${this} != ${y}`);
        }
        return;
      }
      Snarky.bn254.field.assertEqual(this.value, toFieldVar(y));
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Add a "field-like" value to this {@link FieldBn254} element.
   *
   * @example
   * ```ts
   * const x = FieldBn254(3);
   * const sum = x.add(5);
   *
   * sum.assertEquals(FieldBn254(8));
   * ```
   *
   * **Warning**: This is a modular addition in the pasta field.
   * @example
   * ```ts
   * const x = FieldBn254(1);
   * const sum = x.add(FieldBn254(-7));
   *
   * // If you try to print sum - `console.log(sum.toBigInt())` - you will realize that it prints a very big integer because this is modular arithmetic, and 1 + (-7) circles around the field to become p - 6.
   * // You can use the reverse operation of addition (subtraction) to prove the sum is calculated correctly.
   *
   * sum.sub(x).assertEquals(FieldBn254(-7));
   * sum.sub(FieldBn254(-7)).assertEquals(x);
   * ```
   *
   * @param value - a "field-like" value to add to the {@link FieldBn254}.
   *
   * @return A {@link FieldBn254} element equivalent to the modular addition of the two value.
   */
  add(y: FieldBn254 | bigint | number | string): FieldBn254 {
    if (this.isConstant() && isConstant(y)) {
      return new FieldBn254(Fp.add(this.toBigInt(), toFp(y)));
    }
    // return new AST node Add(x, y)
    let z = Snarky.bn254.field.add(this.value, toFieldVar(y));
    return new FieldBn254(z);
  }

  /**
   * Negate a {@link FieldBn254}. This is equivalent to multiplying the {@link FieldBn254} by -1.
   *
   * @example
   * ```ts
   * const negOne = FieldBn254(1).neg();
   * negOne.assertEquals(-1);
   * ```
   *
   * @example
   * ```ts
   * const someField = FieldBn254(42);
   * someField.neg().assertEquals(someField.mul(FieldBn254(-1))); // This statement is always true regardless of the value of `someField`
   * ```
   *
   * **Warning**: This is a modular negation. For details, see the {@link sub} method.
   *
   * @return A {@link FieldBn254} element that is equivalent to the element multiplied by -1.
   */
  neg() {
    if (this.isConstant()) {
      return new FieldBn254(Fp.negate(this.toBigInt()));
    }
    // return new AST node Scale(-1, x)
    let z = Snarky.bn254.field.scale(FieldConst[-1], this.value);
    return new FieldBn254(z);
  }

  /**
   * Subtract another "field-like" value from this {@link FieldBn254} element.
   *
   * @example
   * ```ts
   * const x = FieldBn254(3);
   * const difference = x.sub(5);
   *
   * difference.assertEquals(FieldBn254(-2));
   * ```
   *
   * **Warning**: This is a modular subtraction in the pasta field.
   *
   * @example
   * ```ts
   * const x = FieldBn254(1);
   * const difference = x.sub(FieldBn254(2));
   *
   * // If you try to print difference - `console.log(difference.toBigInt())` - you will realize that it prints a very big integer because this is modular arithmetic, and 1 - 2 circles around the field to become p - 1.
   * // You can use the reverse operation of subtraction (addition) to prove the difference is calculated correctly.
   * difference.add(FieldBn254(2)).assertEquals(x);
   * ```
   *
   * @param value - a "field-like" value to subtract from the {@link FieldBn254}.
   *
   * @return A {@link FieldBn254} element equivalent to the modular difference of the two value.
   */
  sub(y: FieldBn254 | bigint | number | string) {
    return this.add(FieldBn254.from(y).neg());
  }

  /**
   * Checks if this {@link FieldBn254} is even. Returns `true` for even elements and `false` for odd elements.
   *
   * @example
   * ```ts
   * let a = FieldBn254(5);
   * a.isEven(); // false
   * a.isEven().assertTrue(); // throws, as expected!
   *
   * let b = FieldBn254(4);
   * b.isEven(); // true
   * b.isEven().assertTrue(); // does not throw, as expected!
   * ```
   */
  isEven() {
    if (this.isConstant()) return new BoolBn254(this.toBigInt() % 2n === 0n);

    let [, isOddVar, xDiv2Var] = Snarky.exists(2, () => {
      let bits = Fp.toBits(this.toBigInt());
      let isOdd = bits.shift()! ? 1n : 0n;

      return [
        0,
        FieldConst.fromBigint(isOdd),
        FieldConst.fromBigint(Fp.fromBits(bits)),
      ];
    });

    let isOdd = new FieldBn254(isOddVar);
    let xDiv2 = new FieldBn254(xDiv2Var);

    // range check for 253 bits
    // WARNING: this makes use of a special property of the Pasta curves,
    // namely that a random field element is < 2^254 with overwhelming probability
    // TODO use 88-bit RCs to make this more efficient
    xDiv2.toBits(253);

    // check composition
    xDiv2.mul(2).add(isOdd).assertEquals(this);

    return new BoolBn254(isOddVar).not();
  }

  /**
   * Multiply another "field-like" value with this {@link FieldBn254} element.
   *
   * @example
   * ```ts
   * const x = FieldBn254(3);
   * const product = x.mul(FieldBn254(5));
   *
   * product.assertEquals(FieldBn254(15));
   * ```
   *
   * @param value - a "field-like" value to multiply with the {@link FieldBn254}.
   *
   * @return A {@link FieldBn254} element equivalent to the modular difference of the two value.
   */
  mul(y: FieldBn254 | bigint | number | string): FieldBn254 {
    if (this.isConstant() && isConstant(y)) {
      return new FieldBn254(Fp.mul(this.toBigInt(), toFp(y)));
    }
    // if one of the factors is constant, return Scale AST node
    if (isConstant(y)) {
      let z = Snarky.bn254.field.scale(toFieldConst(y), this.value);
      return new FieldBn254(z);
    }
    if (this.isConstant()) {
      let z = Snarky.bn254.field.scale(this.value[1], y.value);
      return new FieldBn254(z);
    }
    // create a new witness for z = x*y
    let z = Snarky.existsVar(() =>
      FieldConst.fromBigint(Fp.mul(this.toBigInt(), toFp(y)))
    );
    // add a multiplication constraint
    Snarky.bn254.field.assertMul(this.value, y.value, z);
    return new FieldBn254(z);
  }

  /**
   * [Modular inverse](https://en.wikipedia.org/wiki/Modular_multiplicative_inverse) of this {@link FieldBn254} element.
   * Equivalent to 1 divided by this {@link FieldBn254}, in the sense of modular arithmetic.
   *
   * Proves that this FieldBn254 is non-zero, or throws a "Division by zero" error.
   *
   * @example
   * ```ts
   * const someField = FieldBn254(42);
   * const inverse = someField.inv();
   * inverse.assertEquals(FieldBn254(1).div(example)); // This statement is always true regardless of the value of `someField`
   * ```
   *
   * **Warning**: This is a modular inverse. See {@link div} method for more details.
   *
   * @return A {@link FieldBn254} element that is equivalent to one divided by this element.
   */
  inv() {
    if (this.isConstant()) {
      let z = Fp.inverse(this.toBigInt());
      if (z === undefined) throw Error('FieldBn254.inv(): Division by zero');
      return new FieldBn254(z);
    }
    // create a witness for z = x^(-1)
    let z = Snarky.existsVar(() => {
      let z = Fp.inverse(this.toBigInt()) ?? 0n;
      return FieldConst.fromBigint(z);
    });
    // constrain x * z === 1
    Snarky.bn254.field.assertMul(this.value, z, FieldVar[1]);
    return new FieldBn254(z);
  }

  /**
   * Divide another "field-like" value through this {@link FieldBn254}.
   *
   * Proves that the denominator is non-zero, or throws a "Division by zero" error.
   *
   * @example
   * ```ts
   * const x = FieldBn254(6);
   * const quotient = x.div(FieldBn254(3));
   *
   * quotient.assertEquals(FieldBn254(2));
   * ```
   *
   * **Warning**: This is a modular division in the pasta field. You can think this as the reverse operation of modular multiplication.
   *
   * @example
   * ```ts
   * const x = FieldBn254(2);
   * const y = FieldBn254(5);
   *
   * const quotient = x.div(y);
   *
   * // If you try to print quotient - `console.log(quotient.toBigInt())` - you will realize that it prints a very big integer because this is a modular inverse.
   * // You can use the reverse operation of division (multiplication) to prove the quotient is calculated correctly.
   *
   * quotient.mul(y).assertEquals(x);
   * ```
   *
   * @param value - a "field-like" value to divide with the {@link FieldBn254}.
   *
   * @return A {@link FieldBn254} element equivalent to the modular division of the two value.
   */
  div(y: FieldBn254 | bigint | number | string) {
    // this intentionally uses 2 constraints instead of 1 to avoid an unconstrained output when dividing 0/0
    // (in this version, division by 0 is strictly not allowed)
    return this.mul(FieldBn254.from(y).inv());
  }

  /**
   * Square this {@link FieldBn254} element.
   *
   * @example
   * ```ts
   * const someField = FieldBn254(7);
   * const square = someField.square();
   *
   * square.assertEquals(someField.mul(someField)); // This statement is always true regardless of the value of `someField`
   * ```
   *
   * ** Warning: This is a modular multiplication. See `mul()` method for more details.
   *
   * @return A {@link FieldBn254} element equivalent to the multiplication of the {@link FieldBn254} element with itself.
   */
  square() {
    if (this.isConstant()) {
      return new FieldBn254(Fp.square(this.toBigInt()));
    }
    // create a new witness for z = x^2
    let z = Snarky.existsVar(() =>
      FieldConst.fromBigint(Fp.square(this.toBigInt()))
    );
    // add a squaring constraint
    Snarky.bn254.field.assertSquare(this.value, z);
    return new FieldBn254(z);
  }

  /**
   * Take the square root of this {@link FieldBn254} element.
   *
   * Proves that the FieldBn254 element has a square root in the finite field, or throws if it doesn't.
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
   * @return A {@link FieldBn254} element equivalent to the square root of the {@link FieldBn254} element.
   */
  sqrt() {
    if (this.isConstant()) {
      let z = Fp.sqrt(this.toBigInt());
      if (z === undefined)
        throw Error(
          `FieldBn254.sqrt(): input ${this} has no square root in the field.`
        );
      return new FieldBn254(z);
    }
    // create a witness for sqrt(x)
    let z = Snarky.existsVar(() => {
      let z = Fp.sqrt(this.toBigInt()) ?? 0n;
      return FieldConst.fromBigint(z);
    });
    // constrain z * z === x
    Snarky.bn254.field.assertSquare(z, this.value);
    return new FieldBn254(z);
  }

  /**
   * @deprecated use `x.equals(0)` which is equivalent
   */
  isZero() {
    if (this.isConstant()) {
      return new BoolBn254(this.toBigInt() === 0n);
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
    Snarky.bn254.field.assertMul(b, this.value, FieldVar[0]);
    // z * x === 1 - b
    Snarky.bn254.field.assertMul(
      z,
      this.value,
      Snarky.bn254.field.add(FieldVar[1], Snarky.bn254.field.scale(FieldConst[-1], b))
    );
    // ^^^ these prove that b = BoolBn254(x === 0):
    // if x = 0, the 2nd equation implies b = 1
    // if x != 0, the 1st implies b = 0
    return new BoolBn254(b);
  }

  /**
   * Check if this {@link FieldBn254} is equal another "field-like" value.
   * Returns a {@link BoolBn254}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * FieldBn254(5).equals(5).assertEquals(BoolBn254(true));
   * ```
   *
   * @param value - the "field-like" value to compare with this {@link FieldBn254}.
   *
   * @return A {@link BoolBn254} representing if this {@link FieldBn254} is equal another "field-like" value.
   */
  equals(y: FieldBn254 | bigint | number | string): BoolBn254 {
    // x == y is equivalent to x - y == 0
    // if one of the two is constant, we just need the two constraints in `isZero`
    if (this.isConstant() || isConstant(y)) {
      return this.sub(y).isZero();
    }
    // if both are variables, we create one new variable for x-y so that `isZero` doesn't create two
    let xMinusY = Snarky.existsVar(() =>
      FieldConst.fromBigint(Fp.sub(this.toBigInt(), toFp(y)))
    );
    Snarky.bn254.field.assertEqual(this.sub(y).value, xMinusY);
    return new FieldBn254(xMinusY).isZero();
  }

  /**
   * Check if this {@link FieldBn254} is less than another "field-like" value.
   * Returns a {@link BoolBn254}, which is a provable type and can be used prove to the validity of this statement.
   *
   * @example
   * ```ts
   * FieldBn254(2).lessThan(3).assertEquals(BoolBn254(true));
   * ```
   *
   * **Warning**: Comparison methods only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * **Warning**: As this method compares the bigint value of a {@link FieldBn254}, it can result in unexpected behavior when used with negative inputs or modular division.
   *
   * @example
   * ```ts
   * FieldBn254(1).div(FieldBn254(3)).lessThan(FieldBn254(1).div(FieldBn254(2))).assertEquals(BoolBn254(true)); // This code will throw an error
   * ```
   *
   * @param value - the "field-like" value to compare with this {@link FieldBn254}.
   *
   * @return A {@link BoolBn254} representing if this {@link FieldBn254} is less than another "field-like" value.
   */
  lessThan(y: FieldBn254 | bigint | number | string): BoolBn254 {
    if (this.isConstant() && isConstant(y)) {
      return new BoolBn254(this.toBigInt() < toFp(y));
    }
    return compare(this, toFieldVar(y)).less;
  }

  /**
   * Check if this {@link FieldBn254} is less than or equal to another "field-like" value.
   * Returns a {@link BoolBn254}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * FieldBn254(3).lessThanOrEqual(3).assertEquals(BoolBn254(true));
   * ```
   *
   * **Warning**: Comparison methods only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * **Warning**: As this method compares the bigint value of a {@link FieldBn254}, it can result in unexpected behaviour when used with negative inputs or modular division.
   *
   * @example
   * ```ts
   * FieldBn254(1).div(FieldBn254(3)).lessThanOrEqual(FieldBn254(1).div(FieldBn254(2))).assertEquals(BoolBn254(true)); // This code will throw an error
   * ```
   *
   * @param value - the "field-like" value to compare with this {@link FieldBn254}.
   *
   * @return A {@link BoolBn254} representing if this {@link FieldBn254} is less than or equal another "field-like" value.
   */
  lessThanOrEqual(y: FieldBn254 | bigint | number | string): BoolBn254 {
    if (this.isConstant() && isConstant(y)) {
      return new BoolBn254(this.toBigInt() <= toFp(y));
    }
    return compare(this, toFieldVar(y)).lessOrEqual;
  }

  /**
   * Check if this {@link FieldBn254} is greater than another "field-like" value.
   * Returns a {@link BoolBn254}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * FieldBn254(5).greaterThan(3).assertEquals(BoolBn254(true));
   * ```
   *
   * **Warning**: Comparison methods currently only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * **Warning**: As this method compares the bigint value of a {@link FieldBn254}, it can result in unexpected behaviour when used with negative inputs or modular division.
   *
   * @example
   * ```ts
   * FieldBn254(1).div(FieldBn254(2)).greaterThan(FieldBn254(1).div(FieldBn254(3))).assertEquals(BoolBn254(true)); // This code will throw an error
   * ```
   *
   * @param value - the "field-like" value to compare with this {@link FieldBn254}.
   *
   * @return A {@link BoolBn254} representing if this {@link FieldBn254} is greater than another "field-like" value.
   */
  greaterThan(y: FieldBn254 | bigint | number | string) {
    return FieldBn254.from(y).lessThan(this);
  }

  /**
   * Check if this {@link FieldBn254} is greater than or equal another "field-like" value.
   * Returns a {@link BoolBn254}, which is a provable type and can be used to prove the validity of this statement.
   *
   * @example
   * ```ts
   * FieldBn254(3).greaterThanOrEqual(3).assertEquals(BoolBn254(true));
   * ```
   *
   * **Warning**: Comparison methods only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * **Warning**: As this method compares the bigint value of a {@link FieldBn254}, it can result in unexpected behaviour when used with negative inputs or modular division.
   *
   * @example
   * ```ts
   * FieldBn254(1).div(FieldBn254(2)).greaterThanOrEqual(FieldBn254(1).div(FieldBn254(3))).assertEquals(BoolBn254(true)); // This code will throw an error
   * ```
   *
   * @param value - the "field-like" value to compare with this {@link FieldBn254}.
   *
   * @return A {@link BoolBn254} representing if this {@link FieldBn254} is greater than or equal another "field-like" value.
   */
  greaterThanOrEqual(y: FieldBn254 | bigint | number | string) {
    return FieldBn254.from(y).lessThanOrEqual(this);
  }

  /**
   * Assert that this {@link FieldBn254} is less than another "field-like" value.
   * Calling this function is equivalent to `FieldBn254(...).lessThan(...).assertEquals(BoolBn254(true))`.
   * See {@link FieldBn254.lessThan} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link FieldBn254}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThan(y: FieldBn254 | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (!(this.toBigInt() < toFp(y))) {
          throw Error(`FieldBn254.assertLessThan(): expected ${this} < ${y}`);
        }
        return;
      }
      let { less } = compare(this, toFieldVar(y));
      less.assertTrue();
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Assert that this {@link FieldBn254} is less than or equal to another "field-like" value.
   * Calling this function is equivalent to `FieldBn254(...).lessThanOrEqual(...).assertEquals(BoolBn254(true))`.
   * See {@link FieldBn254.lessThanOrEqual} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link FieldBn254}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertLessThanOrEqual(y: FieldBn254 | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (!(this.toBigInt() <= toFp(y))) {
          throw Error(`FieldBn254.assertLessThan(): expected ${this} <= ${y}`);
        }
        return;
      }
      let { lessOrEqual } = compare(this, toFieldVar(y));
      lessOrEqual.assertTrue();
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Assert that this {@link FieldBn254} is greater than another "field-like" value.
   * Calling this function is equivalent to `FieldBn254(...).greaterThan(...).assertEquals(BoolBn254(true))`.
   * See {@link FieldBn254.greaterThan} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link FieldBn254}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThan(y: FieldBn254 | bigint | number | string, message?: string) {
    FieldBn254.from(y).assertLessThan(this, message);
  }

  /**
   * Assert that this {@link FieldBn254} is greater than or equal to another "field-like" value.
   * Calling this function is equivalent to `FieldBn254(...).greaterThanOrEqual(...).assertEquals(BoolBn254(true))`.
   * See {@link FieldBn254.greaterThanOrEqual} for more details.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * **Warning**: Comparison methods only support FieldBn254 elements of size <= 253 bits in provable code.
   * The method will throw if one of the inputs exceeds 253 bits.
   *
   * @param value - the "field-like" value to compare & assert with this {@link FieldBn254}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertGreaterThanOrEqual(
    y: FieldBn254 | bigint | number | string,
    message?: string
  ) {
    FieldBn254.from(y).assertLessThanOrEqual(this, message);
  }

  /**
   * Assert that this {@link FieldBn254} does not equal another field-like value.
   *
   * Note: This uses fewer constraints than `x.equals(y).assertFalse()`.
   *
   * @example
   * ```ts
   * x.assertNotEquals(0, "expect x to be non-zero");
   * ```
   */
  assertNotEquals(y: FieldBn254 | bigint | number | string, message?: string) {
    try {
      if (this.isConstant() && isConstant(y)) {
        if (this.toBigInt() === toFp(y)) {
          throw Error(`FieldBn254.assertNotEquals(): ${this} = ${y}`);
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
   * Assert that this {@link FieldBn254} is equal to 1 or 0 as a "field-like" value.
   * Calling this function is equivalent to `BoolBn254.or(FieldBn254(...).equals(1), FieldBn254(...).equals(0)).assertEquals(BoolBn254(true))`.
   *
   * **Important**: If an assertion fails, the code throws an error.
   *
   * @param value - the "field-like" value to compare & assert with this {@link FieldBn254}.
   * @param message? - a string error message to print if the assertion fails, optional.
   */
  assertBool(message?: string) {
    try {
      if (this.isConstant()) {
        let x = this.toBigInt();
        if (x !== 0n && x !== 1n) {
          throw Error(`FieldBn254.assertBool(): expected ${x} to be 0 or 1`);
        }
        return;
      }
      Snarky.bn254.field.assertBoolean(this.value);
    } catch (err) {
      throw withMessage(err, message);
    }
  }

  /**
   * Returns an array of {@link BoolBn254} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link FieldBn254} element.
   *
   * If you use the optional `length` argument, proves that the field element fits in `length` bits.
   * The `length` has to be between 0 and 255 and the method throws if it isn't.
   *
   * **Warning**: The cost of this operation in a zk proof depends on the `length` you specify,
   * which by default is 255 bits. Prefer to pass a smaller `length` if possible.
   *
   * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
   *
   * @return An array of {@link BoolBn254} element representing little endian binary representation of this {@link FieldBn254}.
   */
  toBits(length?: number) {
    if (length !== undefined) checkBitLength('FieldBn254.toBits()', length);
    if (this.isConstant()) {
      let bits = Fp.toBits(this.toBigInt());
      if (length !== undefined) {
        if (bits.slice(length).some((bit) => bit))
          throw Error(`FieldBn254.toBits(): ${this} does not fit in ${length} bits`);
        return bits.slice(0, length).map((b) => new BoolBn254(b));
      }
      return bits.map((b) => new BoolBn254(b));
    }
    let [, ...bits] = Snarky.bn254.field.toBits(length ?? Fp.sizeInBits, this.value);
    return bits.map((b) => new BoolBn254(b));
  }

  /**
   * Convert a bit array into a {@link FieldBn254} element using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness)
   *
   * The method throws if the given bits do not fit in a single FieldBn254 element. A FieldBn254 element can be at most 255 bits.
   *
   * **Important**: If the given `bytes` array is an array of `booleans` or {@link BoolBn254} elements that all are `constant`, the resulting {@link FieldBn254} element will be a constant as well. Or else, if the given array is a mixture of constants and variables of {@link BoolBn254} type, the resulting {@link FieldBn254} will be a variable as well.
   *
   * @param bytes - An array of {@link BoolBn254} or `boolean` type.
   *
   * @return A {@link FieldBn254} element matching the [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of the given `bytes` array.
   */
  static fromBits(bits: (BoolBn254 | boolean)[]) {
    let length = bits.length;
    checkBitLength('FieldBn254.fromBits()', length);
    if (bits.every((b) => typeof b === 'boolean' || b.toField().isConstant())) {
      let bits_ = bits
        .map((b) => (typeof b === 'boolean' ? b : b.toBoolean()))
        .concat(Array(Fp.sizeInBits - length).fill(false));
      return new FieldBn254(Fp.fromBits(bits_));
    }
    let bitsVars = bits.map((b): FieldVar => {
      if (typeof b === 'boolean') return b ? FieldVar[1] : FieldVar[0];
      return b.toField().value;
    });
    let x = Snarky.bn254.field.fromBits([0, ...bitsVars]);
    return new FieldBn254(x);
  }

  /**
   * Create a new {@link FieldBn254} element from the first `length` bits of this {@link FieldBn254} element.
   *
   * The `length` has to be a multiple of 16, and has to be between 0 and 255, otherwise the method throws.
   *
   * As {@link FieldBn254} elements are represented using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness),
   * the resulting {@link FieldBn254} element will equal the original one if it fits in `length` bits.
   *
   * @param length - The number of bits to take from this {@link FieldBn254} element.
   *
   * @return A {@link FieldBn254} element that is equal to the `length` of this {@link FieldBn254} element.
   */
  rangeCheckHelper(length: number) {
    checkBitLength('FieldBn254.rangeCheckHelper()', length);
    if (length % 16 !== 0)
      throw Error(
        'FieldBn254.rangeCheckHelper(): `length` has to be a multiple of 16.'
      );
    let lengthDiv16 = length / 16;
    if (this.isConstant()) {
      let bits = Fp.toBits(this.toBigInt())
        .slice(0, length)
        .concat(Array(Fp.sizeInBits - length).fill(false));
      return new FieldBn254(Fp.fromBits(bits));
    }
    let x = Snarky.bn254.field.truncateToBits16(lengthDiv16, this.value);
    return new FieldBn254(x);
  }

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   *
   * In o1js, addition and scaling (multiplication of variables by a constant) of variables is represented as an AST - [abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree). For example, the expression `x.add(y).mul(2)` is represented as `Scale(2, Add(x, y))`.
   *
   *  A new internal variable is created only when the variable is needed in a multiplicative or any higher level constraint (for example multiplication of two {@link FieldBn254} elements) to represent the operation.
   *
   * The `seal()` function tells o1js to stop building an AST and create a new variable right away.
   *
   * @return A {@link FieldBn254} element that is equal to the result of AST that was previously on this {@link FieldBn254} element.
   */
  seal() {
    if (this.isConstant()) return this;
    let x = Snarky.bn254.field.seal(this.value);
    return VarField(x);
  }

  /**
   * A random {@link FieldBn254} element.
   *
   * @example
   * ```ts
   * console.log(FieldBn254.random().toBigInt()); // Run this code twice!
   * ```
   *
   * @return A random {@link FieldBn254} element.
   */
  static random() {
    return new FieldBn254(Fp.random());
  }

  // internal stuff

  // ProvableBn254<FieldBn254>

  /**
   * This function is the implementation of {@link ProvableBn254.toFields} for the {@link FieldBn254} type.
   *
   * Static function to serializes a {@link FieldBn254} into an array of {@link FieldBn254} elements.
   * This will be always an array of length 1, where the first and only element equals the given parameter itself.
   *
   * @param value - the {@link FieldBn254} element to cast the array from.
   *
   * @return A {@link FieldBn254} array of length 1 created from this {@link FieldBn254}.
   */
  static toFields(x: FieldBn254) {
    return [x];
  }

  /**
   * This function is the implementation of {@link ProvableBn254.toAuxiliary} for the {@link FieldBn254} type.
   *
   * As the primitive {@link FieldBn254} type has no auxiliary data associated with it, this function will always return an empty array.
   *
   * @param value - The {@link FieldBn254} element to get the auxiliary data of, optional. If not provided, the function returns an empty array.
   */
  static toAuxiliary(): [] {
    return [];
  }

  /**
   * This function is the implementation of {@link ProvableBn254.sizeInFields} for the {@link FieldBn254} type.
   *
   * Size of the {@link FieldBn254} type is 1, as it is the primitive type.
   * This function returns a regular number, so you cannot use it to prove something on chain. You can use it during debugging or to understand the memory complexity of some type.
   *
   * @example
   * ```ts
   * console.log(FieldBn254.sizeInFields()); // Prints 1
   * ```
   *
   * @return A number representing the size of the {@link FieldBn254} type in terms of {@link FieldBn254} type itself.
   */
  static sizeInFields() {
    return 1;
  }

  /**
   * Implementation of {@link ProvableBn254.fromFields} for the {@link FieldBn254} type.
   *
   * **Warning**: This function is designed for internal use. It is not intended to be used by a zkApp developer.
   *
   * Creates a {@link FieldBn254} from an array of Fields of length 1.
   *
   * @param fields - an array of length 1 serialized from {@link FieldBn254} elements.
   *
   * @return The first {@link FieldBn254} element of the given array.
   */
  static fromFields([x]: FieldBn254[]) {
    return x;
  }

  /**
   * This function is the implementation of {@link ProvableBn254.check} in {@link FieldBn254} type.
   *
   * As any field element can be a {@link FieldBn254}, this function does not create any assertions, so it does nothing.
   *
   * @param value - the {@link FieldBn254} element to check.
   */
  static check() { }

  /**
   * This function is the implementation of {@link ProvableBn254.toFields} for the {@link FieldBn254} type.
   *
   * The result will be always an array of length 1, where the first and only element equals the {@link FieldBn254} itself.
   *
   * @return A {@link FieldBn254} array of length 1 created from this {@link FieldBn254}.
   */
  toFields() {
    return FieldBn254.toFields(this);
  }

  /**
   * This function is the implementation of {@link ProvableBn254.toAuxiliary} for the {@link FieldBn254} type.
   *
   * As the primitive {@link FieldBn254} type has no auxiliary data associated with it, this function will always return an empty array.
   */
  toAuxiliary() {
    return FieldBn254.toAuxiliary();
  }

  // ProvableExtended<FieldBn254>

  static empty() {
    return new FieldBn254(0n);
  }

  /**
   * Serialize the {@link FieldBn254} to a JSON string, e.g. for printing. Trying to print a {@link FieldBn254} without this function will directly stringify the FieldBn254 object, resulting in unreadable output.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the JSON string representation of the {@link FieldBn254}. Use the operation only during debugging.
   *
   * @example
   * ```ts
   * const someField = FieldBn254(42);
   * console.log(someField.toJSON());
   * ```
   *
   * @return A string equivalent to the JSON representation of the {@link FieldBn254}.
   */
  toJSON() {
    return toConstant(this, 'toJSON').toString();
  }

  /**
   * Serialize the given {@link FieldBn254} element to a JSON string, e.g. for printing. Trying to print a {@link FieldBn254} without this function will directly stringify the FieldBn254 object, resulting in unreadable output.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the JSON string representation of the {@link FieldBn254}. Use the operation only during debugging.
   *
   * @example
   * ```ts
   * const someField = FieldBn254(42);
   * console.log(FieldBn254.toJSON(someField));
   * ```
   *
   * @param value - The JSON string to coerce the {@link FieldBn254} from.
   *
   * @return A string equivalent to the JSON representation of the given {@link FieldBn254}.
   */
  static toJSON(x: FieldBn254) {
    return x.toJSON();
  }

  /**
   * Deserialize a JSON string containing a "field-like" value into a {@link FieldBn254} element.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the {@link FieldBn254}.
   *
   * @param value - the "field-like" value to coerce the {@link FieldBn254} from.
   *
   * @return A {@link FieldBn254} coerced from the given JSON string.
   */
  static fromJSON(json: string) {
    return new FieldBn254(Fp.fromJSON(json));
  }

  /**
   * **Warning**: This function is mainly for internal use. Normally it is not intended to be used by a zkApp developer.
   *
   * This function is the implementation of `ProvableExtended.toInput()` for the {@link FieldBn254} type.
   *
   * @param value - The {@link FieldBn254} element to get the `input` array.
   *
   * @return An object where the `fields` key is a {@link FieldBn254} array of length 1 created from this {@link FieldBn254}.
   *
   */
  static toInput(x: FieldBn254) {
    return { fields: [x] };
  }

  // Binable<FieldBn254>

  /**
   * Create an array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link FieldBn254} element.
   * Note that the array has always 32 elements as the {@link FieldBn254} is a `finite-field` in the order of {@link FieldBn254.ORDER}.
   *
   * @param value - The {@link FieldBn254} element to generate the array of bytes of.
   *
   * @return An array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link FieldBn254} element.
   *
   */
  static toBytes(x: FieldBn254) {
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
   * Coerce a new {@link FieldBn254} element using the [little-endian](https://en.wikipedia.org/wiki/Endianness) representation of the given `bytes` array.
   * Note that the given `bytes` array may have at most 32 elements as the {@link FieldBn254} is a `finite-field` in the order of {@link FieldBn254.ORDER}.
   *
   * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the byte representation of the {@link FieldBn254}.
   *
   * @param bytes - The bytes array to coerce the {@link FieldBn254} from.
   *
   * @return A new {@link FieldBn254} element created using the [little-endian](https://en.wikipedia.org/wiki/Endianness) representation of the given `bytes` array.
   */
  static fromBytes(bytes: number[]) {
    return FieldBinable.fromBytes(bytes);
  }

  /**
   * The size of a {@link FieldBn254} element in bytes - 32.
   */
  static sizeInBytes = Fp.sizeInBytes;

  /**
   * The size of a {@link FieldBn254} element in bits - 255.
   */
  static sizeInBits = Fp.sizeInBits;
}

const FieldBinable = defineBinable({
  toBytes(t: FieldBn254) {
    let t0 = toConstantField(t, 'toBytes').toBigInt();
    return Fp.toBytes(t0);
  },
  readBytes(bytes, offset) {
    let uint8array = new Uint8Array(32);
    uint8array.set(bytes.slice(offset, offset + 32));
    let x = Fp.fromBytes([...uint8array]);
    return [new FieldBn254(x), offset + 32];
  },
});

// internal helper functions

function isConstant(
  x: bigint | number | string | FieldBn254
): x is bigint | number | string | ConstantField {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return true;
  }
  return (x as FieldBn254).isConstant();
}

function toFp(x: bigint | number | string | FieldBn254): Fp {
  let type = typeof x;
  if (type === 'bigint' || type === 'number' || type === 'string') {
    return Fp(x as bigint | number | string);
  }
  return (x as FieldBn254).toBigInt();
}

function toFieldConst(x: bigint | number | string | ConstantField): FieldConst {
  if (x instanceof FieldBn254) return x.value[1];
  return FieldConst.fromBigint(Fp(x));
}

function toFieldVar(x: bigint | number | string | FieldBn254): FieldVar {
  if (x instanceof FieldBn254) return x.value;
  return FieldVar.constant(Fp(x));
}

function withMessage(error: unknown, message?: string) {
  if (message === undefined || !(error instanceof Error)) return error;
  error.message = `${message}\n${error.message}`;
  return error;
}

// internal base method for all comparisons
function compare(x: FieldBn254, y: FieldVar) {
  // TODO: support all bit lengths
  let maxLength = Fp.sizeInBits - 2;
  asProverBn254(() => {
    let actualLength = Math.max(
      x.toBigInt().toString(2).length,
      new FieldBn254(y).toBigInt().toString(2).length
    );
    if (actualLength > maxLength)
      throw Error(
        `ProvableBn254 comparison functions can only be used on Fields of size <= ${maxLength} bits, got ${actualLength} bits.`
      );
  });
  let [, less, lessOrEqual] = Snarky.bn254.field.compare(maxLength, x.value, y);
  return { less: new BoolBn254(less), lessOrEqual: new BoolBn254(lessOrEqual) };
}

function checkBitLength(
  name: string,
  length: number,
  maxLength = Fp.sizeInBits
) {
  if (length > maxLength)
    throw Error(
      `${name}: bit length must be ${maxLength} or less, got ${length}`
    );
  if (length < 0)
    throw Error(`${name}: bit length must be non-negative, got ${length}`);
}

function toConstant(x: FieldBn254, name: string): ConstantField {
  return toConstantField(x, name, 'x', 'field element');
}

function toConstantField(
  x: FieldBn254,
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

  // if we are inside an asProverBn254 or witness block, read the variable's value and return it as constant
  if (Snarky.bn254.run.inProverBlock()) {
    let value = Snarky.bn254.field.readVar(x.value);
    return new FieldBn254(value) as ConstantField;
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

To inspect values for debugging, use ProvableBn254.log(${varName}). For more advanced use cases,
there is \`ProvableBn254.asProver(() => { ... })\` which allows you to use ${varName}.${methodName}() inside the callback.
Warning: whatever happens inside asProver() will not be part of the zk proof.
`;
}

function VarField(x: VarFieldVar): VarField {
  return new FieldBn254(x) as VarField;
}
