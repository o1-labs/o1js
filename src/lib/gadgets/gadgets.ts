/**
 * Wrapper file for various gadgets, with a namespace and doccomments.
 */
import {
  compactMultiRangeCheck,
  multiRangeCheck,
  rangeCheck64,
} from './range-check.js';
import { not, rotate, xor, and, leftShift, rightShift } from './bitwise.js';
import { Field } from '../core.js';
import { ForeignField, Field3, Sum } from './foreign-field.js';
import { Ecdsa, Point } from './elliptic-curve.js';
import { CurveAffine } from '../../bindings/crypto/elliptic_curve.js';
import { Crypto } from '../crypto.js';

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
   * If the input exceeds 64 bits, the gadget is invalid and fails to prove correct execution of the rotation.
   * To safely use `rotate()`, you need to make sure that the value passed in is range-checked to 64 bits;
   * for example, using {@link Gadgets.rangeCheck64}.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#rotation)
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
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#xor-1)
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
   * of bits specified by the `length` parameter.
   *
   * A NOT gate works by returning `1` in each bit position if the
   * corresponding bit of the operand is `0`, and returning `0` if the
   * corresponding bit of the operand is `1`.
   *
   * The `length` parameter lets you define how many bits to NOT.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints. The operation will fail if the length or the input value is larger than 254.
   *
   * NOT is implemented in two different ways. If the `checked` parameter is set to `true`
   * the {@link Gadgets.xor} gadget is reused with a second argument to be an
   * all one bitmask the same length. This approach needs as many rows as an XOR would need
   * for a single negation. If the `checked` parameter is set to `false`, NOT is
   * implemented as a subtraction of the input from the all one bitmask. This
   * implementation is returned by default if no `checked` parameter is provided.
   *
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#not)
   *
   * @example
   * ```ts
   * // not-ing 4 bits with the unchecked version
   * let a = Field(0b0101);
   * let b = Gadgets.not(a,4,false);
   *
   * b.assertEquals(0b1010);
   *
   * // not-ing 4 bits with the checked version utilizing the xor gadget
   * let a = Field(0b0101);
   * let b = Gadgets.not(a,4,true);
   *
   * b.assertEquals(0b1010);
   * ```
   *
   * @param a - The value to apply NOT to. The operation will fail if the value is larger than 254.
   * @param length - The number of bits to be considered for the NOT operation.
   * @param checked - Optional boolean to determine if the checked or unchecked not implementation is used. If it
   * is set to `true` the {@link Gadgets.xor} gadget is reused. If it is set to `false`, NOT is implemented
   *  as a subtraction of the input from the all one bitmask. It is set to `false` by default if no parameter is provided.
   *
   * @throws Throws an error if the input value exceeds 254 bits.
   */
  not(a: Field, length: number, checked: boolean = false) {
    return not(a, length, checked);
  },

  /**
   * Performs a left shift operation on the provided {@link Field} element.
   * This operation is similar to the `<<` shift operation in JavaScript,
   * where bits are shifted to the left, and the overflowing bits are discarded.
   *
   * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   *
   * **Important:** The gadgets assumes that its input is at most 64 bits in size.
   *
   * If the input exceeds 64 bits, the gadget is invalid and fails to prove correct execution of the shift.
   * Therefore, to safely use `leftShift()`, you need to make sure that the values passed in are range checked to 64 bits.
   * For example, this can be done with {@link Gadgets.rangeCheck64}.
   *
   * @param field {@link Field} element to shift.
   * @param bits Amount of bits to shift the {@link Field} element to the left. The amount should be between 0 and 64 (or else the shift will fail).
   *
   * @throws Throws an error if the input value exceeds 64 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(0b001100)); // 12 in binary
   * const y = Gadgets.leftShift(x, 2); // left shift by 2 bits
   * y.assertEquals(0b110000); // 48 in binary
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * leftShift(xLarge, 32); // throws an error since input exceeds 64 bits
   * ```
   */
  leftShift(field: Field, bits: number) {
    return leftShift(field, bits);
  },

  /**
   * Performs a right shift operation on the provided {@link Field} element.
   * This is similar to the `>>` shift operation in JavaScript, where bits are moved to the right.
   * The `rightShift` function utilizes the rotation method internally to implement this operation.
   *
   * * It’s important to note that these operations are performed considering the big-endian 64-bit representation of the number,
   * where the most significant (64th) bit is on the left end and the least significant bit is on the right end.
   *
   * **Important:** The gadgets assumes that its input is at most 64 bits in size.
   *
   * If the input exceeds 64 bits, the gadget is invalid and fails to prove correct execution of the shift.
   * To safely use `rightShift()`, you need to make sure that the value passed in is range-checked to 64 bits;
   * for example, using {@link Gadgets.rangeCheck64}.
   *
   * @param field {@link Field} element to shift.
   * @param bits Amount of bits to shift the {@link Field} element to the right. The amount should be between 0 and 64 (or else the shift will fail).
   *
   * @throws Throws an error if the input value exceeds 64 bits.
   *
   * @example
   * ```ts
   * const x = Provable.witness(Field, () => Field(0b001100)); // 12 in binary
   * const y = Gadgets.rightShift(x, 2); // right shift by 2 bits
   * y.assertEquals(0b000011); // 3 in binary
   *
   * const xLarge = Provable.witness(Field, () => Field(12345678901234567890123456789012345678n));
   * rightShift(xLarge, 32); // throws an error since input exceeds 64 bits
   * ```
   */
  rightShift(field: Field, bits: number) {
    return rightShift(field, bits);
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
   * You can find more details about the implementation in the [Mina book](https://o1-labs.github.io/proof-systems/specs/kimchi.html?highlight=gates#and)
   *
   * The `length` parameter lets you define how many bits should be compared. `length` is rounded to the nearest multiple of 16, `paddedLength = ceil(length / 16) * 16`, and both input values are constrained to fit into `paddedLength` bits. The output is guaranteed to have at most `paddedLength` bits as well.
   *
   * **Note:** Specifying a larger `length` parameter adds additional constraints.
   *
   * **Note:** Both {@link Field} elements need to fit into `2^paddedLength - 1`. Otherwise, an error is thrown and no proof can be generated.
   * For example, with `length = 2` (`paddedLength = 16`), `and()` will fail for any input that is larger than `2**16`.
   *
   * @example
   * ```typescript
   * let a = Field(3);    // ... 000011
   * let b = Field(5);    // ... 000101
   *
   * let c = Gadgets.and(a, b, 2);    // ... 000001
   * c.assertEquals(1);
   * ```
   */
  and(a: Field, b: Field, length: number) {
    return and(a, b, length);
  },

  /**
   * Multi-range check.
   *
   * Proves that x, y, z are all in the range [0, 2^88).
   *
   * This takes 4 rows, so it checks 88*3/4 = 66 bits per row. This is slightly more efficient
   * than 64-bit range checks, which can do 64 bits in 1 row.
   *
   * In particular, the 3x88-bit range check supports bigints up to 264 bits, which in turn is enough
   * to support foreign field multiplication with moduli up to 2^259.
   *
   * @example
   * ```ts
   * Gadgets.multiRangeCheck([x, y, z]);
   * ```
   *
   * @throws Throws an error if one of the input values exceeds 88 bits.
   */
  multiRangeCheck(limbs: Field3) {
    multiRangeCheck(limbs);
  },

  /**
   * Compact multi-range check
   *
   * This is a variant of {@link multiRangeCheck} where the first two variables are passed in
   * combined form xy = x + 2^88*y.
   *
   * The gadget
   * - splits up xy into x and y
   * - proves that xy = x + 2^88*y
   * - proves that x, y, z are all in the range [0, 2^88).
   *
   * The split form [x, y, z] is returned.
   *
   * @example
   * ```ts
   * let [x, y] = Gadgets.compactMultiRangeCheck([xy, z]);
   * ```
   *
   * @throws Throws an error if `xy` exceeds 2*88 = 176 bits, or if z exceeds 88 bits.
   */
  compactMultiRangeCheck(xy: Field, z: Field) {
    return compactMultiRangeCheck(xy, z);
  },

  /**
   * Gadgets for foreign field operations.
   *
   * A _foreign field_ is a finite field different from the native field of the proof system.
   *
   * The `ForeignField` namespace exposes operations like modular addition and multiplication,
   * which work for any finite field of size less than 2^259.
   *
   * Foreign field elements are represented as 3 limbs of native field elements.
   * Each limb holds 88 bits of the total, in little-endian order.
   *
   * All `ForeignField` gadgets expect that their input limbs are constrained to the range [0, 2^88).
   * Range checks on outputs are added by the gadget itself.
   */
  ForeignField: {
    /**
     * Foreign field addition: `x + y mod f`
     *
     * The modulus `f` does not need to be prime.
     *
     * Inputs and outputs are 3-tuples of native Fields.
     * Each input limb is assumed to be in the range [0, 2^88), and the gadget is invalid if this is not the case.
     * The result limbs are guaranteed to be in the same range.
     *
     * @example
     * ```ts
     * let x = Provable.witness(Field3.provable, () => Field3.from(9n));
     * let y = Provable.witness(Field3.provable, () => Field3.from(10n));
     *
     * // range check x and y
     * Gadgets.multiRangeCheck(x);
     * Gadgets.multiRangeCheck(y);
     *
     * // compute x + y mod 17
     * let z = ForeignField.add(x, y, 17n);
     *
     * Provable.log(z); // ['2', '0', '0'] = limb representation of 2 = 9 + 10 mod 17
     * ```
     *
     * **Warning**: The gadget does not assume that inputs are reduced modulo f,
     * and does not prove that the result is reduced modulo f.
     * It only guarantees that the result is in the correct residue class.
     *
     * @param x left summand
     * @param y right summand
     * @param f modulus
     * @returns x + y mod f
     */
    add(x: Field3, y: Field3, f: bigint) {
      return ForeignField.add(x, y, f);
    },

    /**
     * Foreign field subtraction: `x - y mod f`
     *
     * See {@link Gadgets.ForeignField.add} for assumptions and usage examples.
     *
     * @throws fails if `x - y < -f`, where the result cannot be brought back to a positive number by adding `f` once.
     */
    sub(x: Field3, y: Field3, f: bigint) {
      return ForeignField.sub(x, y, f);
    },

    /**
     * Foreign field sum: `xs[0] + signs[0] * xs[1] + ... + signs[n-1] * xs[n] mod f`
     *
     * This gadget takes a list of inputs and a list of signs (of size one less than the inputs),
     * and computes a chain of additions or subtractions, depending on the sign.
     * A sign is of type `1n | -1n`, where `1n` represents addition and `-1n` represents subtraction.
     *
     * **Note**: For 3 or more inputs, `sum()` uses fewer constraints than a sequence of `add()` and `sub()` calls,
     * because we can avoid range checks on intermediate results.
     *
     * See {@link Gadgets.ForeignField.add} for assumptions on inputs.
     *
     * @example
     * ```ts
     * let x = Provable.witness(Field3.provable, () => Field3.from(4n));
     * let y = Provable.witness(Field3.provable, () => Field3.from(5n));
     * let z = Provable.witness(Field3.provable, () => Field3.from(10n));
     *
     * // range check x, y, z
     * Gadgets.multiRangeCheck(x);
     * Gadgets.multiRangeCheck(y);
     * Gadgets.multiRangeCheck(z);
     *
     * // compute x + y - z mod 17
     * let sum = ForeignField.sum([x, y, z], [1n, -1n], 17n);
     *
     * Provable.log(sum); // ['16', '0', '0'] = limb representation of 16 = 4 + 5 - 10 mod 17
     * ```
     */
    sum(xs: Field3[], signs: (1n | -1n)[], f: bigint) {
      return ForeignField.sum(xs, signs, f);
    },

    /**
     * Foreign field multiplication: `x * y mod f`
     *
     * The modulus `f` does not need to be prime, but has to be smaller than 2^259.
     *
     * **Assumptions**: In addition to the assumption that input limbs are in the range [0, 2^88), as in all foreign field gadgets,
     * this assumes an additional bound on the inputs: `x * y < 2^264 * p`, where p is the native modulus.
     * We usually assert this bound by proving that `x[2] < f[2] + 1`, where `x[2]` is the most significant limb of x.
     * To do this, we use an 88-bit range check on `2^88 - x[2] - (f[2] + 1)`, and same for y.
     * The implication is that x and y are _almost_ reduced modulo f.
     *
     * All of the above assumptions are checked by {@link Gadgets.ForeignField.assertAlmostReduced}.
     *
     * **Warning**: This gadget does not add the extra bound check on the result.
     * So, to use the result in another foreign field multiplication, you have to add the bound check on it yourself, again.
     *
     * @example
     * ```ts
     * // example modulus: secp256k1 prime
     * let f = (1n << 256n) - (1n << 32n) - 0b1111010001n;
     *
     * let x = Provable.witness(Field3.provable, () => Field3.from(f - 1n));
     * let y = Provable.witness(Field3.provable, () => Field3.from(f - 2n));
     *
     * // range check x, y and prove additional bounds x[2] <= f[2]
     * ForeignField.assertAlmostReduced([x, y], f);
     *
     * // compute x * y mod f
     * let z = ForeignField.mul(x, y, f);
     *
     * Provable.log(z); // ['2', '0', '0'] = limb representation of 2 = (-1)*(-2) mod f
     * ```
     */
    mul(x: Field3, y: Field3, f: bigint) {
      return ForeignField.mul(x, y, f);
    },

    /**
     * Foreign field inverse: `x^(-1) mod f`
     *
     * See {@link Gadgets.ForeignField.mul} for assumptions on inputs and usage examples.
     *
     * This gadget adds an extra bound check on the result, so it can be used directly in another foreign field multiplication.
     */
    inv(x: Field3, f: bigint) {
      return ForeignField.inv(x, f);
    },

    /**
     * Foreign field division: `x * y^(-1) mod f`
     *
     * See {@link Gadgets.ForeignField.mul} for assumptions on inputs and usage examples.
     *
     * This gadget adds an extra bound check on the result, so it can be used directly in another foreign field multiplication.
     *
     * @throws Different than {@link Gadgets.ForeignField.mul}, this fails on unreduced input `x`, because it checks that `x === (x/y)*y` and the right side will be reduced.
     */
    div(x: Field3, y: Field3, f: bigint) {
      return ForeignField.div(x, y, f);
    },

    /**
     * Optimized multiplication of sums in a foreign field, for example: `(x - y)*z = a + b + c mod f`
     *
     * Note: This is much more efficient than using {@link Gadgets.ForeignField.add} and {@link Gadgets.ForeignField.sub} separately to
     * compute the multiplication inputs and outputs, and then using {@link Gadgets.ForeignField.mul} to constrain the result.
     *
     * The sums passed into this gadgets are "lazy sums" created with {@link Gadgets.ForeignField.Sum}.
     * You can also pass in plain {@link Field3} elements.
     *
     * **Assumptions**: The assumptions on the _summands_ are analogous to the assumptions described in {@link Gadgets.ForeignField.mul}:
     * - each summand's limbs are in the range [0, 2^88)
     * - summands that are part of a multiplication input satisfy `x[2] <= f[2]`
     *
     * @throws if the modulus is so large that the second assumption no longer suffices for validity of the multiplication.
     * For small sums and moduli < 2^256, this will not fail.
     *
     * @throws if the provided multiplication result is not correct modulo f.
     *
     * @example
     * ```ts
     * // range-check x, y, z, a, b, c
     * ForeignField.assertAlmostReduced([x, y, z], f);
     * Gadgets.multiRangeCheck(a);
     * Gadgets.multiRangeCheck(b);
     * Gadgets.multiRangeCheck(c);
     *
     * // create lazy input sums
     * let xMinusY = ForeignField.Sum(x).sub(y);
     * let aPlusBPlusC = ForeignField.Sum(a).add(b).add(c);
     *
     * // assert that (x - y)*z = a + b + c mod f
     * ForeignField.assertMul(xMinusY, z, aPlusBPlusC, f);
     * ```
     */
    assertMul(x: Field3 | Sum, y: Field3 | Sum, z: Field3 | Sum, f: bigint) {
      return ForeignField.assertMul(x, y, z, f);
    },

    /**
     * Lazy sum of {@link Field3} elements, which can be used as input to {@link Gadgets.ForeignField.assertMul}.
     */
    Sum(x: Field3) {
      return ForeignField.Sum(x);
    },

    /**
     * Prove that each of the given {@link Field3} elements is "almost" reduced modulo f,
     * i.e., satisfies the assumptions required by {@link Gadgets.ForeignField.mul} and other gadgets:
     * - each limb is in the range [0, 2^88)
     * - the most significant limb is less or equal than the modulus, x[2] <= f[2]
     *
     * **Note**: This method is most efficient when the number of input elements is a multiple of 3.
     *
     * @throws if any of the assumptions is violated.
     *
     * @example
     * ```ts
     * let x = Provable.witness(Field3.provable, () => Field3.from(4n));
     * let y = Provable.witness(Field3.provable, () => Field3.from(5n));
     * let z = Provable.witness(Field3.provable, () => Field3.from(10n));
     *
     * ForeignField.assertAlmostReduced([x, y, z], f);
     *
     * // now we can use x, y, z as inputs to foreign field multiplication
     * let xy = ForeignField.mul(x, y, f);
     * let xyz = ForeignField.mul(xy, z, f);
     *
     * // since xy is an input to another multiplication, we need to prove that it is almost reduced again!
     * ForeignField.assertAlmostReduced([xy], f); // TODO: would be more efficient to batch this with 2 other elements
     * ```
     */
    assertAlmostReduced(xs: Field3[], f: bigint) {
      ForeignField.assertAlmostReduced(xs, f);
    },
  },

  /**
   * ECDSA verification gadget and helper methods.
   */
  Ecdsa: {
    // TODO add an easy way to prove that the public key lies on the curve, and show in the example
    /**
     * Verify an ECDSA signature.
     *
     * **Important:** This method returns a {@link Bool} which indicates whether the signature is valid.
     * So, to actually prove validity of a signature, you need to assert that the result is true.
     *
     * @example
     * ```ts
     * const Curve = Crypto.createCurve(Crypto.CurveParams.Secp256k1);
     *
     * // assert that message hash and signature are valid scalar field elements
     * Gadgets.ForeignField.assertAlmostReduced(
     *   [signature.r, signature.s, msgHash],
     *   Curve.order
     * );
     *
     * // verify signature
     * let isValid = Gadgets.Ecdsa.verify(Curve, signature, msgHash, publicKey);
     * isValid.assertTrue();
     * ```
     */
    verify(
      Curve: CurveAffine,
      signature: Ecdsa.Signature,
      msgHash: Field3,
      publicKey: Point
    ) {
      Ecdsa.verify(Curve, signature, msgHash, publicKey);
    },

    /**
     * Sign a message hash using ECDSA.
     *
     * _This method is not provable._
     */
    sign(
      Curve: Crypto.Curve,
      msgHash: bigint,
      privateKey: bigint
    ): Ecdsa.signature {
      return Ecdsa.sign(Curve, msgHash, privateKey);
    },

    /**
     * Non-provable helper methods for interacting with ECDSA signatures.
     */
    Signature: Ecdsa.Signature,
  },

  /**
   * Helper methods to interact with 3-limb vectors of Fields.
   *
   * **Note:** This interface does not contain any provable methods.
   */
  Field3,
};

export namespace Gadgets {
  /**
   * A 3-tuple of Fields, representing a 3-limb bigint.
   */
  export type Field3 = [Field, Field, Field];

  export namespace ForeignField {
    /**
     * Lazy sum of {@link Field3} elements, which can be used as input to {@link Gadgets.ForeignField.assertMul}.
     */
    export type Sum = Sum_;
  }

  export namespace Ecdsa {
    /**
     * ECDSA signature consisting of two curve scalars.
     */
    export type Signature = EcdsaSignature;
    export type signature = ecdsaSignature;
  }
}
type Sum_ = Sum;
type EcdsaSignature = Ecdsa.Signature;
type ecdsaSignature = Ecdsa.signature;
