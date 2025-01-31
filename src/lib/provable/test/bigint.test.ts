import { Experimental } from 'o1js';

const { createProvableBigInt, ProvableBigInt } = Experimental;


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


describe('BigInt384', () => {
    const BigInt384 = createProvableBigInt(0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn, BigIntParams["384_3"]);
    describe('Creation and Conversion', () => {
        it('should correctly create a BigInt384 instance from a bigint and convert back to bigint', () => {
            const value = 1234567890123456789012345678901234567890n;
            const bigInt = BigInt384.fromBigint(value);
            expect(bigInt.toBigint()).toStrictEqual(value);
        });

        it('should fail to create a BigInt384 instance from a negative number', () => {
            const value = -1234567890123456789012345678901234567890n;
            expect(() => { BigInt384.fromBigint(value) }).toThrow('Input must be non-negative');
        });

        it('should fail to create a BigInt384 instance from a bigint larger than 384-bit', () => {
            const value = 1n << 386n;
            expect(() => { BigInt384.fromBigint(value) }).toThrow('Input exceeds 384-bit size limit.');
        });
    });

    describe('Addition', () => {
        it('should correctly add two BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
            const result = a.add(b);
            expect(result.toBigint()).toStrictEqual(
                2222222211222222221122222222112222222211n
            );
        });

        it('should correctly add two BigInt384 numbers with big modulo', () => {
            const a = BigInt384.fromBigint((2n ** 381n) - 1n);
            const b = BigInt384.fromBigint((2n ** 381n) - 1n);
            const result = a.add(b);;
            const expected = ((2n ** 381n - 1n) + (2n ** 381n - 1n)) % ((2n ** 384n) - 1n);
            expect(result.toBigint()).toStrictEqual(expected);
        });

        it('should correctly add two maximum BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(2n ** 381n - 1n);
            const b = BigInt384.fromBigint(2n ** 381n - 1n);
            const result = a.add(b);;
            expect(result.toBigint()).toStrictEqual(
                (2n ** 381n - 1n + (2n ** 381n - 1n)) % 2n ** 381n
            );
        });

        it('should satisfy commutativity of addition for BigInt384 numbers', () => {
            const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
            expect(
                a.add(b).equals(b.add(a)).toBoolean()
            ).toStrictEqual(true);
        });

        it('should satisfy addition with identity element for BigInt384 numbers', () => {
            const modulo = BigInt384.fromBigint(2n ** 384n - 1n);
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(0n);
            expect(a.add(b)).toStrictEqual(a);
        });

        it('should satisfy associativity of addition for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
            const c = BigInt384.fromBigint(111111111111111111111111111111111111111n);
            expect(
                a.add(b).add(c).equals(a.add(b.add(c))).toBoolean()
            ).toStrictEqual(true);
        });
    });

    describe('Subtraction', () => {
        it('should correctly subtract two BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(987652109876543210987654321n);
            const result = a.sub(a);
            expect(result.toBigint()).toStrictEqual(
                1234567890123456789012345678901234567890n - 987652109876543210987654321n
            );
        });

        it('should satisfy subtraction with identity element for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(0n);
            expect(a.sub(b)).toStrictEqual(a);
        });
    });

    describe('Multiplication', () => {
        it('should correctly multiply two BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789n);
            const b = BigInt384.fromBigint(9876n);
            const result = a.mul(b);;
            expect(result.toBigint()).toStrictEqual(
                BigInt(1234567890123456789n * 9876n)
            );
        });

        it('should correctly multiply two BigInt384 numbers with small values', () => {
            const a = BigInt384.fromBigint(300n);
            const b = BigInt384.fromBigint(6n);
            const result = a.mul(b);;
            expect(result.toBigint()).toStrictEqual(BigInt(300n * 6n) % 2n ** 384n);
        });

        it('should satisfy multiplication with identity element for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(1n);
            expect(a.mul(b)).toStrictEqual(a);
        });

        it('should satisfy multiplication with zero for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(0n);
            expect(a.mul(b)).toStrictEqual(b);
        });

        it('should satisfy multiplication with zero commuted for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(0n);
            expect(a.mul(b)).toStrictEqual(b);
        });

        it('should satisfy commutativity of multiplication for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789n);
            const b = BigInt384.fromBigint(9876n);
            expect(
                a.mul(b).equals(b.mul(a)).toBoolean()
            ).toStrictEqual(true);
        });

        it('should satisfy associativity of multiplication for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(123n);
            const b = BigInt384.fromBigint(21346n);
            const c = BigInt384.fromBigint(987n);
            expect(
                a.mul(b.mul(c)).equals(
                    a.mul(b).mul(c)
                ).toBoolean()
            ).toStrictEqual(true);
        });

        it('should satisfy distributivity of multiplication over addition for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(123n);
            const b = BigInt384.fromBigint(21346n);
            const c = BigInt384.fromBigint(987n);
            expect(
                a.mul(b.add(c)).equals(
                    a.mul(b).add(a.mul(c))
                ).toBoolean()
            ).toStrictEqual(true);
        });
    });

    describe('Division and Modulus', () => {
        it('should correctly divide two BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(10n);
            const b = BigInt384.fromBigint(3n);
            const result = a.div(b);
            expect(result.quotient.toBigint()).toStrictEqual(3n);
            expect(result.remainder.toBigint()).toStrictEqual(1n);
        });

        it('should satisfy division with identity element for BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(9876543210987654321n);
            const b = BigInt384.fromBigint(1n);
            const result = a.div(b);
            expect(result.quotient).toStrictEqual(a);
            expect(result.remainder.toBigint()).toStrictEqual(0n);
        });

        it('should correctly compute the modulus of a BigInt384 number with respect to another BigInt384 number', () => {
            const result = BigInt384.fromBigint(17n).mod();
            //expect(result.toBigint()).toStrictEqual(7n);
        });
    });

    describe('Square root', () => {
        it('should correctly take square root of a ProvableBigInt', () => {
            const a = BigInt384.fromBigint(9n);
            const result = a.sqrt();
            expect(result.toBigint()).toStrictEqual(3n);
        });

        it('should correctly take square root of 0', () => {
            const a = BigInt384.fromBigint(0n);
            const result = a.sqrt();
            expect(result.toBigint()).toStrictEqual(0n);
        });

        it('should correctly take square root of a non-residue', () => {
            const a = BigInt384.fromBigint(2n);
            expect(() => a.sqrt()).toThrow();
        });
    });

    describe('Negate', () => {
        it('should correctly compute the additive inverse of a ProvableBigInt', () => {
            const a = BigInt384.fromBigint(9n);
            const result = a.negate();
            expect(result.toBigint()).toStrictEqual(4n); // 13 - 9 = 4
        });

        it('should correctly compute the additive inverse of 0', () => {
            const a = BigInt384.fromBigint(0n);
            const result = a.negate();
            expect(result.toBigint()).toStrictEqual(0n); // 13 - 0 = 0
        });

        it('should correctly compute the additive inverse of a large number', () => {
            const a = BigInt384.fromBigint(104728n);
            const result = a.negate();
            expect(result.toBigint()).toStrictEqual(1n); // 104729 - 104728 = 1
        });
    });

    describe('Inverse', () => {
        it('should correctly compute the modular inverse of a ProvableBigInt', () => {
            const a = BigInt384.fromBigint(2n);
            const result = a.inverse();
            expect(result.toBigint()).toStrictEqual(7n); // 2 * 7 ≡ 1 (mod 13)
        });

        it('should correctly compute the modular inverse of 1', () => {
            const a = BigInt384.fromBigint(1n);
            const result = a.inverse();
            expect(result.toBigint()).toStrictEqual(1n); // 1 * 1 ≡ 1 (mod 13)
        });

        it('should correctly compute the modular inverse of a large number', () => {
            const a = BigInt384.fromBigint(104728n);
            const result = a.inverse();
            expect(result.toBigint()).toStrictEqual(104728n); // 104728 * 104728 ≡ 1 (mod 104729)
        });
    });

    describe('Power', () => {
        it('should correctly compute the power of a ProvableBigInt with exponent 0', () => {
            const base = BigInt384.fromBigint(5n);
            const exponent = BigInt384.fromBigint(0n);
            const result = base.pow(exponent);
            expect(result.toBigint()).toStrictEqual(1n); // 5^0 ≡ 1 (mod 13)
        });

        it('should correctly compute the power of a ProvableBigInt with exponent 1', () => {
            const base = BigInt384.fromBigint(5n);
            const exponent = BigInt384.fromBigint(1n);
            const result = base.pow(exponent);
            expect(result.toBigint()).toStrictEqual(5n); // 5^1 ≡ 5 (mod 13)
        });

        it('should correctly compute the power of a ProvableBigInt with a small exponent', () => {
            const base = BigInt384.fromBigint(5n);
            const exponent = BigInt384.fromBigint(3n);
            const result = base.pow(exponent);
            expect(result.toBigint()).toStrictEqual(8n); // 5^3 ≡ 125 ≡ 8 (mod 13)
        });

        it('should correctly compute the power of a ProvableBigInt with a large exponent', () => {
            const base = BigInt384.fromBigint(2n);
            const exponent = BigInt384.fromBigint(1000n);
            const result = base.pow(exponent);
            expect(result.toBigint()).toStrictEqual(4096n); // 2^1000 % 104729
        });

        it('should correctly compute the power of a ProvableBigInt with a large base and exponent', () => {
            const base = BigInt384.fromBigint(104728n);
            const exponent = BigInt384.fromBigint(104728n);
            const result = base.pow(exponent);
            expect(result.toBigint()).toStrictEqual(1n); // 104728^104728 % 104729
        });
    });

    describe('Comparison', () => {
        it('should correctly compare two BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(987654321098765432109876543210987654321n);
            expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
            expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(
                true
            );
            expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
            expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
            expect(a.equals(b).toBoolean()).toStrictEqual(false);
        });

        it('should correctly check equality of two BigInt384 numbers', () => {
            const a = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            const b = BigInt384.fromBigint(1234567890123456789012345678901234567890n);
            expect(a.equals(b).toBoolean()).toStrictEqual(true);
        });
    });
});

