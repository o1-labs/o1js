"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkBitLength = exports.toFp = exports.toConstantField = exports.readVarMessage = exports.withMessage = exports.VarField = exports.ConstantField = exports.Field = void 0;
const bindings_js_1 = require("../../bindings.js");
const finite_field_js_1 = require("../../bindings/crypto/finite-field.js");
const field_bigint_js_1 = require("../../mina-signer/src/field-bigint.js");
const binable_js_1 = require("../../bindings/lib/binable.js");
const provable_context_js_1 = require("./core/provable-context.js");
const bool_js_1 = require("./bool.js");
const errors_js_1 = require("../util/errors.js");
const provable_js_1 = require("./provable.js");
const compatible_js_1 = require("./gadgets/compatible.js");
const basic_js_1 = require("./gadgets/basic.js");
const fieldvar_js_1 = require("./core/fieldvar.js");
const exists_js_1 = require("./core/exists.js");
const field_constructor_js_1 = require("./core/field-constructor.js");
const comparison_js_1 = require("./gadgets/comparison.js");
const common_js_1 = require("./gadgets/common.js");
/**
 * A {@link Field} is an element of a prime order [finite field](https://en.wikipedia.org/wiki/Finite_field).
 * Every other provable type is built using the {@link Field} type.
 *
 * The field is the [pasta base field](https://electriccoin.co/blog/the-pasta-curves-for-halo-2-and-beyond/) of order 2^254 + 0x224698fc094cf91b992d30ed00000001 ({@link Field.ORDER}).
 *
 * You can create a new Field from everything "field-like" (`bigint`, integer `number`, decimal `string`, `Field`).
 * @example
 * ```
 * Field(10n); // Field construction from a big integer
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
    value;
    /**
     * The order of the pasta curve that {@link Field} type build on as a `bigint`.
     * Order of the {@link Field} is 28948022309329048855892746252171976963363056481941560715954676764349967630337.
     */
    static ORDER = finite_field_js_1.Fp.modulus;
    /**
     * Coerce anything "field-like" (bigint, number, string, and {@link Field}) to a Field.
     */
    constructor(x) {
        if (x instanceof Field) {
            this.value = x.value;
            return;
        }
        if (Array.isArray(x)) {
            if (typeof x[1] === 'bigint') {
                // FieldConst
                this.value = fieldvar_js_1.FieldVar.constant(x);
                return;
            }
            else {
                // FieldVar
                this.value = x;
                return;
            }
        }
        // TODO this should handle common values efficiently by reading from a lookup table
        this.value = fieldvar_js_1.FieldVar.constant(finite_field_js_1.Fp.mod(BigInt(x)));
    }
    // helpers
    static from(x) {
        if (x instanceof Field)
            return x;
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
    isConstant() {
        return this.value[0] === fieldvar_js_1.FieldType.Constant;
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
    toConstant() {
        return toConstant(this, 'toConstant');
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
        let x = toConstant(this, 'toBigInt');
        return fieldvar_js_1.FieldConst.toBigint(x.value[1]);
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
        return toConstant(this, 'toString').toBigInt().toString();
    }
    /**
     * Assert that this {@link Field} is equal another "field-like" value.
     * Calling this function is equivalent to `Field(...).equals(...).assertEquals(Bool(true))`.
     * See {@link Field.equals} for more details.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the "field-like" value to compare & assert with this {@link Field}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertEquals(y, message) {
        try {
            if (this.isConstant() && isConstant(y)) {
                if (this.toBigInt() !== toFp(y)) {
                    throw Error(`Field.assertEquals(): ${this} != ${y}`);
                }
                return;
            }
            (0, compatible_js_1.assertEqual)(this, toFieldVar(y));
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Add a field-like value to this {@link Field} element.
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
     * // You can use the reverse operation of addition (subtraction) to prove the sum is calculated correctly.
     *
     * sum.sub(x).assertEquals(Field(-7));
     * sum.sub(Field(-7)).assertEquals(x);
     * ```
     *
     * @param y - a "field-like" value to add to the {@link Field}.
     *
     * @return A {@link Field} element equivalent to the modular addition of the two value.
     */
    add(y) {
        if (this.isConstant() && isConstant(y)) {
            return new Field(finite_field_js_1.Fp.add(this.toBigInt(), toFp(y)));
        }
        // return new AST node Add(x, y)
        let z = fieldvar_js_1.FieldVar.add(this.value, toFieldVar(y));
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
            return new Field(finite_field_js_1.Fp.negate(this.toBigInt()));
        }
        // return new AST node Scale(-1, x)
        let z = fieldvar_js_1.FieldVar.scale(fieldvar_js_1.FieldConst[-1], this.value);
        return new Field(z);
    }
    /**
     * Subtract another "field-like" value from this {@link Field} element.
     *
     * @example
     * ```ts
     * const x = Field(3);
     * const difference = x.sub(5);
     *
     * difference.assertEquals(Field(-2));
     * ```
     *
     * **Warning**: This is a modular subtraction in the pasta field.
     *
     * @example
     * ```ts
     * const x = Field(1);
     * const difference = x.sub(Field(2));
     *
     * // If you try to print difference - `console.log(difference.toBigInt())` - you will realize that it prints a very big integer because this is modular arithmetic, and 1 - 2 circles around the field to become p - 1.
     * // You can use the reverse operation of subtraction (addition) to prove the difference is calculated correctly.
     * difference.add(Field(2)).assertEquals(x);
     * ```
     *
     * @param y - a "field-like" value to subtract from the {@link Field}.
     *
     * @return A {@link Field} element equivalent to the modular difference of the two value.
     */
    sub(y) {
        return this.add(Field.from(y).neg());
    }
    /**
     * Checks if this {@link Field} is odd. Returns `true` for odd elements and `false` for even elements.
     *
     * See {@link Field.isEven} for examples.
     */
    isOdd() {
        return (0, comparison_js_1.isOddAndHigh)(this).isOdd;
    }
    /**
     * Checks if this {@link Field} is even. Returns `true` for even elements and `false` for odd elements.
     *
     * @example
     * ```ts
     * let a = Field(5);
     * a.isEven(); // false
     *
     * let b = Field(4);
     * b.isEven(); // true
     * ```
     */
    isEven() {
        return this.isOdd().not();
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
     * @param y - a "field-like" value to multiply with the {@link Field}.
     *
     * @return A {@link Field} element equivalent to the modular difference of the two value.
     */
    mul(y) {
        if (this.isConstant() && isConstant(y)) {
            return new Field(finite_field_js_1.Fp.mul(this.toBigInt(), toFp(y)));
        }
        // if one of the factors is constant, return Scale AST node
        if (isConstant(y)) {
            let z = fieldvar_js_1.FieldVar.scale(toFieldConst(y), this.value);
            return new Field(z);
        }
        if (this.isConstant()) {
            let z = fieldvar_js_1.FieldVar.scale(this.value[1], y.value);
            return new Field(z);
        }
        // create a new witness for z = x*y
        let z = (0, exists_js_1.existsOne)(() => finite_field_js_1.Fp.mul(this.toBigInt(), toFp(y)));
        // add a multiplication constraint
        (0, compatible_js_1.assertMul)(this, y, z);
        return z;
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
     * inverse.assertEquals(Field(1).div(someField)); // This statement is always true regardless of the value of `someField`
     * ```
     *
     * **Warning**: This is a modular inverse. See {@link div} method for more details.
     *
     * @return A {@link Field} element that is equivalent to one divided by this element.
     */
    inv() {
        if (this.isConstant()) {
            let z = finite_field_js_1.Fp.inverse(this.toBigInt());
            if (z === undefined)
                throw Error('Field.inv(): Division by zero');
            return new Field(z);
        }
        // create a witness for z = x^(-1)
        let z = (0, exists_js_1.existsOne)(() => finite_field_js_1.Fp.inverse(this.toBigInt()) ?? 0n);
        // constrain x * z === 1
        (0, compatible_js_1.assertMul)(this, z, fieldvar_js_1.FieldVar[1]);
        return z;
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
     * @param y - a "field-like" value to divide with the {@link Field}.
     *
     * @return A {@link Field} element equivalent to the modular division of the two value.
     */
    div(y) {
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
            return new Field(finite_field_js_1.Fp.square(this.toBigInt()));
        }
        // create a new witness for z = x^2
        let z = (0, exists_js_1.existsOne)(() => finite_field_js_1.Fp.square(this.toBigInt()));
        // add a squaring constraint
        (0, compatible_js_1.assertSquare)(this, z);
        return z;
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
            let z = finite_field_js_1.Fp.sqrt(this.toBigInt());
            if (z === undefined)
                throw Error(`Field.sqrt(): input ${this} has no square root in the field.`);
            return new Field(z);
        }
        // create a witness for sqrt(x)
        let z = (0, exists_js_1.existsOne)(() => finite_field_js_1.Fp.sqrt(this.toBigInt()) ?? 0n);
        // constrain z * z === x
        (0, compatible_js_1.assertSquare)(z, this);
        return z;
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
     * @param y - the "field-like" value to compare with this {@link Field}.
     *
     * @return A {@link Bool} representing if this {@link Field} is equal another "field-like" value.
     */
    equals(y) {
        if (this.isConstant() && isConstant(y)) {
            return new bool_js_1.Bool(this.toBigInt() === toFp(y));
        }
        // TODO: this wastes a constraint on `xMinusY` if one of them is constant
        // to fix, make assertMul() smart about constant terms and only `seal()` if the two inputs are both variables
        // x == y is equivalent to x - y == 0
        let xMinusY = this.sub(y).seal();
        // create witnesses z = 1/(x-y), or z=0 if x=y,
        // and b = 1 - z(x-y)
        let [b, z] = (0, exists_js_1.exists)(2, () => {
            let xmy = xMinusY.toBigInt();
            let z = finite_field_js_1.Fp.inverse(xmy) ?? 0n;
            let b = finite_field_js_1.Fp.sub(1n, finite_field_js_1.Fp.mul(z, xmy));
            return [b, z];
        });
        // add constraints
        // b * (x-y) === 0
        (0, compatible_js_1.assertMul)(b, xMinusY, fieldvar_js_1.FieldVar[0]);
        // z * (x-y) === 1 - b
        (0, compatible_js_1.assertMul)(z, xMinusY, new Field(1).sub(b));
        // ^^^ these prove that b = Bool(x === y):
        // if x = y, the 2nd equation implies b = 1
        // if x != y, the 1st implies b = 0
        return bool_js_1.Bool.Unsafe.fromField(b);
    }
    /**
     * Check if this {@link Field} is less than another "field-like" value.
     * Returns a {@link Bool}, which is a provable type and can be used prove to the validity of this statement.
     *
     * @example
     * ```ts
     * let isTrue = Field(2).lessThan(3);
     * ```
     *
     * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behavior when used with negative inputs or modular division.
     *
     * @example
     * ```ts
     * let isFalse = Field(1).div(3).lessThan(Field(1).div(2)); // in fact, 1/3 > 1/2
     * ```
     *
     * @param y - the "field-like" value to compare with this {@link Field}.
     *
     * @return A {@link Bool} representing if this {@link Field} is less than another "field-like" value.
     */
    lessThan(y) {
        if (this.isConstant() && isConstant(y)) {
            return new bool_js_1.Bool(this.toBigInt() < toFp(y));
        }
        return (0, comparison_js_1.lessThanFull)(this, Field.from(y));
    }
    /**
     * Check if this {@link Field} is less than or equal to another "field-like" value.
     * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
     *
     * @example
     * ```ts
     * let isTrue = Field(3).lessThanOrEqual(3);
     * ```
     *
     * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behaviour when used with negative inputs or modular division.
     *
     * @example
     * ```ts
     * let isFalse = Field(1).div(3).lessThanOrEqual(Field(1).div(2)); // in fact, 1/3 > 1/2
     * ```
     *
     * @param y - the "field-like" value to compare with this {@link Field}.
     *
     * @return A {@link Bool} representing if this {@link Field} is less than or equal another "field-like" value.
     */
    lessThanOrEqual(y) {
        if (this.isConstant() && isConstant(y)) {
            return new bool_js_1.Bool(this.toBigInt() <= toFp(y));
        }
        return (0, comparison_js_1.lessThanOrEqualFull)(this, Field.from(y));
    }
    /**
     * Check if this {@link Field} is greater than another "field-like" value.
     * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
     *
     * @example
     * ```ts
     * let isTrue = Field(5).greaterThan(3);
     * ```
     *
     * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behaviour when used with negative inputs or modular division.
     *
     * @example
     * ```ts
     * let isFalse = Field(1).div(2).greaterThan(Field(1).div(3); // in fact, 1/3 > 1/2
     * ```
     *
     * @param y - the "field-like" value to compare with this {@link Field}.
     *
     * @return A {@link Bool} representing if this {@link Field} is greater than another "field-like" value.
     */
    greaterThan(y) {
        return Field.from(y).lessThan(this);
    }
    /**
     * Check if this {@link Field} is greater than or equal another "field-like" value.
     * Returns a {@link Bool}, which is a provable type and can be used to prove the validity of this statement.
     *
     * @example
     * ```ts
     * let isTrue = Field(3).greaterThanOrEqual(3);
     * ```
     *
     * **Warning**: As this method compares the bigint value of a {@link Field}, it can result in unexpected behaviour when used with negative inputs or modular division.
     *
     * @example
     * ```ts
     * let isFalse = Field(1).div(2).greaterThanOrEqual(Field(1).div(3); // in fact, 1/3 > 1/2
     * ```
     *
     * @param y - the "field-like" value to compare with this {@link Field}.
     *
     * @return A {@link Bool} representing if this {@link Field} is greater than or equal another "field-like" value.
     */
    greaterThanOrEqual(y) {
        return Field.from(y).lessThanOrEqual(this);
    }
    /**
     * Assert that this {@link Field} is less than another "field-like" value.
     *
     * Note: This uses fewer constraints than `x.lessThan(y).assertTrue()`.
     * See {@link lessThan} for more details.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the "field-like" value to compare & assert with this {@link Field}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertLessThan(y, message) {
        try {
            if (this.isConstant() && isConstant(y)) {
                if (!(this.toBigInt() < toFp(y))) {
                    throw Error(`Field.assertLessThan(): expected ${this} < ${y}`);
                }
                return;
            }
            (0, comparison_js_1.assertLessThanFull)(this, Field.from(y));
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Assert that this {@link Field} is less than or equal to another "field-like" value.
     *
     * Note: This uses fewer constraints than `x.lessThanOrEqual(y).assertTrue()`.
     * See {@link Field.lessThanOrEqual} for more details.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the "field-like" value to compare & assert with this {@link Field}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertLessThanOrEqual(y, message) {
        try {
            if (this.isConstant() && isConstant(y)) {
                if (!(this.toBigInt() <= toFp(y))) {
                    throw Error(`Field.assertLessThan(): expected ${this} <= ${y}`);
                }
                return;
            }
            (0, comparison_js_1.assertLessThanOrEqualFull)(this, Field.from(y));
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Assert that this {@link Field} is greater than another "field-like" value.
     *
     * Note: This uses fewer constraints than `x.greaterThan(y).assertTrue()`.
     * See {@link Field.greaterThan} for more details.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the "field-like" value to compare & assert with this {@link Field}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertGreaterThan(y, message) {
        Field.from(y).assertLessThan(this, message);
    }
    /**
     * Assert that this {@link Field} is greater than or equal to another "field-like" value.
     *
     * Note: This uses fewer constraints than `x.greaterThanOrEqual(y).assertTrue()`.
     * See {@link Field.greaterThanOrEqual} for more details.
     *
     * **Important**: If an assertion fails, the code throws an error.
     *
     * @param y - the "field-like" value to compare & assert with this {@link Field}.
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertGreaterThanOrEqual(y, message) {
        Field.from(y).assertLessThanOrEqual(this, message);
    }
    /**
     * Assert that this {@link Field} does not equal another field-like value.
     *
     * Note: This uses fewer constraints than `x.equals(y).assertFalse()`.
     *
     * @param y - the "field-like" value to compare & assert with this {@link Field}.
     * @param message - a string error message to print if the assertion fails, optional.
     *
     * @example
     * ```ts
     * x.assertNotEquals(0, "expect x to be non-zero");
     * ```
     */
    assertNotEquals(y, message) {
        try {
            if (this.isConstant() && isConstant(y)) {
                if (this.toBigInt() === toFp(y)) {
                    throw Error(`Field.assertNotEquals(): ${this} = ${y}`);
                }
                return;
            }
            // inv() proves that a field element is non-zero, using 1 constraint.
            // so this takes 1-2 generic gates, while x.equals(y).assertTrue() takes 3-5
            if (isConstant(y)) {
                // custom single generic gate for (x - y) * z = 1
                // TODO remove once assertMul() handles these cases
                let x = (0, common_js_1.toVar)(this);
                let y0 = toFp(y);
                let z = (0, exists_js_1.existsOne)(() => finite_field_js_1.Fp.inverse(this.toBigInt() - y0) ?? 0n);
                // 1*x*z + 0*x + (-y)*z + (-1) = 0
                (0, basic_js_1.assertBilinear)(x, z, [1n, 0n, -y0, -1n]);
                return;
            }
            this.sub(y).inv();
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Prove that this {@link Field} is equal to 0 or 1.
     * Returns the Field wrapped in a {@link Bool}.
     *
     * If the assertion fails, the code throws an error.
     *
     * @param message - a string error message to print if the assertion fails, optional.
     */
    assertBool(message) {
        try {
            if (this.isConstant()) {
                let x = this.toBigInt();
                (0, errors_js_1.assert)(x === 0n || x === 1n, `Field.assertBool(): expected ${x} to be 0 or 1`);
                return new bool_js_1.Bool(x === 1n);
            }
            (0, compatible_js_1.assertBoolean)(this);
            return bool_js_1.Bool.Unsafe.fromField(this);
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Returns an array of {@link Bool} elements representing [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of this {@link Field} element.
     *
     * If you use the optional `length` argument, proves that the field element fits in `length` bits.
     * The `length` has to be between 0 and 254 and the method throws if it isn't.
     *
     * **Warning**: The cost of this operation in a zk proof depends on the `length` you specify,
     * which by default is 254 bits. Prefer to pass a smaller `length` if possible.
     *
     * @param length - the number of bits to fit the element. If the element does not fit in `length` bits, the functions throws an error.
     *
     * @return An array of {@link Bool} element representing little endian binary representation of this {@link Field}.
     */
    toBits(length = 254) {
        checkBitLength('Field.toBits()', length, 254);
        if (this.isConstant()) {
            let bits = field_bigint_js_1.BinableFp.toBits(this.toBigInt());
            if (bits.slice(length).some((bit) => bit))
                throw Error(`Field.toBits(): ${this} does not fit in ${length} bits`);
            return bits.slice(0, length).map((b) => new bool_js_1.Bool(b));
        }
        let bits = provable_js_1.Provable.witness(provable_js_1.Provable.Array(bool_js_1.Bool, length), () => {
            let f = this.toBigInt();
            return Array.from({ length }, (_, k) => new bool_js_1.Bool(!!((f >> BigInt(k)) & 0x1n)));
        });
        Field.fromBits(bits).assertEquals(this, `Field.toBits(): Input does not fit in ${length} bits`);
        return bits;
    }
    /**
     * Convert a bit array into a {@link Field} element using [little endian binary representation](https://en.wikipedia.org/wiki/Endianness)
     *
     * The method throws if the given bits do not fit in a single Field element. In this case, no more than 254 bits are allowed because some 255 bit integers do not fit into a single Field element.
     *
     * **Important**: If the given `bits` array is an array of `booleans` or {@link Bool} elements that all are `constant`, the resulting {@link Field} element will be a constant as well. Or else, if the given array is a mixture of constants and variables of {@link Bool} type, the resulting {@link Field} will be a variable as well.
     *
     * @param bits - An array of {@link Bool} or `boolean` type.
     *
     * @return A {@link Field} element matching the [little endian binary representation](https://en.wikipedia.org/wiki/Endianness) of the given `bits` array.
     */
    static fromBits(bits) {
        const length = bits.length;
        checkBitLength('Field.fromBits()', length, 254);
        if (bits.every((b) => typeof b === 'boolean' || b.toField().isConstant())) {
            let bits_ = bits
                .map((b) => (typeof b === 'boolean' ? b : b.toBoolean()))
                .concat(Array(finite_field_js_1.Fp.sizeInBits - length).fill(false));
            return new Field(field_bigint_js_1.BinableFp.fromBits(bits_));
        }
        return bits
            .map((b) => new bool_js_1.Bool(b))
            .reduce((acc, bit, idx) => {
            const shift = 1n << BigInt(idx);
            return acc.add(bit.toField().mul(shift));
        }, Field.from(0))
            .seal();
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
        let { constant, terms } = (0, basic_js_1.toLinearCombination)(this.value);
        if (terms.length === 0)
            return ConstantField(constant);
        if (terms.length === 1 && constant === 0n) {
            let [c, x] = terms[0];
            if (c === 1n)
                return VarField(x);
        }
        let x = (0, exists_js_1.existsOne)(() => this.toBigInt());
        this.assertEquals(x);
        return x;
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
        return new Field(finite_field_js_1.Fp.random());
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
    static toFields(value) {
        return [value];
    }
    /**
     * This function is the implementation of {@link Provable.toAuxiliary} for the {@link Field} type.
     *
     * As the primitive {@link Field} type has no auxiliary data associated with it, this function will always return an empty array.
     */
    static toAuxiliary() {
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
    static fromFields([x]) {
        return x;
    }
    /**
     * This function is the implementation of {@link Provable.check} in {@link Field} type.
     *
     * As any field element can be a {@link Field}, this function does not create any assertions, so it does nothing.
     */
    static check() { }
    /**
     * `Provable<Field>.toValue()`
     */
    static toValue(x) {
        return x.toBigInt();
    }
    /**
     * Convert a {@link Field} element to a bigint.
     */
    static toBigint(x) {
        return x.toBigInt();
    }
    /**
     * `Provable<Field>.fromValue()`
     */
    static fromValue(x) {
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
        return toConstant(this, 'toJSON').toString();
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
    static toJSON(value) {
        return value.toJSON();
    }
    /**
     * Deserialize a JSON string containing a "field-like" value into a {@link Field} element.
     *
     * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the string representation of the {@link Field}.
     *
     * @param json - the "field-like" value to coerce the {@link Field} from.
     *
     * @return A {@link Field} coerced from the given JSON string.
     */
    static fromJSON(json) {
        return new Field(field_bigint_js_1.SignableFp.fromJSON(json));
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
    static toInput(value) {
        return { fields: [value] };
    }
    // Binable<Field>
    /**
     * Create an array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link Field} element.
     * Note that the array has always 32 elements as the {@link Field} is a `finite-field` in the order of {@link Field.ORDER}.
     *
     * **Warning**: This operation does _not_ affect the circuit and can't be used to prove anything about the byte representation of the {@link Field}.
     *
     * @param value - The {@link Field} element to generate the array of bytes of.
     *
     * @return An array of digits equal to the [little-endian](https://en.wikipedia.org/wiki/Endianness) byte order of the given {@link Field} element.
     *
     */
    static toBytes(value) {
        return FieldBinable.toBytes(value);
    }
    /**
     * Part of the `Binable` interface.
     *
     * **Warning**: This function is for internal use. It is not intended to be used by a zkApp developer.
     */
    static readBytes(bytes, offset) {
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
    static fromBytes(bytes) {
        return FieldBinable.fromBytes(bytes);
    }
    /**
     * The size of a {@link Field} element in bytes - 32.
     */
    static sizeInBytes = field_bigint_js_1.BinableFp.sizeInBytes;
    /**
     * The size of a {@link Field} element in bits - 255.
     */
    static sizeInBits = finite_field_js_1.Fp.sizeInBits;
}
exports.Field = Field;
(0, field_constructor_js_1.setFieldConstructor)(Field);
const FieldBinable = (0, binable_js_1.defineBinable)({
    toBytes(t) {
        let t0 = toConstantField(t, 'toBytes').toBigInt();
        return field_bigint_js_1.BinableFp.toBytes(t0);
    },
    readBytes(bytes, offset) {
        let uint8array = new Uint8Array(32);
        uint8array.set(bytes.slice(offset, offset + 32));
        let x = field_bigint_js_1.BinableFp.fromBytes([...uint8array]);
        return [new Field(x), offset + 32];
    },
});
// internal helper functions
function isConstant(x) {
    let type = typeof x;
    if (type === 'bigint' || type === 'number' || type === 'string') {
        return true;
    }
    return x.isConstant();
}
function toFp(x) {
    let type = typeof x;
    if (type === 'bigint' || type === 'number' || type === 'string') {
        return finite_field_js_1.Fp.mod(BigInt(x));
    }
    return x.toBigInt();
}
exports.toFp = toFp;
function toFieldConst(x) {
    if (x instanceof Field)
        return x.value[1];
    return fieldvar_js_1.FieldConst.fromBigint(finite_field_js_1.Fp.mod(BigInt(x)));
}
function toFieldVar(x) {
    if (x instanceof Field)
        return x.value;
    return fieldvar_js_1.FieldVar.constant(finite_field_js_1.Fp.mod(BigInt(x)));
}
function withMessage(error, message) {
    if (message === undefined || !(error instanceof Error))
        return error;
    error.message = `${message}\n${error.message}`;
    return error;
}
exports.withMessage = withMessage;
function checkBitLength(name, length, maxLength = finite_field_js_1.Fp.sizeInBits) {
    if (length > maxLength)
        throw Error(`${name}: bit length must be ${maxLength} or less, got ${length}`);
    if (length < 0)
        throw Error(`${name}: bit length must be non-negative, got ${length}`);
}
exports.checkBitLength = checkBitLength;
function toConstant(x, name) {
    return toConstantField(x, name, 'x', 'field element');
}
function toConstantField(x, methodName, varName = 'x', varDescription = 'field element') {
    // if this is a constant, return it
    if (x.isConstant())
        return x;
    // a non-constant can only appear inside a checked computation. everything else is a bug.
    (0, errors_js_1.assert)((0, provable_context_js_1.inCheckedComputation)(), 'variables only exist inside checked computations');
    // if we are inside an asProver or witness block, read the variable's value and return it as constant
    if (bindings_js_1.Snarky.run.inProverBlock()) {
        let value = bindings_js_1.Snarky.field.readVar(x.value);
        return new Field(value);
    }
    // otherwise, calling `toConstant()` is likely a mistake. throw a helpful error message.
    throw Error(readVarMessage(methodName, varName, varDescription));
}
exports.toConstantField = toConstantField;
function readVarMessage(methodName, varName, varDescription) {
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
exports.readVarMessage = readVarMessage;
function VarField(x) {
    return new Field(x);
}
exports.VarField = VarField;
function ConstantField(x) {
    return new Field(x);
}
exports.ConstantField = ConstantField;
