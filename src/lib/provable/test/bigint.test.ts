import { Experimental } from 'o1js';

const { createProvableBigInt } = Experimental;

// test type 1 : small numbers - result doesn't need to be reduced
// test type 2 : big numbers - result needs to be reduced
// test type 3 : max numbers
// test type 4 : result should never be unreduced

describe('BigInt17', () => {
  const modulus = 17n;
  const BigInt17 = createProvableBigInt(modulus);
  describe('Creation and Conversion', () => {
    it('should correctly create a BigInt17 instance from a bigint and convert back to bigint', () => {
      const value = 12n;
      const bigInt = BigInt17.fromBigint(value);
      expect(bigInt.toBigint()).toStrictEqual(value);
    });

    it('should correctly create a BigInt17 instance from a negative bigint', () => {
      const value = -12n;
      const bigInt = BigInt17.fromBigint(value);
      expect(bigInt.toBigint()).toStrictEqual(5n);
    });
  });

  describe('Addition', () => {
    it('should correctly add two BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(9n);
      const b = BigInt17.fromBigint(13n);
      const result = a.add(b).remainder;
      expect(result.toBigint()).toStrictEqual(
        (a.toBigint() + b.toBigint()) % modulus
      );
    });

    it('should correctly add two maximum BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(modulus - 1n);
      const b = BigInt17.fromBigint(modulus - 1n);
      const result = a.add(b).remainder;
      expect(result.toBigint()).toStrictEqual(
        (modulus - 1n + (modulus - 1n)) % modulus
      );
    });

    it('should satisfy commutativity of addition for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(13n);
      const b = BigInt17.fromBigint(9n);
      expect(
        a.add(b).remainder.equals(b.add(a).remainder).toBoolean()
      ).toStrictEqual(true);
    });

    it('should satisfy addition with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(7n);
      const b = BigInt17.fromBigint(0n);
      expect(a.add(b).remainder.toBigint()).toStrictEqual(a.toBigint());
    });

    it('should satisfy associativity of addition for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(3n);
      const b = BigInt17.fromBigint(15n);
      const c = BigInt17.fromBigint(9n);
      expect(
        a
          .add(b)
          .remainder.add(c)
          .remainder.equals(a.add(b.add(c).remainder).remainder)
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Subtraction', () => {
    it('should correctly subtract two BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(13n);
      const b = BigInt17.fromBigint(9n);
      const result = a.sub(b);
      expect(result.toBigint()).toStrictEqual(
        a.toBigint() - (b.toBigint() % modulus)
      );
    });

    it('should satisfy subtraction with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(9n);
      const b = BigInt17.fromBigint(0n);
      expect(a.sub(b)).toStrictEqual(a);
    });

    it('should correctly subtract two BigInt17 numbers resulting in zero', () => {
      const a = BigInt17.fromBigint(9n);
      const b = BigInt17.fromBigint(9n);
      const result = a.sub(b);
      expect(result.toBigint()).toStrictEqual(0n);
    });

    // add more tests here
  });

  describe('Multiplication', () => {
    it('should correctly multiply two BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(9n);
      const b = BigInt17.fromBigint(7n);
      const result = a.mul(b);
      expect(result.toBigint()).toStrictEqual(
        BigInt(a.toBigint() * b.toBigint()) % modulus
      );
    });

    it('should correctly multiply two BigInt17 numbers with small values', () => {
      const a = BigInt17.fromBigint(2n);
      const b = BigInt17.fromBigint(3n);
      const result = a.mul(b);
      expect(result.toBigint()).toStrictEqual(
        BigInt(a.toBigint() * b.toBigint()) % modulus
      );
    });

    it('should satisfy multiplication with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(12n);
      const b = BigInt17.fromBigint(1n);
      expect(a.mul(b).toBigint()).toStrictEqual(a.toBigint());
    });

    it('should satisfy multiplication with zero for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(12n);
      const b = BigInt17.fromBigint(0n);
      expect(a.mul(b).toBigint()).toStrictEqual(b.toBigint()); // not equal when not using toBigints
    });

    it('should satisfy multiplication with zero commuted for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(7n);
      const b = BigInt17.fromBigint(0n);
      expect(a.mul(b).toBigint()).toStrictEqual(b.toBigint());
    });

    it('should satisfy commutativity of multiplication for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(3n);
      const b = BigInt17.fromBigint(4n);
      expect(a.mul(b).equals(b.mul(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy associativity of multiplication for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(3n);
      const b = BigInt17.fromBigint(5n);
      const c = BigInt17.fromBigint(11n);
      expect(a.mul(b.mul(c)).equals(a.mul(b).mul(c)).toBoolean()).toStrictEqual(
        true
      );
    });

    it('should satisfy distributivity of multiplication over addition for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(4n);
      const b = BigInt17.fromBigint(7n);
      const c = BigInt17.fromBigint(13n);
      expect(
        a
          .mul(b.add(c).remainder)
          .equals(a.mul(b).add(a.mul(c)).remainder)
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Division and Modulus', () => {
    it('should correctly divide two BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(10n);
      const b = BigInt17.fromBigint(3n);
      const result = a.div(b);
      expect(result.quotient.toBigint()).toStrictEqual(
        a.toBigint() / b.toBigint()
      );
      expect(result.remainder.toBigint()).toStrictEqual(
        a.toBigint() % b.toBigint()
      );
    });

    it('should satisfy division with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(13n);
      const b = BigInt17.fromBigint(1n);
      const result = a.div(b);
      expect(result.quotient.toBigint()).toStrictEqual(a.toBigint());
      expect(result.remainder.toBigint()).toStrictEqual(0n);
    });
  });

  describe('Square root', () => {
    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt17.fromBigint(4n);
      const result = a.sqrt();
      expect(result.toBigint()).toStrictEqual(2n);
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt17.fromBigint(9n);
      const result = a.sqrt();
      expect(result.toBigint()).toStrictEqual(14n); // 14² ≡ 9 (mod 17)
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt17.fromBigint(16n);
      const result = a.sqrt();
      expect(result.toBigint()).toStrictEqual(4n);
    });

    it('should correctly take square root of 0', () => {
      const a = BigInt17.fromBigint(0n);
      const result = a.sqrt();
      expect(result.toBigint()).toStrictEqual(0n);
    });
  });

  describe('Negate', () => {
    it('should correctly compute the additive inverse of a ProvableBigInt', () => {
      const a = BigInt17.fromBigint(9n);
      const result = a.negate();
      expect(result.toBigint()).toStrictEqual(modulus - a.toBigint());
    });

    it('should correctly compute the additive inverse of 0', () => {
      const a = BigInt17.fromBigint(0n);
      const result = a.negate();
      expect(result.toBigint()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a large number', () => {
      const a = BigInt17.fromBigint(modulus - 1n);
      const result = a.negate();
      expect(result.toBigint()).toStrictEqual(1n);
    });
  });

  describe('Inverse', () => {
    it('should correctly compute the modular inverse of a ProvableBigInt', () => {
      const a = BigInt17.fromBigint(2n);
      const result = a.inverse();
      expect(result.toBigint()).toStrictEqual(9n); // 2 * 9 ≡ 1 (mod 17)
    });

    it('should correctly compute the modular inverse of 1', () => {
      const a = BigInt17.fromBigint(1n);
      const result = a.inverse();
      expect(result.toBigint()).toStrictEqual(1n);
    });

    it('should correctly compute the modular inverse of a large number', () => {
      const a = BigInt17.fromBigint(modulus - 1n);
      const result = a.inverse();
      expect(result.toBigint()).toStrictEqual(modulus - 1n); // 16 * 16 ≡ 1 (mod 17)
    });
  });

  describe('Power', () => {
    it('should correctly compute the power of a ProvableBigInt with exponent 0', () => {
      const base = BigInt17.fromBigint(5n);
      const exponent = BigInt17.fromBigint(0n);
      const result = base.pow(exponent);
      expect(result.toBigint()).toStrictEqual(
        BigInt(base.toBigint() ** exponent.toBigint()) % modulus
      ); // 5^0 ≡ 1 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with exponent 1', () => {
      const base = BigInt17.fromBigint(5n);
      const exponent = BigInt17.fromBigint(1n);
      const result = base.pow(exponent);
      expect(result.toBigint()).toStrictEqual(
        BigInt(base.toBigint() ** exponent.toBigint()) % modulus
      ); // 5^1 ≡ 5 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a small exponent', () => {
      const base = BigInt17.fromBigint(12n);
      const exponent = BigInt17.fromBigint(2n);
      const result = base.pow(exponent);
      expect(result.toBigint()).toStrictEqual(
        BigInt(base.toBigint() ** exponent.toBigint()) % modulus
      ); // 12^2 ≡ 144 ≡ 8 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a large exponent', () => {
      const base = BigInt17.fromBigint(3n);
      const exponent = BigInt17.fromBigint(16n);
      const result = base.pow(exponent);
      expect(result.toBigint()).toStrictEqual(
        BigInt(base.toBigint() ** exponent.toBigint()) % modulus
      ); // 3^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a large base and exponent', () => {
      const base = BigInt17.fromBigint(16n);
      const exponent = BigInt17.fromBigint(16n);
      const result = base.pow(exponent);
      expect(result.toBigint()).toStrictEqual(
        BigInt(base.toBigint() ** exponent.toBigint()) % modulus
      ); // 16^16 % 17
    });
  });

  describe('Comparison', () => {
    it('should correctly compare two BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(13n);
      const b = BigInt17.fromBigint(12n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly check equality of two BigInt17 numbers', () => {
      const a = BigInt17.fromBigint(11n);
      const b = BigInt17.fromBigint(11n);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt17 numbers with zero', () => {
      const a = BigInt17.fromBigint(0n);
      const b = BigInt17.fromBigint(16n);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
    });
  });
});
