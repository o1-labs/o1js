"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvableBigInt = exports.createProvableBigInt = void 0;
const bool_js_1 = require("./bool.js");
const field_js_1 = require("./field.js");
const provable_js_1 = require("./provable.js");
const gadgets_js_1 = require("./gadgets/gadgets.js");
const common_js_1 = require("./gadgets/common.js");
const provable_derivers_js_1 = require("./types/provable-derivers.js");
const unconstrained_js_1 = require("./types/unconstrained.js");
/**
 * Creates a class representing a ProvableBigInt with modular arithmetic capabilities.
 * This is particularly useful for implementing prime fields that don't fit into the native field.
 *
 * ```ts
 * const BigInt521 = createProvableBigInt(2n ** 521n - 1n); // creates a class for 521-bit integers
 * ```
 *
 * `createProvableBigInt(modulus, config?)` takes two parameters:
 * - `modulus`: The modulus of the field (must be a prime)
 * - `config`: Optional configuration for custom limb size and numbers
 *
 * The returned class supports comprehensive arithmetic operations including:
 * - Basic operations: addition, double, subtraction, multiplication, square, division
 * - Advanced operations: inverse, negate, sqrt, power
 * - Comparison operations: equals, assertEquals, greaterThan, lessthan, greaterThanOrEqual, lessThanOrEqual
 * - Conversion methods: fromBigInt, toBigInt, fromFields, toFields, fromBits, toBits
 *
 * Implementation details:
 *
 * Internally, a ProvableBigInt is represented as an array of Field elements (limbs),
 * where each limb holds 116 bits as default. The total size is determined by the configuration,
 * with preset options supporting different bit lengths:
 * - 348 bits (3 limbs)
 * - 464 bits (4 limbs)
 * - 580 bits (5 limbs)
 * - 1044 bits (9 limbs)
 * - 2088 bits (18 limbs)
 * - 4176 bits (36 limbs)
 *
 * Each arithmetic operation ensures the result is a valid element of the prime field.
 *
 * @example
 * ```ts
 * // Create a Provable BigInt class with modulus 2^521 - 1
 * const BigInt521 = createProvableBigInt(2n ** 521n - 1n);
 *
 * // Create instances
 * const a = BigInt521.fromBigInt(123n);
 * const b = BigInt521.fromBigInt(456n);
 * const c = BigInt521.fromBigInt(1024n);
 *
 * // Perform operations
 * const sum = a.add(b);
 * const double = a.double();
 * const diff = a.sub(b);
 * const product = a.mul(b);
 * const square = a.square();
 * const quotient = a.div(b);
 * const inverse = a.inverse();
 * const negation = a.negate();
 * const power = a.pow(b);
 * const sqrt = c.sqrt();
 * ```
 *
 * The class automatically handles modular reduction after
 * arithmetic operations to maintain valid representations. All operations are
 * designed to be provable and optimised for less constraints.
 *
 * @param modulus The modulus for the big integer arithmetic (must be prime)
 * @param config Optional configuration specifying a custom limb size and number
 * @returns A class representing ProvableBigInts with the specified modulus
 * @throws If the modulus is zero, negative, or exceeds the maximum supported size
 */
function createProvableBigInt(modulus, config) {
    const config_ = config ?? findConfig(modulus);
    (0, common_js_1.assert)(modulus !== 0n, `ProvableBigInt: modulus must be non-zero, got ${modulus}`);
    (0, common_js_1.assert)(modulus > 0n, `ProvableBigInt: modulus must be positive, got ${modulus}`);
    (0, common_js_1.assert)(modulus < config_.max, `ProvableBigInt: modulus exceeds the max supported size of 2^${config_.max}`);
    (0, common_js_1.assert)(isPrime(modulus), 'ProvableBigInt: modulus must be prime');
    let fields = bigintToLimbs(modulus, config_);
    class ProvableBigInt_ extends ProvableBigInt {
        constructor(fields, value) {
            super(fields, unconstrained_js_1.Unconstrained.from(value));
        }
        get Constructor() {
            return this.constructor;
        }
        static {
            this._modulus = new ProvableBigInt_(fields, unconstrained_js_1.Unconstrained.from(modulus));
            this._config = config_;
            this._provable = (0, provable_derivers_js_1.provableFromClass)(ProvableBigInt_, {
                fields: provable_js_1.Provable.Array(field_js_1.Field, config_.limbNum),
            });
        }
        /**
         * Returns a ProvableBigInt representing zero
         * @returns A ProvableBigInt representing zero
         */
        static zero() {
            return ProvableBigInt_.fromBigInt(0n);
        }
        /**
         * Returns a ProvableBigInt representing one
         * @returns A ProvableBigInt representing one
         */
        static one() {
            return ProvableBigInt_.fromBigInt(1n);
        }
        /**
         * Returns a ProvableBigInt representing one
         * @returns A ProvableBigInt representing one
         */
        static max() {
            return ProvableBigInt_.fromBigInt(modulus - 1n);
        }
        /**
         * Creates a ProvableBigInt instance from a JS bigint, string, number, or boolean
         * @param x
         * @returns ProvableBigInt instance from the input
         */
        static from(x) {
            return ProvableBigInt_.fromBigInt(BigInt(x));
        }
        /**
         * Creates a ProvableBigInt instance from a JS bigint
         * @param x
         * @returns ProvableBigInt instance from the input
         */
        static fromBigInt(x) {
            let value = x;
            if (value < 0n) {
                value = ((x % modulus) + modulus) % modulus;
            }
            if (value >= ProvableBigInt_.modulus.toBigInt()) {
                value = value % modulus;
            }
            let fields = bigintToLimbs(value, ProvableBigInt_.config);
            return new ProvableBigInt_(fields, unconstrained_js_1.Unconstrained.from(value));
        }
        /**
         * Converts a ProvableBigInt instance to a JS bigint
         * @returns JS bigint representation of the ProvableBigInt
         */
        toBigInt() {
            let result = 0n;
            for (let i = 0; i < this.Constructor.config.limbNum; i++) {
                result |= this.fields[i].toBigInt() << BigInt(this.Constructor.config.limbSize * i);
            }
            return result;
        }
        /**
         * Converts a ProvableBigInt instance to field array representation of the limbs
         * @returns Limbs of the ProvableBigInt
         */
        toFields() {
            return this.fields.slice(0, this.Constructor.config.limbNum);
        }
        static Unsafe = {
            /**
             * Creates a ProvableBigInt instance from an limbs as an array of fields
             * **WARNING**: This method is UNSAFE and lacks checks on the fields. Use with caution as it can lead to incorrect results or security vulnerabilities.
             * @param fields The limbs of the ProvableBigInt. Must be of the correct length.
             * @returns A ProvableBigInt instance from the fields
             */
            fromFields(fields) {
                let value = 0n;
                for (let i = 0; i < ProvableBigInt_.config.limbNum; i++) {
                    value |= BigInt(fields[i].toBigInt()) << BigInt(ProvableBigInt_.config.limbSize * i);
                }
                return new ProvableBigInt_(fields, unconstrained_js_1.Unconstrained.from(value));
            },
            /**
             * Creates a ProvableBigInt instance from an array of bits
             * **WARNING**: This method is UNSAFE and lacks checks on the bits. Use with caution as it can lead to incorrect results or security vulnerabilities.
             * @param bits
             * @returns A ProvableBigInt instance from the bits
             */
            fromBits(bits) {
                let value = 0n;
                let bigint = provable_js_1.Provable.witness(ProvableBigInt_, () => {
                    for (let i = 0; i < bits.length; i++) {
                        if (bits[i].toBoolean()) {
                            value |= 1n << BigInt(i);
                        }
                    }
                    return ProvableBigInt_.fromBigInt(value);
                });
                return bigint;
            },
        };
        /**
         * Converts a ProvableBigInt instance to an array of bits
         * @returns An array of bits representing the ProvableBigInt
         */
        toBits() {
            return this.fields.flatMap((field) => {
                return field.toBits(this.Constructor.config.limbSize);
            });
        }
        /**
         * Clones a ProvableBigInt instance
         * @returns A new ProvableBigInt instance with the same value
         */
        clone() {
            return new ProvableBigInt_(this.fields, this.value);
        }
        /**
         * Adds two ProvableBigInt instances
         * Cost: Cheap
         * @param a The ProvableBigInt to add
         * @returns The sum as a ProvableBigInt
         */
        add(a, isDouble = false) {
            if (isDouble)
                a = this;
            // witness q, r so that x+y = q*p + r
            let { q, r } = provable_js_1.Provable.witness((0, provable_derivers_js_1.provable)({ q: ProvableBigInt_, r: ProvableBigInt_ }), () => {
                let xPlusY = this.toBigInt() + a.toBigInt();
                let p0 = this.Constructor.modulus.toBigInt();
                let q = xPlusY / p0;
                let r = xPlusY - q * p0;
                return {
                    q: ProvableBigInt_.fromBigInt(q),
                    r: ProvableBigInt_.fromBigInt(r),
                };
            });
            let delta = Array.from({ length: this.Constructor.config.limbNum }, () => field_js_1.Field.from(0));
            let [X, Y, Q, R, P] = [
                this.fields,
                a.fields,
                q.fields,
                r.fields,
                this.Constructor.modulus.fields,
            ];
            // compute X + Y limb-by-limb
            for (let i = 0; i < this.Constructor.config.limbNum; i++) {
                if (isDouble)
                    delta[i] = X[i].mul(2);
                else
                    delta[i] = X[i].add(Y[i]);
            }
            // subtract q*p limb-by-limb
            for (let i = 0; i < this.Constructor.config.limbNum; i++) {
                for (let j = 0; j < this.Constructor.config.limbNum; j++) {
                    if (i + j < this.Constructor.config.limbNum) {
                        delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
                    }
                }
            }
            // subtract r limb-by-limb
            for (let i = 0; i < this.Constructor.config.limbNum; i++) {
                delta[i] = delta[i].sub(R[i]).seal();
            }
            let carry = field_js_1.Field.from(0);
            for (let i = 0; i < this.Constructor.config.limbNum - 1; i++) {
                let deltaPlusCarry = delta[i].add(carry).seal();
                carry = provable_js_1.Provable.witness(field_js_1.Field, () => deltaPlusCarry.div(1n << BigInt(this.Constructor.config.limbSize)));
                rangeCheck(carry, 128, true);
                // ensure that after adding the carry, the limb is a multiple of 2^limbSize
                deltaPlusCarry.assertEquals(carry.mul(1n << BigInt(this.Constructor.config.limbSize)));
            }
            // the final limb plus carry should be zero to assert correctness
            delta[this.Constructor.config.limbNum - 1].add(carry).assertEquals(0n);
            return r;
        }
        /**
         * Doubles a ProvableBigInt
         * Cost: Cheap
         * @returns The double of a ProvableBigInt
         */
        double() {
            return this.add(this, true);
        }
        /**
         * Subtracts one ProvableBigInt from another
         * Cost: Cheap
         * @param a The ProvableBigInt to subtract
         * @returns The difference as a ProvableBigInt
         */
        sub(a) {
            return this.add(a.negate());
        }
        /**
         * Multiplies two ProvableBigInt instances
         * Cost: Cheap
         * @param a The ProvableBigInt to multiply
         * @returns The product as a ProvableBigInt
         */
        mul(a, isSquare = false) {
            if (isSquare)
                a = this;
            let { q, r } = provable_js_1.Provable.witness((0, provable_derivers_js_1.provable)({ q: ProvableBigInt_, r: ProvableBigInt_ }), () => {
                let xy = this.toBigInt() * a.toBigInt();
                let p0 = this.Constructor.modulus.toBigInt();
                let q = xy / p0;
                let r = xy - q * p0;
                return {
                    q: ProvableBigInt_.fromBigInt(q),
                    r: ProvableBigInt_.fromBigInt(r),
                };
            });
            let delta = Array.from({ length: 2 * this.Constructor.config.limbNum - 1 }, () => new field_js_1.Field(0));
            let [X, Y, Q, R, P] = [
                this.fields,
                a.fields,
                q.fields,
                r.fields,
                this.Constructor.modulus.fields,
            ];
            for (let i = 0; i < this.Constructor.config.limbNum; i++) {
                if (isSquare) {
                    for (let j = 0; j < i; j++) {
                        delta[i + j] = delta[i + j].add(X[i].mul(X[j]).mul(2n));
                    }
                    delta[2 * i] = delta[2 * i].add(X[i].mul(X[i]));
                }
                else {
                    for (let j = 0; j < this.Constructor.config.limbNum; j++) {
                        delta[i + j] = delta[i + j].add(X[i].mul(Y[j]));
                    }
                }
                for (let j = 0; j < this.Constructor.config.limbNum; j++) {
                    delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
                }
                delta[i] = delta[i].sub(R[i]).seal();
            }
            let carry = new field_js_1.Field(0);
            for (let i = 0; i < 2 * this.Constructor.config.limbNum - 2; i++) {
                let deltaPlusCarry = delta[i].add(carry).seal();
                carry = provable_js_1.Provable.witness(field_js_1.Field, () => deltaPlusCarry.div(1n << BigInt(this.Constructor.config.limbSize)));
                rangeCheck(carry, 128, true);
                deltaPlusCarry.assertEquals(carry.mul(1n << BigInt(this.Constructor.config.limbSize)));
            }
            delta[2 * this.Constructor.config.limbNum - 2].add(carry).assertEquals(0n);
            return r;
        }
        /**
         * Computes the square root of a ProvableBigInt
         * Cost: Cheap
         * @returns The square root as a ProvableBigInt
         */
        square() {
            return this.mul(this, true);
        }
        /**
         * Divides one ProvableBigInt by another.
         * Cost: Cheap-Moderate
         * @param a The divisor as a ProvableBigInt
         * @returns The quotient as ProvableBigInt
         */
        div(a) {
            const inv_a = a.inverse();
            let res = this.mul(inv_a);
            return res;
        }
        /**
         * Computes the modular inverse of a ProvableBigInt
         * Cost: Cheap
         * @returns The inverse as a ProvableBigInt
         */
        inverse() {
            let { res } = provable_js_1.Provable.witness((0, provable_derivers_js_1.provable)({ res: ProvableBigInt_ }), () => {
                const p = this.Constructor.modulus.toBigInt();
                let t = 0n;
                let newT = 1n;
                let r = p;
                let newR = this.toBigInt();
                // Loop until newR is equal to zero
                while (newR !== 0n) {
                    const quotient = r / newR;
                    [t, newT] = [newT, t - quotient * newT];
                    [r, newR] = [newR, r - quotient * newR];
                }
                // If r is bigger than 1, a is not invertible
                if (r > 1n) {
                    throw new Error('a is not invertible');
                }
                // If t is smaller than zero, add modulus
                if (t < 0n) {
                    t = t + p;
                }
                return { res: ProvableBigInt_.fromBigInt(t) };
            });
            res.mul(this).assertEquals(ProvableBigInt_.one());
            return res;
        }
        /**
         * Computes the additive inverse of a ProvableBigInt
         * Cost: Cheap
         * @returns The additive inverse as a ProvableBigInt
         */
        negate() {
            let { negation } = provable_js_1.Provable.witness((0, provable_derivers_js_1.provable)({ negation: ProvableBigInt_ }), () => {
                let thisVal = this.toBigInt();
                let p = this.Constructor.modulus.toBigInt();
                let negVal = 0n;
                if (thisVal !== 0n) {
                    negVal = p - thisVal;
                }
                return {
                    negation: ProvableBigInt_.fromBigInt(negVal),
                };
            });
            this.add(negation).assertEquals(ProvableBigInt_.zero());
            return negation;
        }
        /**
         * Computes the power of a ProvableBigInt raised to an exponent
         * Cost: Expensive
         * @param exp The exponent
         * @returns The result as a ProvableBigInt
         */
        pow(exp) {
            const exponentBits = exp.toBits();
            const processChunk = function* (bits, chunkSize) {
                for (let i = 0; i < bits.length; i += chunkSize) {
                    yield bits.slice(i, i + chunkSize);
                }
            };
            let result = ProvableBigInt_.one();
            let base = this.clone();
            for (const chunk of processChunk(exponentBits, 100)) {
                for (const bit of chunk) {
                    result = provable_js_1.Provable.if(bit, ProvableBigInt_, result.mul(base), result);
                    base = base.mul(base);
                }
            }
            return result;
        }
        /**
         * Computes the square root of a Provable BigInt
         * Cost: Cheap
         * @returns The square root as a ProvableBigInt
         */
        sqrt() {
            let r = provable_js_1.Provable.witness(ProvableBigInt_, () => {
                const p = this.Constructor.modulus.toBigInt();
                // Special cases
                // Case 1: If input is 0, square root is 0
                if (this.toBigInt() === 0n)
                    return ProvableBigInt_.fromBigInt(0n);
                // Case 2: If p ≡ 3 (mod 4), we can use a simpler formula
                // In this case, the square root is a^((p+1)/4) mod p
                if (p % 4n === 3n) {
                    const pplusonedivfour = (p + 1n) / 4n;
                    const pplusonedivfour_reduced = pplusonedivfour % p;
                    const sqrt = modularExponentiation(this.toBigInt(), pplusonedivfour_reduced, p);
                    return ProvableBigInt_.fromBigInt(sqrt);
                }
                // Tonelli-Shanks Algorithm
                // Step 1: Factor out powers of 2 from p-1
                // Write p-1 = Q * 2^S where Q is odd
                let Q = p - 1n;
                let S = 0n;
                while (Q % 2n === 0n) {
                    Q /= 2n;
                    S += 1n;
                }
                // Step 2: Find a quadratic non-residue z
                // This is any number z where z^((p-1)/2) ≡ -1 (mod p)
                let z = 2n;
                while (modularExponentiation(z, (p - 1n) / 2n, p) !== p - 1n) {
                    z += 1n;
                }
                // Step 3: Initialize main loop variables
                let M = S;
                let c = modularExponentiation(z, Q, p);
                let t = modularExponentiation(this.toBigInt(), Q, p);
                let R = modularExponentiation(this.toBigInt(), (Q + 1n) / 2n, p);
                // Main loop of Tonelli-Shanks algorithm
                while (t !== 0n && t !== 1n) {
                    // Find least value of i, 0 < i < M, such that t^(2^i) = 1
                    let t2i = t;
                    let i = 0n;
                    for (i = 1n; i < M; i++) {
                        t2i = t2i ** 2n;
                        t2i %= p;
                        if (t2i === 1n)
                            break;
                    }
                    // If no solution found, the input has no square root
                    if (i === M && M - i - 1n < 0n) {
                        throw new Error('Tonelli-Shanks algorithm failed to find a solution. Make sure modulo is prime!');
                    }
                    // Update variables for next iteration
                    const b = modularExponentiation(c, 2n ** (M - i - 1n), p);
                    M = i;
                    c = b ** 2n % p;
                    t = (t * c) % p;
                    R = (R * b) % p;
                }
                return ProvableBigInt_.fromBigInt(R);
            });
            r.square().assertEquals(this);
            return r;
        }
        /**
         * Checks if one ProvableBigInt is greater than another
         * Cost: Moderate
         * @param a The ProvableBigInt to compare
         * @returns A Bool indicating if a is greater than b
         *
         * TODO: Comparators should ensure than inputs are canonical fields (value < p).
         *       e.g.
         *       ```ts
         *       let delta = x.sub(x); // not guaranteed to be < p, could be = p
         *       delta.greaterThan(ProvableBigInt.zero()).assertTrue(); // (p > 0) = true, (0 > 0) = false
         *       ```
         *
         */
        greaterThan(a) {
            return this.fields
                .map((field, i) => ({
                isGreater: field.greaterThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
                .reduce((result, { isGreater, isEqual }) => isGreater.or(result.and(isEqual)), new bool_js_1.Bool(false));
        }
        /**
         * Checks if one ProvableBigInt is greater than or equal to another
         * Cost: Moderate
         * @param a The ProvableBigInt to compare
         * @returns A Bool indicating if a is greater than or equal to b
         *
         * TODO: @see {@link greaterThan}
         *
         */
        greaterThanOrEqual(a) {
            return this.fields
                .map((field, i) => ({
                isGreater: field.greaterThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
                .reduce((result, { isGreater, isEqual }) => isGreater.or(result.and(isEqual)), new bool_js_1.Bool(false))
                .or(this.equals(a));
        }
        /**
         * Checks if one ProvableBigInt is less than another
         * Cost: Moderate
         * @param a The ProvableBigInt to compare
         * @returns A Bool indicating if a is less than b
         *
         * TODO: @see {@link greaterThan}
         *
         */
        lessThan(a) {
            return this.fields
                .map((field, i) => ({
                isLess: field.lessThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
                .reduce((result, { isLess, isEqual }) => isLess.or(result.and(isEqual)), new bool_js_1.Bool(false));
        }
        /**
         * Checks if one ProvableBigInt is less than or equal to another
         * Cost: Moderate
         * @param a The ProvableBigInt to compare
         * @returns A Bool indicating if a is less than or equal to b
         *
         * TODO: @see {@link greaterThan}
         */
        lessThanOrEqual(a) {
            return this.fields
                .map((field, i) => ({
                isLess: field.lessThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
                .reduce((result, { isLess, isEqual }) => isLess.or(result.and(isEqual)), new bool_js_1.Bool(false))
                .or(this.equals(a));
        }
        /**
         * Checks if one ProvableBigInt is equal to another
         * Cost: Cheap
         * @param a The ProvableBigInt to compare
         * @returns A Bool indicating if a is equal to b
         *
         * TODO: @see {@link greaterThan}
         */
        equals(a) {
            return this.fields
                .map((field, i) => field.equals(a.fields[i]))
                .reduce((result, isEqual) => result.and(isEqual), new bool_js_1.Bool(true));
        }
        /**
         * Checks if one ProvableBigInt is less than or equal to another
         * Cost: Cheap
         * @param a The ProvableBigInt to compare
         * @returns A Bool indicating if a is less than or equal to b
         *
         * TODO: @see {@link greaterThan}
         */
        assertEquals(a) {
            this.equals(a).assertTrue('ProvableBigInts are not equal');
        }
    }
    return ProvableBigInt_;
}
exports.createProvableBigInt = createProvableBigInt;
class ProvableBigInt {
    fields;
    value;
    static _provable;
    static get provable() {
        (0, common_js_1.assert)(this._provable !== undefined, 'ProvableBigInt not initialized');
        return this._provable;
    }
    static _modulus;
    static _config;
    static get modulus() {
        (0, common_js_1.assert)(this._modulus !== undefined, 'Modulus not initialized');
        return this._modulus;
    }
    static get config() {
        (0, common_js_1.assert)(this._config !== undefined, 'Config not initialized');
        return this._config;
    }
    constructor(fields, value) {
        this.fields = fields;
        this.value = unconstrained_js_1.Unconstrained.from(value);
    }
}
exports.ProvableBigInt = ProvableBigInt;
function rangeCheck(x, bits, signed) {
    const supportedBits = new Set([32, 48, 64, 116, 128]);
    if (!supportedBits.has(bits)) {
        throw new Error(`Unsupported bit size: ${bits}`);
    }
    switch (bits) {
        case 32:
            gadgets_js_1.Gadgets.rangeCheck32(x);
            break;
        case 48:
            rangeCheck48(x);
            break;
        case 64:
            gadgets_js_1.Gadgets.rangeCheck64(x);
            break;
        case 116:
            rangeCheck116(x);
            break;
        case 128:
            if (signed) {
                rangeCheck128Signed(x);
            }
            else {
                throw new Error('128-bit unsigned range check not implemented');
            }
            break;
    }
}
function rangeCheck48(x) {
    let [x0, x1] = provable_js_1.Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 32n) - 1n),
        x.toBigInt() >> 32n,
    ]);
    gadgets_js_1.Gadgets.rangeCheck32(x0); // 32 bits
    gadgets_js_1.Gadgets.rangeCheck16(x1); // 16 bits
    x0.add(x1.mul(1n << 32n)).assertEquals(x); // 48 bits
}
function rangeCheck116(x) {
    let [x0, x1] = provable_js_1.Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 64n) - 1n),
        x.toBigInt() >> 64n,
    ]);
    gadgets_js_1.Gadgets.rangeCheck64(x0); // 64 bits
    let [x52] = gadgets_js_1.Gadgets.rangeCheck64(x1);
    x52.assertEquals(0n); // 52 bits
    x0.add(x1.mul(1n << 64n)).assertEquals(x);
}
function rangeCheck128Signed(xSigned) {
    let x = xSigned.add(1n << 127n);
    let [x0, x1] = provable_js_1.Provable.witnessFields(2, () => {
        const x0 = x.toBigInt() & ((1n << 64n) - 1n);
        const x1 = x.toBigInt() >> 64n;
        return [x0, x1];
    });
    gadgets_js_1.Gadgets.rangeCheck64(x0);
    gadgets_js_1.Gadgets.rangeCheck64(x1);
    x0.add(x1.mul(1n << 64n)).assertEquals(x);
}
function findConfig(modulus) {
    const bitLength = modulus.toString(2).length;
    const defaultLimbSize = 116;
    const limbCount = Math.ceil(bitLength / defaultLimbSize);
    const maxBitLength = limbCount * defaultLimbSize;
    return {
        limbNum: limbCount,
        limbSize: defaultLimbSize,
        mask: (1n << BigInt(defaultLimbSize)) - 1n,
        max: (1n << BigInt(maxBitLength)) - 1n,
    };
}
function modularExponentiation(base, exponent, modulus) {
    let result = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (exponent % 2n === 1n) {
            result = (result * base) % modulus;
        }
        exponent = exponent >> 1n;
        base = (base * base) % modulus;
    }
    return result;
}
/**
 * Miller-Rabin primality test
 * @param n The number to test for primality
 * @param k Number of iterations (higher = more accurate)
 * @returns true if n is probably prime, false if n is definitely composite
 */
function isPrime(n, k = 10) {
    if (n === 2n || n === 3n)
        return true;
    if (n < 2n)
        return false;
    if (n % 2n === 0n)
        return false;
    // write n - 1 = 2^r * d, d is odd
    let d = n - 1n;
    let r = 0n;
    for (; d % 2n === 0n; d /= 2n, r++)
        ;
    WitnessLoop: for (let i = 0; i < k; i++) {
        let a = randomBigintInRange(2n, n - 2n);
        let x = modularExponentiation(a, d, n);
        if (x === 1n || x === n - 1n)
            continue;
        for (let j = 0; j + 1 < r; j++) {
            x = (x * x) % n;
            if (x === 1n)
                return false;
            if (x === n - 1n)
                continue WitnessLoop;
        }
        return false;
    }
    return true;
}
/**
 * Generates a random bigint in the range [min, max)
 * @param min The minimum value (inclusive)
 * @param max The maximum value (exclusive)
 * @returns A random bigint in the range [min, max)
 */
function randomBigintInRange(min, max) {
    const range = max - min;
    const length = Math.ceil(range.toString(2).length / 8);
    while (true) {
        // Generate random bytes
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        // Convert bytes to bigint
        let x = BigInt(0);
        for (const byte of bytes) {
            x = (x << 8n) + BigInt(byte);
        }
        // Check if x is within the range
        if (x < range) {
            return min + x;
        }
    }
}
function bigintToLimbs(x, config) {
    let fields = [];
    for (let i = 0; i < config.limbNum; i++) {
        fields.push(field_js_1.Field.from(x & config.mask)); // fields[i] = x & mask
        x >>= BigInt(config.limbSize); // x = x >> limbSize
    }
    return fields;
}
