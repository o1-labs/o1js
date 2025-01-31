import { Bool } from './bool.js';
import { Field } from './field.js';
import { Provable } from './provable.js';
import { Struct } from './types/struct.js';
import { Unconstrained } from './types/unconstrained.js';
import { Gadgets } from './gadgets/gadgets.js';
import { assert } from './gadgets/common.js';

export { createProvableBigInt, BigIntParams, BigIntParamList, ProvableBigInt };

type BigIntParameter = {
    limb_num: number,
    limb_size: bigint,
    mask: bigint,
    MAX: bigint
}


const BigIntParams: { [key: string]: BigIntParameter } = {
    "384_12": {
        limb_num: 12,
        limb_size: 32n,
        mask: (1n << 32n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_9": {
        limb_num: 9,
        limb_size: 48n,
        mask: (1n << 48n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_6": {
        limb_num: 6,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_3": {
        limb_num: 3,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "384_2": {
        limb_num: 2,
        limb_size: 192n,
        mask: (1n << 192n) - 1n,
        MAX: (1n << 384n) - 1n,
    },
    "512_16": {
        limb_num: 16,
        limb_size: 32n,
        mask: (1n << 32n) - 1n,
        MAX: (1n << 512n) - 1n,
    },
    "512_8": {
        limb_num: 8,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 512n) - 1n,
    },
    "512_4": {
        limb_num: 4,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 512n) - 1n,
    },
    "576_9": {
        limb_num: 9,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 576n) - 1n,
    },
    "580_5": {
        limb_num: 5,
        limb_size: 116n,
        mask: (1n << 116n) - 1n,
        MAX: (1n << 580n) - 1n,
    },
    "640_5": {
        limb_num: 5,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 640n) - 1n,
    },
    "1024_16": {
        limb_num: 16,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 1024n) - 1n,
    },
    "1024_8": {
        limb_num: 8,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 1024n) - 1n,
    },
    "2048_32": {
        limb_num: 32,
        limb_size: 64n,
        mask: (1n << 64n) - 1n,
        MAX: (1n << 2048n) - 1n,
    },
    "2048_16": {
        limb_num: 16,
        limb_size: 128n,
        mask: (1n << 128n) - 1n,
        MAX: (1n << 2048n) - 1n,
    }
};

const BigIntParamList: string[] = Object.keys(BigIntParams);

function createProvableBigInt(modulus: bigint, config: BigIntParameter) {
    assert(modulus > 0n, `ProvableBigInt: modulus must be positive, got ${modulus}`);
    assert(modulus < config.MAX, `ProvableBigInt: modulus exceeds the max supported size of 2^${config.MAX}`);

    return class extends ProvableBigInt {
        modulusBigInt = modulus;
        modulusFields = Array.from({ length: config.limb_num }, () => Field.from(modulus & config.mask));
        static config = config;

        constructor(fields: Field[], value: bigint) {
            super(fields, value, config);
        }

        static zero(): ProvableBigInt {
            return ProvableBigInt.fromBigint(0n, config);
        }

        static one(): ProvableBigInt {
            return ProvableBigInt.fromBigint(1n, config);
        }

        static fromBigint(x: bigint): ProvableBigInt {
            return new this(ProvableBigInt.fromBigint(x, config).fields, x);
        }
    };
}

class ProvableBigInt {
    fields: Field[];
    value: bigint;
    modulusBigint: bigint;
    modulusFields: Field[];
    config: BigIntParameter;

    constructor(fields: Field[], value: bigint, config: BigIntParameter) {
        this.fields = fields;
        this.value = value;
        this.config = config;
    }

    /**
     * Returns a ProvableBigInt representing zero
     * @param config The configuration parameters
     * @returns A ProvableBigInt representing zero
     */
    static zero(config: BigIntParameter): ProvableBigInt {
        return ProvableBigInt.fromBigint(0n, config);
    }

    /**
     * Returns a ProvableBigInt representing one
     * @param config The configuration parameters
     * @returns A ProvableBigInt representing one
     */
    static one(config: BigIntParameter): ProvableBigInt {
        return ProvableBigInt.fromBigint(1n, config);
    }

    /**
     * Creates a ProvableBigInt from a bigint
     * @param x The bigint value
     * @param config The configuration parameters
     * @returns A ProvableBigInt representing the given bigint
     */
    static fromBigint(x: bigint, config: BigIntParameter): ProvableBigInt {
        let fields = [];
        let value = x;
        if (x < 0n) {
            throw new Error('Input must be non-negative.');
        }
        if (x > config.MAX) {
            throw new Error(`Input exceeds ${config.limb_num * Number(config.limb_size)}-bit size limit.`);
        }
        for (let i = 0; i < config.limb_num; i++) {
            fields.push(Field.from(x & config.mask)); // fields[i] = x & 2^64 - 1
            x >>= config.limb_size; // x = x >> limb_size
        }
        return new ProvableBigInt(fields, value, config);
    }

    get modulus(): ProvableBigInt {
        return new ProvableBigInt(this.modulusFields, this.modulusBigint, this.config);
    }

    toBigint(): bigint {
        let result = 0n;
        for (let i = 0; i < this.config.limb_num; i++) {
            result |=
                BigInt(this.fields[i].toString()) <<
                (this.config.limb_size * BigInt(i)); // result = result | fields[i] << 64 * i
        }
        return result;
    }

    toFields(): Field[] {
        return this.fields;
    }

    toBits(): Bool[] {
        return this.fields.flatMap(field => field.toBits());
    }

    clone(): ProvableBigInt {
        return new ProvableBigInt(this.fields, this.value, this.config);
    }

    /**
     * Adds two ProvableBigInt instances
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns The sum as a ProvableBigInt
     */
    add(a: ProvableBigInt): ProvableBigInt {

        let fields: Field[] = [];
        let carry = Field.from(0);

        for (let i = 0; i < this.config.limb_num; i++) {
            let sum = this.fields[i].add(a.fields[i]).add(carry);
            carry = sum.greaterThan(Field.from(this.config.mask)).toField();
            fields.push(sum.sub(carry.mul(Field.from(this.config.mask + 1n))));
            rangeCheck(fields[i], Number(this.config.limb_size));
        }

        let isGreaterOrEqual = new Bool(false);
        for (let i = 0; i < this.config.limb_num; i++) {
            let isGreater = fields[i].greaterThan(this.modulusFields[i]);
            let isEqual = fields[i].equals(this.fields[i]);
            isGreaterOrEqual = isGreaterOrEqual.or(isGreater).or(isEqual.and(isGreaterOrEqual));
        }

        let borrow = Field.from(0);
        for (let i = 0; i < this.config.limb_num; i++) {
            let diff = fields[i].sub(this.fields[i].mul(isGreaterOrEqual.toField())).sub(borrow);
            borrow = diff.lessThan(Field.from(0)).toField();
            fields[i] = diff.add(borrow.mul(Field.from(this.config.mask + 1n)));
        }
 
        return new ProvableBigInt(fields, BigInt((BigInt(this.value) + BigInt(a.value)) % BigInt(this.modulusBigint)), this.config);
    }

    /**
     * Subtracts one ProvableBigInt from another
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns The difference as a ProvableBigInt
     */
    sub(a: ProvableBigInt): ProvableBigInt {
        let fields = [];
        let borrow = Field.from(0);
        for (let i = 0; i < this.config.limb_num; i++) {
            let diff = this.fields[i].sub(a.fields[i]).sub(borrow);
            borrow = diff.lessThan(Field.from(this.config.mask + 1n)).not().toField();
            fields.push(diff.add(borrow.mul(Field.from(this.config.mask + 1n))));
            rangeCheck(fields[i], Number(this.config.limb_size));
        }

        return new ProvableBigInt(fields, (this.value - a.value) % this.modulusBigint, this.config);

    }

    /**
     * Multiplies two ProvableBigInt instances
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns The product as a ProvableBigInt
     */
    mul(a: ProvableBigInt): ProvableBigInt {
        let { q, r } = Provable.witness(
            Struct({ q: ProvableBigInt as any, r: ProvableBigInt as any }),
            () => {
                let xy = this.toBigint() * a.toBigint();
                let p0 = BigInt(this.modulusBigint);
                let q = xy / p0;
                let r = xy - q * p0;
                return { q: ProvableBigInt.fromBigint(q, this.config), r: ProvableBigInt.fromBigint(r, this.config) };
            }
        );

        let delta: Field[] = Array.from({ length: 2 * this.config.limb_num - 1 }, () => new Field(0));
        let [X, Y, Q, R, P] = [this.fields, a.fields, q.fields, r.fields, this.fields];

        for (let i = 0; i < this.config.limb_num; i++) {
            for (let j = 0; j < this.config.limb_num; j++) {
                delta[i + j] = delta[i + j].add(X[i].mul(Y[j]));
            }
            for (let j = 0; j < this.config.limb_num; j++) {
                delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
            }
            delta[i] = delta[i].sub(R[i]).seal();
        }

        let carry = new Field(0);

        for (let i = 0; i < 2 * this.config.limb_num - 2; i++) {
            let deltaPlusCarry = delta[i].add(carry).seal();
            carry = Provable.witness(Field, () => deltaPlusCarry.div(1n << this.config.limb_size));
            deltaPlusCarry.assertEquals(carry.mul(1n << this.config.limb_size));
        }

        delta[2 * this.config.limb_num - 2].add(carry).assertEquals(0n);

        return r;
    }

    /**
     * Computes the square root of a ProvableBigInt
     * @param a The number to find the square root of
     * @returns The square root as a ProvableBigInt
     */
    square(a: ProvableBigInt): ProvableBigInt {
        return ProvableBigInt.fromBigint(0n, this.config);
    }

    /**
     * Divides one ProvableBigInt by another and returns the quotient and remainder
     * @param a The dividend
     * @param b The divisor
     * @returns An object containing the quotient and remainder as ProvableBigInt
     */
    div(
        a: ProvableBigInt,
    ): { quotient: ProvableBigInt; remainder: ProvableBigInt } {
        let { q, r } = Provable.witness(
            Struct({ q: ProvableBigInt as any, r: ProvableBigInt as any }),
            () => {
                let r = this.toBigint() % a.toBigint();
                let q = (this.toBigint() - r) / a.toBigint();
                return { q: ProvableBigInt.fromBigint(q, this.config), r: ProvableBigInt.fromBigint(r, this.config) };
            }
        );

        q.mul(a).add(r).assertEquals(this);

        return {
            quotient: q,
            remainder: r,
        };
    }

    /**
     * Computes the modulus of a ProvableBigInt with respect to modulus as a ProvableBigInt
     * @param a The number to find the modulus of
     * @returns The modulus as a ProvableBigInt
     */
    mod(): ProvableBigInt {
        return this.div(this.modulus).remainder;
    }

    /**
     * Computes the modular inverse of a ProvableBigInt
     * @param a The number to find the inverse of
     * @returns The inverse as a ProvableBigInt
     */
    inverse(): ProvableBigInt {
        let { res } = Provable.witness(
            Struct({ res: ProvableBigInt as any }),
            () => {
                const p = this.modulus.toBigint();
                let t = 0n;
                let newT = 1n;
                let r = p;
                let newR = this.toBigint();

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

                return { res: ProvableBigInt.fromBigint(t, this.config) };
            }
        );

        res.mul(this).assertEquals(ProvableBigInt.one(this.config));

        return res;
    }

    /**
     * Computes the additive inverse of a ProvableBigInt
     * @param a The ProvableBigInt to negate
     * @returns The additive inverse as a ProvableBigInt
     * @summary x + x' = 0 mod p. For all x except 0, inverse of a is equal to (p - a) mod p. Inverse of 0 is 0 itself.
     */
    negate(): ProvableBigInt {
        // If a is zero, return zero. Otherwise, return the result of subtracting a from the modulus.
        // TODO:: this method is not correct for now
        return Provable.if(this.equals(ProvableBigInt.zero(this.config)), ProvableBigInt.zero(this.config), this.modulus.sub(this) );
    }

    /**
     * Computes the power of a ProvableBigInt raised to an exponent
     * @param a The base
     * @param exp The exponent
     * @returns The result as a ProvableBigInt
     */
    pow(exp: ProvableBigInt): ProvableBigInt {
        let { r } = Provable.witness(
            Struct({ r: ProvableBigInt as any }),
            () => {
                const modulo = this.modulus.toBigint();
                const b = this.toBigint();
                const x = exp.toBigint();
                const res = b ** x % modulo;
                return { r: ProvableBigInt.fromBigint(res, this.config) };
            });
        const exponentBits = exp.toBits();


        let result = ProvableBigInt.one(this.config);
        let base = this.clone();

        // Square-and-multiply algorithm
        for (let i = 0; i < exponentBits.length; i++) {
            // If current bit is 1, multiply result by base
            result = Provable.if(
                exponentBits[i],
                result.mul(base),
                result
            );

            // Square the base
            base = base.mul(base);

            if (i % 100 === 0) {
                if (global.gc) {
                    global.gc();
                } else {
                    console.warn('Manual garbage collection is not enabled. Run Node.js with --expose-gc to enable it.');
                }
            }
        }

        result.assertEquals(r);

        return r;
    }

    /**
     * Computes the square root of a Provable BigInt
     * @param a The number to find the square root of
     * @returns The square root as a ProvableBigInt
     */
    sqrt(): ProvableBigInt {
        let { r } = Provable.witness(
            Struct({ r: ProvableBigInt as any }),
            () => {
                const p = this.modulus.toBigint();
                // Special cases
                // Case 1: If input is 0, square root is 0
                if (this.toBigint() === 0n) return { r: ProvableBigInt.fromBigint(0n, this.config) };

                // Case 2: If p ≡ 3 (mod 4), we can use a simpler formula
                // In this case, the square root is a^((p+1)/4) mod p
                if (p % 4n === 3n) {
                    const sqrt = this.toBigint() ** ((p + 1n) / 4n) % p;
                    return { r: ProvableBigInt.fromBigint(sqrt, this.config) };
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
                while (z ** ((p - 1n) / 2n) % p !== p - 1n) {
                    z += 1n;
                }

                // Step 3: Initialize main loop variables
                let M = S;
                let c = z ** Q % p;
                let t = this.toBigint() ** Q % p;
                let R = this.toBigint() ** ((Q + 1n) / 2n) % p;

                // Main loop of Tonelli-Shanks algorithm
                while (t !== 0n && t !== 1n) {
                    // Find least value of i, 0 < i < M, such that t^(2^i) = 1
                    let t2i = t;
                    let i = 0n;
                    for (i = 1n; i < M; i++) {
                        t2i = t2i ** 2n % p;
                        if (t2i === 1n) break;
                    }

                    // If no solution found, the input has no square root
                    if (i === M && M - i - 1n < 0n) {
                        throw new Error("Tonelli-Shanks algorithm failed to find a solution. Make sure modulo is prime!");
                    }

                    // Update variables for next iteration
                    const b = c ** (2n ** (M - i - 1n)) % p;
                    M = i;
                    c = b ** 2n % p;
                    t = t * c % p;
                    R = R * b % p;
                }

                return { r: ProvableBigInt.fromBigint(R, this.config) };
            }
        );

        r.mul(r).assertEquals(this);

        return r;
    }

    /**
     * Checks if one ProvableBigInt is greater than another
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns A Bool indicating if a is greater than b
     */
    greaterThan(a: ProvableBigInt): Bool {
        return this.fields
            .map((field, i) => ({
                isGreater: field.greaterThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
            .reduce(
                (result, { isGreater, isEqual }) => isGreater.or(result.and(isEqual)),
                new Bool(false)
            );
    }


    /**
     * Checks if one ProvableBigInt is greater than or equal to another
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns A Bool indicating if a is greater than or equal to b
     */
    greaterThanOrEqual(a: ProvableBigInt): Bool {
        return this.fields
            .map((field, i) => ({
                isGreater: field.greaterThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
            .reduce(
                (result, { isGreater, isEqual }) => isGreater.or(result.and(isEqual)),
                new Bool(false)
            )
            .or(this.equals(a));
    }

    /**
     * Checks if one ProvableBigInt is less than another
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns A Bool indicating if a is less than b
     */
    lessThan(a: ProvableBigInt): Bool {
        return this.fields
            .map((field, i) => ({
                isLess: field.lessThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
            .reduce(
                (result, { isLess, isEqual }) => isLess.or(result.and(isEqual)),
                new Bool(false)
            );
    }

    /**
     * Checks if one ProvableBigInt is less than or equal to another
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns A Bool indicating if a is less than or equal to b
     */
    lessThanOrEqual(a: ProvableBigInt): Bool {
        return this.fields
            .map((field, i) => ({
                isLess: field.lessThan(a.fields[i]),
                isEqual: field.equals(a.fields[i]),
            }))
            .reduce(
                (result, { isLess, isEqual }) => isLess.or(result.and(isEqual)),
                new Bool(false)
            )
            .or(this.equals(a));
    }

    /**
     * Checks if one ProvableBigInt is equal to another
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns A Bool indicating if a is equal to b
     */
    equals(a: ProvableBigInt): Bool {
        return this.fields
            .map((field, i) => field.equals(a.fields[i]))
            .reduce((result, isEqual) => result.and(isEqual), new Bool(true));
    }

    /**
     * Checks if one ProvableBigInt is less than or equal to another
     * @param a The first ProvableBigInt
     * @param b The second ProvableBigInt
     * @returns A Bool indicating if a is less than or equal to b
     */
    assertEquals(a: ProvableBigInt) {
        this.equals(a).assertTrue("ProvableBigInts are not equal");
    }
};

function rangeCheck(x: Field, bits: number) {
    switch (bits) {
        case 32:
            Gadgets.rangeCheck32(x);
            break;
        case 48:
            rangeCheck48(x);
            break;
        case 64:
            Gadgets.rangeCheck64(x);
            break;
        case 116:
            rangeCheck116(x);
            break;
        case 128:
            rangeCheck128(x);
            break;
        case 192:
            rangeCheck192(x);
            break;
    }
}


function rangeCheck48(x: Field) {
    let [x0, x1] = Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 32n) - 1n),
        x.toBigInt() >> 32n,
    ]);

    Gadgets.rangeCheck32(x0);
    Gadgets.rangeCheck16(x1);
    x0.add(x1.mul(1n << 32n)).assertEquals(x);
}

/**
* Borrowed from rsa.ts
* Custom range check for a single limb, x in [0, 2^116)
*/
function rangeCheck116(x: Field) {
    let [x0, x1] = Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 64n) - 1n),
        x.toBigInt() >> 64n,
    ]);

    Gadgets.rangeCheck64(x0);
    let [x52] = Gadgets.rangeCheck64(x1);
    x52.assertEquals(0n); // => x1 is 52 bits
    // 64 + 52 = 116
    x0.add(x1.mul(1n << 64n)).assertEquals(x);
}

function rangeCheck128(x: Field) {
    let [x0, x1] = Provable.witnessFields(2, () => [
        x.toBigInt() & ((1n << 64n) - 1n),
        x.toBigInt() >> 64n,
    ]);

    Gadgets.rangeCheck64(x0);
    Gadgets.rangeCheck64(x1);
    x0.add(x1.mul(1n << 64n)).assertEquals(x);
}

function rangeCheck192(x: Field) {
    let [x0, x1, x2] = Provable.witnessFields(3, () => [
        x.toBigInt() & ((1n << 64n) - 1n), // first 64 bits
        (x.toBigInt() >> 64n) & ((1n << 64n) - 1n), // second 64 bits
        x.toBigInt() >> 128n, // third 64 bits
    ]);

    Gadgets.rangeCheck64(x0);
    Gadgets.rangeCheck64(x1);
    Gadgets.rangeCheck64(x2);
    x0.add(x1.mul(1n << 64n)).add(x2.mul(1n << 128n)).assertEquals(x);
}

