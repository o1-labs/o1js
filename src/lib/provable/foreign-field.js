import { mod, Fp, createField } from '../../bindings/crypto/finite-field.js';
import { checkBitLength, Field, withMessage } from './field.js';
import { Provable } from './provable.js';
import { Tuple, TupleN } from '../util/types.js';
import { Gadgets } from './gadgets/gadgets.js';
import { ForeignField as FF, Field3 } from './gadgets/foreign-field.js';
import { assert } from './gadgets/common.js';
import { l3, l } from './gadgets/range-check.js';
// external API
export { createForeignField };
class ForeignField {
    // static parameters
    static get Bigint() {
        assert(this._Bigint !== undefined, 'ForeignField class not initialized.');
        return this._Bigint;
    }
    static get modulus() {
        assert(this._modulus !== undefined, 'ForeignField class not initialized.');
        return this._modulus;
    }
    get modulus() {
        return this.constructor.modulus;
    }
    static get sizeInBits() {
        return this.modulus.toString(2).length;
    }
    get Constructor() {
        return this.constructor;
    }
    /**
     * Constructor for unreduced field elements.
     */
    static get Unreduced() {
        assert(this._variants !== undefined, 'ForeignField class not initialized.');
        return this._variants.unreduced;
    }
    /**
     * Constructor for field elements that are "almost reduced", i.e. lie in the range [0, 2^ceil(log2(p))).
     */
    static get AlmostReduced() {
        assert(this._variants !== undefined, 'ForeignField class not initialized.');
        return this._variants.almostReduced;
    }
    /**
     * Constructor for field elements that are fully reduced, i.e. lie in the range [0, p).
     */
    static get Canonical() {
        assert(this._variants !== undefined, 'ForeignField class not initialized.');
        return this._variants.canonical;
    }
    /**
     * Create a new {@link ForeignField} from a bigint, number, string or another ForeignField.
     * @example
     * ```ts
     * let x = new ForeignField(5);
     * ```
     *
     * Note: Inputs must be range checked if they originate from a different field with a different modulus or if they are not constants.
     *
     * - When constructing from another {@link ForeignField} instance, ensure the modulus matches. If not, check the modulus using `Gadgets.ForeignField.assertLessThan()` and handle appropriately.
     * - When constructing from a `Field3` array, ensure all elements are valid Field elements and range checked.
     * - Ensure constants are correctly reduced to the modulus of the field.
     */
    constructor(x) {
        const p = this.modulus;
        if (x instanceof ForeignField) {
            if (x.modulus !== p) {
                throw new Error(`ForeignField constructor: modulus mismatch. Expected ${p}, got ${x.modulus}. Please provide a value with the correct modulus. You can use 'Gadgets.ForeignField.assertLessThan()' to check it.`);
            }
            this.value = x.value;
            return;
        }
        // Field3
        if (Array.isArray(x)) {
            this.value = x;
            return;
        }
        // constant
        this.value = Field3.from(mod(BigInt(x), p));
    }
    static from(x) {
        if (x instanceof this)
            return x;
        return new this.Canonical(x);
    }
    /**
     * @internal
     * Checks whether this field element is a constant.
     *
     * See {@link FieldVar} to understand constants vs variables.
     */
    isConstant() {
        return Field3.isConstant(this.value);
    }
    /**
     * @internal
     * Convert this field element to a constant.
     *
     * See {@link FieldVar} to understand constants vs variables.
     *
     * **Warning**: This function is only useful in {@link Provable.witness} or {@link Provable.asProver} blocks,
     * that is, in situations where the prover computes a value outside provable code.
     */
    toConstant() {
        let constantLimbs = Tuple.map(this.value, (l) => l.toConstant());
        return new this.Constructor(constantLimbs);
    }
    /**
     * Convert this field element to a bigint.
     */
    toBigInt() {
        return Field3.toBigint(this.value);
    }
    /**
     * Assert that this field element lies in the range [0, 2^k),
     * where k = ceil(log2(p)) and p is the foreign field modulus.
     *
     * Returns the field element as a {@link AlmostForeignField}.
     *
     * For a more efficient version of this for multiple field elements, see {@link assertAlmostReduced}.
     *
     * Note: this does not ensure that the field elements is in the canonical range [0, p).
     * To assert that stronger property, there is {@link assertCanonical}.
     * You should typically use {@link assertAlmostReduced} though, because it is cheaper to prove and sufficient for
     * ensuring validity of all our non-native field arithmetic methods.
     */
    assertAlmostReduced() {
        // TODO: this is not very efficient, but the only way to abstract away the complicated
        // range check assumptions and also not introduce a global context of pending range checks.
        // we plan to get rid of bounds checks anyway, then this is just a multi-range check
        let [x] = this.Constructor.assertAlmostReduced(this);
        return x;
    }
    /**
     * Assert that one or more field elements lie in the range [0, 2^k),
     * where k = ceil(log2(p)) and p is the foreign field modulus.
     *
     * This is most efficient than when checking a multiple of 3 field elements at once.
     */
    static assertAlmostReduced(...xs) {
        Gadgets.ForeignField.assertAlmostReduced(xs.map((x) => x.value), this.modulus, { skipMrc: true });
        return Tuple.map(xs, this.AlmostReduced.unsafeFrom);
    }
    /**
     * Assert that this field element is fully reduced,
     * i.e. lies in the range [0, p), where p is the foreign field modulus.
     *
     * Returns the field element as a {@link CanonicalForeignField}.
     */
    assertCanonical() {
        this.assertLessThan(this.modulus);
        return this.Constructor.Canonical.unsafeFrom(this);
    }
    // arithmetic with full constraints, for safe use
    /**
     * Finite field addition
     * @example
     * ```ts
     * x.add(2); // x + 2 mod p
     * ```
     */
    add(y) {
        return this.Constructor.sum([this, y], [1]);
    }
    /**
     * Finite field negation
     * @example
     * ```ts
     * x.neg(); // -x mod p = p - x
     * ```
     */
    neg() {
        // this gets a special implementation because negation proves that the return value is almost reduced.
        // it shows that r = f - x >= 0 or r = 0 (for x=0) over the integers, which implies r < f
        // see also `Gadgets.ForeignField.assertLessThan()`
        let xNeg = Gadgets.ForeignField.neg(this.value, this.modulus);
        return new this.Constructor.AlmostReduced(xNeg);
    }
    /**
     * Finite field subtraction
     * @example
     * ```ts
     * x.sub(1); // x - 1 mod p
     * ```
     */
    sub(y) {
        return this.Constructor.sum([this, y], [-1]);
    }
    /**
     * Sum (or difference) of multiple finite field elements.
     *
     * @example
     * ```ts
     * let z = ForeignField.sum([3, 2, 1], [-1, 1]); // 3 - 2 + 1
     * z.assertEquals(2);
     * ```
     *
     * This method expects a list of ForeignField-like values, `x0,...,xn`,
     * and a list of "operations" `op1,...,opn` where every op is 1 or -1 (plus or minus),
     * and returns
     *
     * `x0 + op1*x1 + ... + opn*xn`
     *
     * where the sum is computed in finite field arithmetic.
     *
     * **Important:** For more than two summands, this is significantly more efficient
     * than chaining calls to {@link ForeignField.add} and {@link ForeignField.sub}.
     *
     */
    static sum(xs, operations) {
        const p = this.modulus;
        let fields = xs.map((x) => toLimbs(x, p));
        let ops = operations.map((op) => (op === 1 ? 1n : -1n));
        let z = Gadgets.ForeignField.sum(fields, ops, p);
        return new this.Unreduced(z);
    }
    assertEquals(y, message) {
        const p = this.modulus;
        try {
            if (this.isConstant() && isConstant(y)) {
                let x = this.toBigInt();
                let y0 = mod(toBigInt(y), p);
                if (x !== y0) {
                    throw Error(`ForeignField.assertEquals(): ${x} != ${y0}`);
                }
                return new this.Constructor.Canonical(this.value);
            }
            Provable.assertEqual(this.Constructor, this, new this.Constructor(y));
            if (isConstant(y) || y instanceof this.Constructor.Canonical) {
                return new this.Constructor.Canonical(this.value);
            }
            else if (y instanceof this.Constructor.AlmostReduced) {
                return new this.Constructor.AlmostReduced(this.value);
            }
            else {
                return this;
            }
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    /**
     * Assert that this field element is less than a constant c: `x < c`.
     *
     * The constant must satisfy `0 <= c < 2^264`, otherwise an error is thrown.
     *
     * @example
     * ```ts
     * x.assertLessThan(10);
     * ```
     */
    assertLessThan(c, message) {
        assert(c >= 0 && c < 1n << l3, `ForeignField.assertLessThan(): expected c <= c < 2^264, got ${c}`);
        try {
            Gadgets.ForeignField.assertLessThan(this.value, toBigInt(c));
        }
        catch (err) {
            throw withMessage(err, message);
        }
    }
    // bit packing
    /**
     * Unpack a field element to its bits, as a {@link Bool}[] array.
     *
     * This method is provable!
     */
    toBits(length) {
        const sizeInBits = this.Constructor.sizeInBits;
        if (length === undefined)
            length = sizeInBits;
        checkBitLength('ForeignField.toBits()', length, sizeInBits);
        let [l0, l1, l2] = this.value;
        let limbSize = Number(l);
        let xBits = l0.toBits(Math.min(length, limbSize));
        length -= limbSize;
        if (length <= 0) {
            // constrain the remaining two high-limbs to be zero, return the first limb
            l1.assertEquals(0);
            l2.assertEquals(0);
            return xBits;
        }
        let yBits = l1.toBits(Math.min(length, limbSize));
        length -= limbSize;
        if (length <= 0) {
            // constrain the highest limb to be zero, return the first two limbs
            l2.assertEquals(0);
            return [...xBits, ...yBits];
        }
        let zBits = l2.toBits(Math.min(length, limbSize));
        return [...xBits, ...yBits, ...zBits];
    }
    /**
     * Create a field element from its bits, as a `Bool[]` array.
     *
     * This method is provable!
     */
    static fromBits(bits) {
        let length = bits.length;
        checkBitLength('ForeignField.fromBits()', length, this.sizeInBits);
        let limbSize = Number(l);
        let l0 = Field.fromBits(bits.slice(0 * limbSize, 1 * limbSize));
        let l1 = Field.fromBits(bits.slice(1 * limbSize, 2 * limbSize));
        let l2 = Field.fromBits(bits.slice(2 * limbSize, 3 * limbSize));
        // note: due to the check on the number of bits, we know we return an "almost valid" field element
        return new this.AlmostReduced([l0, l1, l2]);
    }
    static random() {
        return new this.Canonical(this.Bigint.random());
    }
    /**
     * Instance version of `Provable<ForeignField>.toFields`, see {@link Provable.toFields}
     */
    toFields() {
        return this.value;
    }
    static check(_) {
        throw Error('ForeignField.check() not implemented: must use a subclass');
    }
    /**
     * `Provable<ForeignField>`, see {@link Provable}
     */
    static get provable() {
        assert(this._provable !== undefined, 'ForeignField class not initialized.');
        return this._provable;
    }
}
ForeignField._Bigint = undefined;
ForeignField._modulus = undefined;
/**
 * Sibling classes that represent different ranges of field elements.
 */
ForeignField._variants = undefined;
ForeignField._provable = undefined;
class ForeignFieldWithMul extends ForeignField {
    /**
     * Finite field multiplication
     * @example
     * ```ts
     * x.mul(y); // x*y mod p
     * ```
     */
    mul(y) {
        const p = this.modulus;
        let z = Gadgets.ForeignField.mul(this.value, toLimbs(y, p), p);
        return new this.Constructor.Unreduced(z);
    }
    /**
     * Multiplicative inverse in the finite field
     * @example
     * ```ts
     * let z = x.inv(); // 1/x mod p
     * z.mul(x).assertEquals(1);
     * ```
     */
    inv() {
        const p = this.modulus;
        let z = Gadgets.ForeignField.inv(this.value, p);
        return new this.Constructor.AlmostReduced(z);
    }
    /**
     * Division in the finite field, i.e. `x*y^(-1) mod p` where `y^(-1)` is the finite field inverse.
     * @example
     * ```ts
     * let z = x.div(y); // x/y mod p
     * z.mul(y).assertEquals(x);
     * ```
     */
    div(y) {
        const p = this.modulus;
        let z = Gadgets.ForeignField.div(this.value, toLimbs(y, p), p);
        return new this.Constructor.AlmostReduced(z);
    }
}
class UnreducedForeignField extends ForeignField {
    constructor() {
        super(...arguments);
        this.type = 'Unreduced';
    }
    static get provable() {
        assert(this._provable !== undefined, 'ForeignField class not initialized.');
        return this._provable;
    }
    static check(x) {
        Gadgets.multiRangeCheck(x.value);
    }
}
UnreducedForeignField._provable = undefined;
class AlmostForeignField extends ForeignFieldWithMul {
    constructor(x) {
        super(x);
        this.type = 'AlmostReduced';
    }
    static get provable() {
        assert(this._provable !== undefined, 'ForeignField class not initialized.');
        return this._provable;
    }
    static check(x) {
        Gadgets.multiRangeCheck(x.value);
        x.assertAlmostReduced();
    }
    /**
     * Coerce the input to an {@link AlmostForeignField} without additional assertions.
     *
     * **Warning:** Only use if you know what you're doing.
     */
    static unsafeFrom(x) {
        return new this(x.value);
    }
    /**
     * Check equality with a constant value.
     *
     * @example
     * ```ts
     * let isXZero = x.equals(0);
     * ```
     */
    equals(y) {
        return FF.equals(this.value, BigInt(y), this.modulus);
    }
}
AlmostForeignField._provable = undefined;
class CanonicalForeignField extends ForeignFieldWithMul {
    constructor(x) {
        super(x);
        this.type = 'FullyReduced';
    }
    static get provable() {
        assert(this._provable !== undefined, 'ForeignField class not initialized.');
        return this._provable;
    }
    static check(x) {
        Gadgets.multiRangeCheck(x.value);
        x.assertCanonical();
    }
    /**
     * Coerce the input to a {@link CanonicalForeignField} without additional assertions.
     *
     * **Warning:** Only use if you know what you're doing.
     */
    static unsafeFrom(x) {
        return new this(x.value);
    }
    /**
     * Check equality with a ForeignField-like value.
     *
     * @example
     * ```ts
     * let isEqual = x.equals(y);
     * ```
     *
     * Note: This method only exists on canonical fields; on unreduced fields, it would be easy to
     * misuse, because not being exactly equal does not imply being unequal modulo p.
     */
    equals(y) {
        let [x0, x1, x2] = this.value;
        let [y0, y1, y2] = toLimbs(y, this.modulus);
        let x01 = x0.add(x1.mul(1n << l)).seal();
        let y01 = y0.add(y1.mul(1n << l)).seal();
        return x01.equals(y01).and(x2.equals(y2));
    }
}
CanonicalForeignField._provable = undefined;
function toLimbs(x, p) {
    if (x instanceof ForeignField)
        return x.value;
    return Field3.from(mod(BigInt(x), p));
}
function toBigInt(x) {
    if (x instanceof ForeignField)
        return x.toBigInt();
    return BigInt(x);
}
function isConstant(x) {
    if (x instanceof ForeignField)
        return x.isConstant();
    return true;
}
/**
 * Create a class representing a prime order finite field, which is different from the native {@link Field}.
 *
 * ```ts
 * const SmallField = createForeignField(17n); // the finite field F_17
 * ```
 *
 * `createForeignField(p)` takes the prime modulus `p` of the finite field as input, as a bigint.
 * We support prime moduli up to a size of 259 bits.
 *
 * The returned {@link ForeignField} class supports arithmetic modulo `p` (addition and multiplication),
 * as well as helper methods like `assertEquals()` and `equals()`.
 *
 * _Advanced details:_
 *
 * Internally, a foreign field element is represented as three native field elements, each of which
 * represents a limb of 88 bits. Therefore, being a valid foreign field element means that all 3 limbs
 * fit in 88 bits, and the foreign field element altogether is smaller than the modulus p.
 *
 * Since the full `x < p` check is expensive, by default we only prove a weaker assertion, `x < 2^ceil(log2(p))`,
 * see {@link ForeignField.assertAlmostReduced} for more details.
 *
 * This weaker assumption is what we call "almost reduced", and it is represented by the {@link AlmostForeignField} class.
 * Note that only {@link AlmostForeignField} supports multiplication and inversion, while {@link UnreducedForeignField}
 * only supports addition and subtraction.
 *
 * This function returns the `Unreduced` class, which will cause the minimum amount of range checks to be created by default.
 * If you want to do multiplication, you have two options:
 * - create your field elements using the {@link ForeignField.AlmostReduced} constructor.
 * ```ts
 * let x = Provable.witness(ForeignField.AlmostReduced, () => 5n);
 * ```
 * - create your field elements normally and convert them using `x.assertAlmostReduced()`.
 * ```ts
 * let xChecked = x.assertAlmostReduced(); // asserts x < 2^ceil(log2(p)); returns `AlmostForeignField`
 * ```
 *
 * Similarly, there is a separate class {@link CanonicalForeignField} which represents fully reduced, "canonical" field elements.
 * To convert to a canonical field element, use `ForeignField.assertCanonical()`:
 *
 * ```ts
 * x.assertCanonical(); // asserts x < p; returns `CanonicalForeignField`
 * ```
 * You will likely not need canonical fields most of the time.
 *
 * Base types for all of these classes are separately exported as {@link UnreducedForeignField}, {@link AlmostForeignField} and {@link CanonicalForeignField}.,
 *
 * @param modulus the modulus of the finite field you are instantiating
 */
function createForeignField(modulus) {
    assert(modulus > 0n, `ForeignField: modulus must be positive, got ${modulus}`);
    assert(modulus < foreignFieldMax, `ForeignField: modulus exceeds the max supported size of 2^${foreignFieldMaxBits}`);
    let Bigint = createField(modulus);
    class UnreducedField extends UnreducedForeignField {
    }
    UnreducedField._Bigint = Bigint;
    UnreducedField._modulus = modulus;
    UnreducedField._provable = provable(UnreducedField);
    // bind public static methods to the class so that they have `this` defined
    UnreducedField.from = ForeignField.from.bind(UnreducedField);
    UnreducedField.sum = ForeignField.sum.bind(UnreducedField);
    UnreducedField.fromBits = ForeignField.fromBits.bind(UnreducedField);
    class AlmostField extends AlmostForeignField {
    }
    AlmostField._Bigint = Bigint;
    AlmostField._modulus = modulus;
    AlmostField._provable = provable(AlmostField);
    // bind public static methods to the class so that they have `this` defined
    AlmostField.from = ForeignField.from.bind(AlmostField);
    AlmostField.sum = ForeignField.sum.bind(AlmostField);
    AlmostField.fromBits = ForeignField.fromBits.bind(AlmostField);
    AlmostField.unsafeFrom = AlmostForeignField.unsafeFrom.bind(AlmostField);
    class CanonicalField extends CanonicalForeignField {
    }
    CanonicalField._Bigint = Bigint;
    CanonicalField._modulus = modulus;
    CanonicalField._provable = provable(CanonicalField);
    // bind public static methods to the class so that they have `this` defined
    CanonicalField.from = ForeignField.from.bind(CanonicalField);
    CanonicalField.sum = ForeignField.sum.bind(CanonicalField);
    CanonicalField.fromBits = ForeignField.fromBits.bind(CanonicalField);
    CanonicalField.unsafeFrom = CanonicalForeignField.unsafeFrom.bind(CanonicalField);
    let variants = {
        unreduced: UnreducedField,
        almostReduced: AlmostField,
        canonical: CanonicalField,
    };
    UnreducedField._variants = variants;
    AlmostField._variants = variants;
    CanonicalField._variants = variants;
    return UnreducedField;
}
// the max foreign field modulus is f_max = floor(sqrt(p * 2^t)), where t = 3*limbBits = 264 and p is the native modulus
// see RFC: https://github.com/o1-labs/proof-systems/blob/1fdb1fd1d112f9d4ee095dbb31f008deeb8150b0/book/src/rfcs/foreign_field_mul.md
// since p = 2^254 + eps for both Pasta fields with eps small, a fairly tight lower bound is
// f_max >= sqrt(2^254 * 2^264) = 2^259
const foreignFieldMaxBits = (BigInt(Fp.sizeInBits - 1) + 3n * l) / 2n;
const foreignFieldMax = 1n << foreignFieldMaxBits;
function provable(Class) {
    return {
        toFields(x) {
            return x.value;
        },
        toAuxiliary() {
            return [];
        },
        sizeInFields() {
            return 3;
        },
        fromFields(fields) {
            let limbs = TupleN.fromArray(3, fields);
            return new Class(limbs);
        },
        check(x) {
            Class.check(x);
        },
        toCanonical(x) {
            if (x.type === 'FullyReduced')
                return x;
            return new Class(FF.toCanonical(x.value, x.modulus));
        },
        toValue(x) {
            return x.toBigInt();
        },
        fromValue(x) {
            return new Class(x);
        },
        // ugh
        toJSON(x) {
            return x.toBigInt().toString();
        },
        fromJSON(x) {
            // TODO be more strict about allowed values
            return new Class(x);
        },
        empty() {
            return new Class(0n);
        },
        toInput(x) {
            let l_ = Number(l);
            return {
                packed: [
                    [x.value[0], l_],
                    [x.value[1], l_],
                    [x.value[2], l_],
                ],
            };
        },
    };
}
