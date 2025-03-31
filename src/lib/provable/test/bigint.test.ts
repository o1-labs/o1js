import { Experimental, Field } from 'o1js';

const { createProvableBigInt } = Experimental;

// p = 17
// p = PALLAS_PRIME
// p = BLS_PRIME
// p = brainpoolP512r1_PRIME

describe('BigInt17', () => {
  const modulus = 17n;
  const BigInt17 = createProvableBigInt(modulus);

  describe('Creation and Conversion', () => {
    it('should correctly create a BigInt17 instance from a bigint and convert back to bigint', () => {
      const value = 12n;
      const bigInt = BigInt17.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly create a BigInt17 instance from a negative bigint', () => {
      const value = -12n;
      const bigInt = BigInt17.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(5n);
    });

    it('should correctly reduce a number bigger than modulus', () => {
      const value = 19n;
      const bigInt = BigInt17.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(2n);
    });

    it('should correctly create a BigInt17 instance from a maximum bigint', () => {
      const value = 16n;
      const bigInt = BigInt17.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly convert a BigInt17 instance to bits and convert back to BigInt17', () => {
      const value = 11n;
      const bigInt = BigInt17.fromBigInt(value);
      const bits = bigInt.toBits();
      const newBigInt = BigInt17.Unsafe.fromBits(bits);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });

    it('should correctly convert a BigInt17 instance to fields and convert back to BigInt17', () => {
      const value = 11n;
      const bigInt = BigInt17.fromBigInt(value);
      const fields = bigInt.toFields();
      const newBigInt = BigInt17.Unsafe.fromFields(fields);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });
  });

  describe('Addition', () => {
    it('should correctly add two BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(9n);
      const b = BigInt17.fromBigInt(13n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((a.toBigInt() + b.toBigInt()) % modulus);
    });

    it('should correctly add two zero BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(0n);
      const b = BigInt17.fromBigInt(0n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() + b.toBigInt());
    });

    it('should correctly add two maximum BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(modulus - 1n);
      const b = BigInt17.fromBigInt(modulus - 1n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((modulus - 1n + (modulus - 1n)) % modulus);
    });

    it('should satisfy commutativity of addition for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(13n);
      const b = BigInt17.fromBigInt(9n);
      expect(a.add(b).equals(b.add(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy addition with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(7n);
      const b = BigInt17.fromBigInt(0n);
      expect(a.add(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy associativity of addition for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(3n);
      const b = BigInt17.fromBigInt(15n);
      const c = BigInt17.fromBigInt(9n);
      expect(
        a
          .add(b)
          .add(c)
          .equals(a.add(b.add(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Subtraction', () => {
    it('should correctly subtract two BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(13n);
      const b = BigInt17.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() - (b.toBigInt() % modulus));
    });

    it('should satisfy subtraction with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(9n);
      const b = BigInt17.fromBigInt(0n);
      expect(a.sub(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should correctly subtract two BigInt17 numbers resulting in zero', () => {
      const a = BigInt17.fromBigInt(9n);
      const b = BigInt17.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two max BigInt17 numbers resulting in zero', () => {
      const a = BigInt17.fromBigInt(modulus - 1n);
      const b = BigInt17.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two BigInt17 numbers with reduced results', () => {
      const a = BigInt17.fromBigInt(3n);
      const b = BigInt17.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(11n);
    });

    it('should correctly subtract max BigInt17 from zero BigInt17', () => {
      const a = BigInt17.zero();
      const b = BigInt17.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly subtract max BigInt17 from one BigInt17', () => {
      const a = BigInt17.one();
      const b = BigInt17.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(2n);
    });
  });

  describe('Multiplication', () => {
    it('should correctly multiply two BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(9n);
      const b = BigInt17.fromBigInt(7n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two BigInt17 numbers with small values', () => {
      const a = BigInt17.fromBigInt(2n);
      const b = BigInt17.fromBigInt(3n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two max BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(modulus - 1n);
      const b = BigInt17.fromBigInt(modulus - 1n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should satisfy multiplication with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(12n);
      const b = BigInt17.fromBigInt(1n);
      expect(a.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy multiplication with zero for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(12n);
      const b = BigInt17.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt()); // not equal when not using toBigints
    });

    it('should satisfy multiplication with zero commuted for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(7n);
      const b = BigInt17.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt());
    });

    it('should satisfy commutativity of multiplication for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(3n);
      const b = BigInt17.fromBigInt(4n);
      expect(a.mul(b).equals(b.mul(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy associativity of multiplication for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(3n);
      const b = BigInt17.fromBigInt(5n);
      const c = BigInt17.fromBigInt(11n);
      expect(a.mul(b.mul(c)).equals(a.mul(b).mul(c)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy distributivity of multiplication over addition for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(4n);
      const b = BigInt17.fromBigInt(7n);
      const c = BigInt17.fromBigInt(13n);
      expect(
        a
          .mul(b.add(c))
          .equals(a.mul(b).add(a.mul(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  //! We should test (a * y^-1) % p
  // The inverse logic is included in the witness and can't be used here
  // as a utility for testing
  describe('Division', () => {
    it('should correctly divide two BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(10n);
      const b = BigInt17.fromBigInt(3n);
      const result = a.div(b);
      expect(result.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy division with identity element for BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(13n);
      const b = BigInt17.fromBigInt(1n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should throw a division by zero error ', () => {
      const a = BigInt17.fromBigInt(13n);
      const b = BigInt17.fromBigInt(0n);
      expect(() => a.div(b)).toThrowError();
    });

    it('should correctly divide two BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(3n);
      const b = BigInt17.fromBigInt(10n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual(2n);
    });
  });

  describe('Square root', () => {
    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt17.fromBigInt(4n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(2n);
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt17.fromBigInt(9n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(14n); // 14² ≡ 9 (mod 17)
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt17.fromBigInt(16n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(4n);
    });

    it('should correctly take square root of 1', () => {
      const a = BigInt17.fromBigInt(1n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly take square root of 0', () => {
      const a = BigInt17.fromBigInt(0n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should throw when square root doesnt exist', () => {
      const a = BigInt17.fromBigInt(5n);
      expect(() => a.sqrt()).toThrowError();
    });
  });

  describe('Negate', () => {
    it('should correctly compute the additive inverse of a ProvableBigInt', () => {
      const a = BigInt17.fromBigInt(9n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - a.toBigInt());
    });

    it('should correctly compute the additive inverse of 0', () => {
      const a = BigInt17.fromBigInt(0n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a large number', () => {
      const a = BigInt17.fromBigInt(modulus - 1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the additive inverse of 1', () => {
      const a = BigInt17.fromBigInt(1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n);
    });

    it('should correctly compute the additive inverse of a random number', () => {
      const a = BigInt17.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of a negative number', () => {
      const a = BigInt17.fromBigInt(-5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of the modulus itself', () => {
      const a = BigInt17.fromBigInt(modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a number greater than the modulus', () => {
      const a = BigInt17.fromBigInt(modulus + 5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });

    it('should correctly compute the additive inverse of a number much larger than the modulus', () => {
      const a = BigInt17.fromBigInt(987654321098765432109876543210987654321n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });
  });

  describe('Inverse', () => {
    it('should correctly compute the modular inverse of a ProvableBigInt', () => {
      const a = BigInt17.fromBigInt(2n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(9n);
    });

    it('should correctly compute the modular inverse of 1', () => {
      const a = BigInt17.fromBigInt(1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the modular inverse of a large number', () => {
      const a = BigInt17.fromBigInt(modulus - 1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n); // 16 * 16 ≡ 1 (mod 17)
    });

    it('should correctly compute the modular inverse of a random number', () => {
      const a = BigInt17.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.inverse();
      const expected =
        (BigInt(1234567890123456789012345678901234567890n) % modulus) ** (modulus - 2n) % modulus;
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a negative number', () => {
      const a = BigInt17.fromBigInt(-5n);
      const result = a.inverse();
      const expected = (modulus - (BigInt(5n) % modulus)) ** (modulus - 2n) % modulus;
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of the modulus itself', () => {
      const a = BigInt17.fromBigInt(modulus);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });

    it('should correctly compute the modular inverse of a number greater than the modulus', () => {
      const a = BigInt17.fromBigInt(modulus + 5n);
      const result = a.inverse();
      const expected = BigInt(5n) ** (modulus - 2n) % modulus;
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a number much larger than the modulus', () => {
      const a = BigInt17.fromBigInt(987654321098765432109876543210987654320n);
      const result = a.inverse();
      const expected =
        (BigInt(987654321098765432109876543210987654320n) % modulus) ** (modulus - 2n) % modulus;
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of 0', () => {
      const a = BigInt17.fromBigInt(0n);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });
  });

  describe('Power', () => {
    it('should correctly compute the power of a ProvableBigInt with exponent 0', () => {
      const base = BigInt17.fromBigInt(5n);
      const exponent = BigInt17.fromBigInt(0n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^0 ≡ 1 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with exponent 1', () => {
      const base = BigInt17.fromBigInt(5n);
      const exponent = BigInt17.fromBigInt(1n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^1 ≡ 5 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a small exponent', () => {
      const base = BigInt17.fromBigInt(12n);
      const exponent = BigInt17.fromBigInt(2n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 12^2 ≡ 144 ≡ 8 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a large exponent', () => {
      const base = BigInt17.fromBigInt(3n);
      const exponent = BigInt17.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 3^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a large base and exponent', () => {
      const base = BigInt17.fromBigInt(16n);
      const exponent = BigInt17.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 16^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a negative exponent', () => {
      const base = BigInt17.fromBigInt(3n);
      const exponent = BigInt17.fromBigInt(-1n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a random base and exponent', () => {
      const base = BigInt17.fromBigInt(7n);
      const exponent = BigInt17.fromBigInt(5n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a very large base and small exponent', () => {
      const base = BigInt17.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt17.fromBigInt(2n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a small base and very large exponent', () => {
      const base = BigInt17.fromBigInt(2n);
      const exponent = BigInt17.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with both base and exponent being very large', () => {
      const base = BigInt17.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt17.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });
  });

  describe('Comparison', () => {
    it('should correctly compare two BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(13n);
      const b = BigInt17.fromBigInt(12n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly check equality of two BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(11n);
      const b = BigInt17.fromBigInt(11n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt17 numbers with zero', () => {
      const a = BigInt17.fromBigInt(0n);
      const b = BigInt17.fromBigInt(16n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt17 numbers with modulus', () => {
      const a = BigInt17.fromBigInt(17n);
      const b = BigInt17.fromBigInt(1n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare negative BigInt17 numbers', () => {
      const a = BigInt17.fromBigInt(-1n); // -1 mod 17 = 16
      const b = BigInt17.fromBigInt(16n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt17 numbers with random values', () => {
      const a = BigInt17.fromBigInt(7n);
      const b = BigInt17.fromBigInt(5n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt17 numbers with equal values', () => {
      const a = BigInt17.fromBigInt(8n);
      const b = BigInt17.fromBigInt(8n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt17 numbers with one being zero', () => {
      const a = BigInt17.fromBigInt(0n);
      const b = BigInt17.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt17 numbers with one being the modulus', () => {
      const a = BigInt17.fromBigInt(17n);
      const b = BigInt17.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });
  });
});

describe('BigInt255', () => {
  const modulus = Field.ORDER;
  const BigInt255 = createProvableBigInt(modulus);

  describe('Creation and Conversion', () => {
    it('should correctly create a BigInt255 instance from a bigint and convert back to bigint', () => {
      const value = 12n;
      const bigInt = BigInt255.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly create a BigInt255 instance from a negative bigint', () => {
      const value = -12n;
      const bigInt = BigInt255.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value + modulus);
    });

    it('should correctly reduce a number bigger than modulus', () => {
      const value = modulus + 79n;
      const bigInt = BigInt255.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value % modulus);
    });

    it('should correctly create a BigInt255 instance from a maximum bigint', () => {
      const value = modulus - 1n;
      const bigInt = BigInt255.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly convert a BigInt255 instance to bits and convert back to BigInt255', () => {
      const value = Field.random().toBigInt();
      const bigInt = BigInt255.fromBigInt(value);
      const bits = bigInt.toBits();
      const newBigInt = BigInt255.Unsafe.fromBits(bits);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });

    it('should correctly convert a BigInt255 instance to fields and convert back to BigInt255', () => {
      const value = Field.random().toBigInt();
      const bigInt = BigInt255.fromBigInt(value);
      const fields = bigInt.toFields();
      const newBigInt = BigInt255.Unsafe.fromFields(fields);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });
  });

  describe('Addition', () => {
    it('should correctly add two BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(9n);
      const b = BigInt255.fromBigInt(13n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((a.toBigInt() + b.toBigInt()) % modulus);
    });

    it('should correctly add two zero BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(0n);
      const b = BigInt255.fromBigInt(0n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() + b.toBigInt());
    });

    it('should correctly add two maximum BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(modulus - 1n);
      const b = BigInt255.fromBigInt(modulus - 1n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((modulus - 1n + (modulus - 1n)) % modulus);
    });

    it('should satisfy commutativity of addition for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(13n);
      const b = BigInt255.fromBigInt(9n);
      expect(a.add(b).equals(b.add(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy addition with identity element for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(7n);
      const b = BigInt255.fromBigInt(0n);
      expect(a.add(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy associativity of addition for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(3n);
      const b = BigInt255.fromBigInt(15n);
      const c = BigInt255.fromBigInt(9n);
      expect(
        a
          .add(b)
          .add(c)
          .equals(a.add(b.add(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Subtraction', () => {
    it('should correctly subtract two BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(13n);
      const b = BigInt255.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() - (b.toBigInt() % modulus));
    });

    it('should satisfy subtraction with identity element for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(9n);
      const b = BigInt255.fromBigInt(0n);
      expect(a.sub(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should correctly subtract two BigInt255 numbers resulting in zero', () => {
      const a = BigInt255.fromBigInt(9n);
      const b = BigInt255.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two max BigInt255 numbers resulting in zero', () => {
      const a = BigInt255.fromBigInt(modulus - 1n);
      const b = BigInt255.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two BigInt255 numbers with reduced results', () => {
      const a = BigInt255.fromBigInt(3n);
      const b = BigInt255.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() - b.toBigInt() + modulus);
    });

    it('should correctly subtract max BigInt255 from zero BigInt255', () => {
      const a = BigInt255.zero();
      const b = BigInt255.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() - b.toBigInt() + modulus);
    });

    it('should correctly subtract max BigInt255 from one BigInt255', () => {
      const a = BigInt255.one();
      const b = BigInt255.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() - b.toBigInt() + modulus);
    });
  });

  describe('Multiplication', () => {
    it('should correctly multiply two BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(9n);
      const b = BigInt255.fromBigInt(7n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two BigInt255 numbers with small values', () => {
      const a = BigInt255.fromBigInt(2n);
      const b = BigInt255.fromBigInt(3n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two max BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(modulus - 1n);
      const b = BigInt255.fromBigInt(modulus - 1n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should satisfy multiplication with identity element for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(12n);
      const b = BigInt255.fromBigInt(1n);
      expect(a.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy multiplication with zero for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(12n);
      const b = BigInt255.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt()); // not equal when not using toBigints
    });

    it('should satisfy multiplication with zero commuted for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(7n);
      const b = BigInt255.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt());
    });

    it('should satisfy commutativity of multiplication for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(3n);
      const b = BigInt255.fromBigInt(4n);
      expect(a.mul(b).equals(b.mul(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy associativity of multiplication for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(3n);
      const b = BigInt255.fromBigInt(5n);
      const c = BigInt255.fromBigInt(11n);
      expect(a.mul(b.mul(c)).equals(a.mul(b).mul(c)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy distributivity of multiplication over addition for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(4n);
      const b = BigInt255.fromBigInt(7n);
      const c = BigInt255.fromBigInt(13n);
      expect(
        a
          .mul(b.add(c))
          .equals(a.mul(b).add(a.mul(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  //! We should test (a * y^-1) % p
  // The inverse logic is included in the witness and can't be used here
  // as a utility for testing
  describe('Division', () => {
    it('should correctly divide two BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(10n);
      const b = BigInt255.fromBigInt(3n);
      const result = a.div(b);
      expect(result.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy division with identity element for BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(13n);
      const b = BigInt255.fromBigInt(1n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should throw a division by zero error ', () => {
      const a = BigInt255.fromBigInt(13n);
      const b = BigInt255.fromBigInt(0n);
      expect(() => a.div(b)).toThrowError();
    });

    it('should correctly divide two BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(3n);
      const b = BigInt255.fromBigInt(10n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual((3n * modularInverse(10n, modulus)) % modulus);
    });
  });

  describe('Square root', () => {
    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt255.fromBigInt(4n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt255.fromBigInt(9n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt255.fromBigInt(16n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of 1', () => {
      const a = BigInt255.fromBigInt(1n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly take square root of 0', () => {
      const a = BigInt255.fromBigInt(0n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should throw when square root doesnt exist', () => {
      const a = BigInt255.fromBigInt(5n);
      expect(() => a.sqrt()).toThrowError();
    });
  });

  describe('Negate', () => {
    it('should correctly compute the additive inverse of a ProvableBigInt', () => {
      const a = BigInt255.fromBigInt(9n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - a.toBigInt());
    });

    it('should correctly compute the additive inverse of 0', () => {
      const a = BigInt255.fromBigInt(0n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a large number', () => {
      const a = BigInt255.fromBigInt(modulus - 1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the additive inverse of 1', () => {
      const a = BigInt255.fromBigInt(1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n);
    });

    it('should correctly compute the additive inverse of a random number', () => {
      const a = BigInt255.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of a negative number', () => {
      const a = BigInt255.fromBigInt(-5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of the modulus itself', () => {
      const a = BigInt255.fromBigInt(modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a number greater than the modulus', () => {
      const a = BigInt255.fromBigInt(modulus + 5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });

    it('should correctly compute the additive inverse of a number much larger than the modulus', () => {
      const a = BigInt255.fromBigInt(987654321098765432109876543210987654321n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });
  });

  describe('Inverse', () => {
    it('should correctly compute the modular inverse of a ProvableBigInt', () => {
      const a = BigInt255.fromBigInt(2n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(modularInverse(2n, modulus));
    });

    it('should correctly compute the modular inverse of 1', () => {
      const a = BigInt255.fromBigInt(1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the modular inverse of a large number', () => {
      const a = BigInt255.fromBigInt(modulus - 1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n); // 16 * 16 ≡ 1 (mod 17)
    });

    it('should correctly compute the modular inverse of a random number', () => {
      const a = BigInt255.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a negative number', () => {
      const a = BigInt255.fromBigInt(-5n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of the modulus itself', () => {
      const a = BigInt255.fromBigInt(modulus);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });

    it('should correctly compute the modular inverse of a number greater than the modulus', () => {
      const a = BigInt255.fromBigInt(modulus + 5n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a number much larger than the modulus', () => {
      const a = BigInt255.fromBigInt(987654321098765432109876543210987654320n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of 0', () => {
      const a = BigInt255.fromBigInt(0n);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });
  });

  describe('Power', () => {
    it('should correctly compute the power of a ProvableBigInt with exponent 0', () => {
      const base = BigInt255.fromBigInt(5n);
      const exponent = BigInt255.fromBigInt(0n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^0 ≡ 1 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with exponent 1', () => {
      const base = BigInt255.fromBigInt(5n);
      const exponent = BigInt255.fromBigInt(1n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^1 ≡ 5 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a small exponent', () => {
      const base = BigInt255.fromBigInt(12n);
      const exponent = BigInt255.fromBigInt(2n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 12^2 ≡ 144 ≡ 8 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a large exponent', () => {
      const base = BigInt255.fromBigInt(3n);
      const exponent = BigInt255.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 3^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a large base and exponent', () => {
      const base = BigInt255.fromBigInt(16n);
      const exponent = BigInt255.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 16^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a negative exponent', () => {
      const base = BigInt255.fromBigInt(3n);
      const exponent = BigInt255.fromBigInt(-1n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a random base and exponent', () => {
      const base = BigInt255.fromBigInt(7n);
      const exponent = BigInt255.fromBigInt(5n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a very large base and small exponent', () => {
      const base = BigInt255.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt255.fromBigInt(2n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a small base and very large exponent', () => {
      const base = BigInt255.fromBigInt(2n);
      const exponent = BigInt255.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with both base and exponent being very large', () => {
      const base = BigInt255.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt255.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });
  });

  describe('Comparison', () => {
    it('should correctly compare two BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(13n);
      const b = BigInt255.fromBigInt(12n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly check equality of two BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(11n);
      const b = BigInt255.fromBigInt(11n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt255 numbers with zero', () => {
      const a = BigInt255.fromBigInt(0n);
      const b = BigInt255.fromBigInt(16n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt255 numbers with modulus', () => {
      const a = BigInt255.fromBigInt(modulus);
      const b = BigInt255.fromBigInt(1n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare negative BigInt255 numbers', () => {
      const a = BigInt255.fromBigInt(-1n); // -1 mod 17 = 16
      const b = BigInt255.fromBigInt(modulus - 1n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt255 numbers with random values', () => {
      const a = BigInt255.fromBigInt(7n);
      const b = BigInt255.fromBigInt(5n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt255 numbers with equal values', () => {
      const a = BigInt255.fromBigInt(8n);
      const b = BigInt255.fromBigInt(8n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt255 numbers with one being zero', () => {
      const a = BigInt255.fromBigInt(0n);
      const b = BigInt255.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt255 numbers with one being the modulus', () => {
      const a = BigInt255.fromBigInt(modulus);
      const b = BigInt255.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt255 numbers properly', () => {
      const a = BigInt255.Unsafe.fromFields([
        new Field(1),
        new Field(3),
        new Field(3),
        new Field(0),
      ]);
      const b = BigInt255.Unsafe.fromFields([
        new Field(1),
        new Field(2),
        new Field(4),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt255 numbers properly', () => {
      const a = BigInt255.Unsafe.fromFields([
        new Field(1),
        new Field(0),
        new Field(4),
        new Field(0),
      ]);
      const b = BigInt255.Unsafe.fromFields([
        new Field(1),
        new Field(18446744073709551615n),
        new Field(1),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt255 numbers properly', () => {
      const a = BigInt255.Unsafe.fromFields([
        new Field(18446744073709551615n),
        new Field(1),
        new Field(1),
        new Field(0),
      ]);
      const b = BigInt255.Unsafe.fromFields([
        new Field(1),
        new Field(1),
        new Field(2),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
    });
  });
});

describe('BigInt381', () => {
  const modulus =
    0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
  const BigInt381 = createProvableBigInt(modulus);

  describe('Creation and Conversion', () => {
    it('should correctly create a BigInt381 instance from a bigint and convert back to bigint', () => {
      const value = 12n;
      const bigInt = BigInt381.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly create a BigInt381 instance from a negative bigint', () => {
      const value = -12n;
      const bigInt = BigInt381.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value + modulus);
    });

    it('should correctly reduce a number bigger than modulus', () => {
      const value = modulus + 79n;
      const bigInt = BigInt381.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value % modulus);
    });

    it('should correctly create a BigInt381 instance from a maximum bigint', () => {
      const value = modulus - 1n;
      const bigInt = BigInt381.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly convert a BigInt381 instance to bits and convert back to BigInt381', () => {
      const value = Field.random().toBigInt();
      const bigInt = BigInt381.fromBigInt(value);
      const bits = bigInt.toBits();
      const newBigInt = BigInt381.Unsafe.fromBits(bits);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });

    it('should correctly convert a BigInt381 instance to fields and convert back to BigInt381', () => {
      const value = Field.random().toBigInt();
      const bigInt = BigInt381.fromBigInt(value);
      const fields = bigInt.toFields();
      const newBigInt = BigInt381.Unsafe.fromFields(fields);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });
  });

  describe('Addition', () => {
    it('should correctly add two BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(9n);
      const b = BigInt381.fromBigInt(13n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((a.toBigInt() + b.toBigInt()) % modulus);
    });

    it('should correctly add two zero BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(0n);
      const b = BigInt381.fromBigInt(0n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() + b.toBigInt());
    });

    it('should correctly add two maximum BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(modulus - 1n);
      const b = BigInt381.fromBigInt(modulus - 1n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((modulus - 1n + (modulus - 1n)) % modulus);
    });

    it('should satisfy commutativity of addition for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(13n);
      const b = BigInt381.fromBigInt(9n);
      expect(a.add(b).equals(b.add(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy addition with identity element for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(7n);
      const b = BigInt381.fromBigInt(0n);
      expect(a.add(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy associativity of addition for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(3n);
      const b = BigInt381.fromBigInt(15n);
      const c = BigInt381.fromBigInt(9n);
      expect(
        a
          .add(b)
          .add(c)
          .equals(a.add(b.add(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Subtraction', () => {
    it('should correctly subtract two BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(13n);
      const b = BigInt381.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() - (b.toBigInt() % modulus));
    });

    it('should satisfy subtraction with identity element for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(9n);
      const b = BigInt381.fromBigInt(0n);
      expect(a.sub(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should correctly subtract two BigInt381 numbers resulting in zero', () => {
      const a = BigInt381.fromBigInt(9n);
      const b = BigInt381.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two max BigInt381 numbers resulting in zero', () => {
      const a = BigInt381.fromBigInt(modulus - 1n);
      const b = BigInt381.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two BigInt381 numbers with reduced results', () => {
      const a = BigInt381.fromBigInt(3n);
      const b = BigInt381.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() - b.toBigInt()) + modulus);
    });

    it('should correctly subtract max BigInt381 from zero BigInt381', () => {
      const a = BigInt381.zero();
      const b = BigInt381.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() - b.toBigInt()) + modulus);
    });

    it('should correctly subtract max BigInt381 from one BigInt381', () => {
      const a = BigInt381.one();
      const b = BigInt381.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() - b.toBigInt()) + modulus);
    });
  });

  describe('Multiplication', () => {
    it('should correctly multiply two BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(9n);
      const b = BigInt381.fromBigInt(7n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two BigInt381 numbers with small values', () => {
      const a = BigInt381.fromBigInt(2n);
      const b = BigInt381.fromBigInt(3n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two max BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(modulus - 1n);
      const b = BigInt381.fromBigInt(modulus - 1n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should satisfy multiplication with identity element for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(12n);
      const b = BigInt381.fromBigInt(1n);
      expect(a.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy multiplication with zero for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(12n);
      const b = BigInt381.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt()); // not equal when not using toBigints
    });

    it('should satisfy multiplication with zero commuted for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(7n);
      const b = BigInt381.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt());
    });

    it('should satisfy commutativity of multiplication for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(3n);
      const b = BigInt381.fromBigInt(4n);
      expect(a.mul(b).equals(b.mul(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy associativity of multiplication for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(3n);
      const b = BigInt381.fromBigInt(5n);
      const c = BigInt381.fromBigInt(11n);
      expect(a.mul(b.mul(c)).equals(a.mul(b).mul(c)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy distributivity of multiplication over addition for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(4n);
      const b = BigInt381.fromBigInt(7n);
      const c = BigInt381.fromBigInt(13n);
      expect(
        a
          .mul(b.add(c))
          .equals(a.mul(b).add(a.mul(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  //! We should test (a * y^-1) % p
  // The inverse logic is included in the witness and can't be used here
  // as a utility for testing
  describe('Division', () => {
    it('should correctly divide two BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(10n);
      const b = BigInt381.fromBigInt(3n);
      const result = a.div(b);
      expect(result.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy division with identity element for BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(13n);
      const b = BigInt381.fromBigInt(1n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should throw a division by zero error ', () => {
      const a = BigInt381.fromBigInt(13n);
      const b = BigInt381.fromBigInt(0n);
      expect(() => a.div(b)).toThrowError();
    });

    it('should correctly divide two BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(3n);
      const b = BigInt381.fromBigInt(10n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual((3n * modularInverse(10n, modulus)) % modulus);
    });
  });

  describe('Square root', () => {
    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt381.fromBigInt(4n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt381.fromBigInt(9n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt381.fromBigInt(16n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of 1', () => {
      const a = BigInt381.fromBigInt(1n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly take square root of 0', () => {
      const a = BigInt381.fromBigInt(0n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should throw when square root doesnt exist', () => {
      const a = BigInt381.fromBigInt(5n);
      expect(() => a.sqrt()).toThrowError();
    });
  });

  describe('Negate', () => {
    it('should correctly compute the additive inverse of a ProvableBigInt', () => {
      const a = BigInt381.fromBigInt(9n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - a.toBigInt());
    });

    it('should correctly compute the additive inverse of 0', () => {
      const a = BigInt381.fromBigInt(0n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a large number', () => {
      const a = BigInt381.fromBigInt(modulus - 1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the additive inverse of 1', () => {
      const a = BigInt381.fromBigInt(1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n);
    });

    it('should correctly compute the additive inverse of a random number', () => {
      const a = BigInt381.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of a negative number', () => {
      const a = BigInt381.fromBigInt(-5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of the modulus itself', () => {
      const a = BigInt381.fromBigInt(modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a number greater than the modulus', () => {
      const a = BigInt381.fromBigInt(modulus + 5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });

    it('should correctly compute the additive inverse of a number much larger than the modulus', () => {
      const a = BigInt381.fromBigInt(987654321098765432109876543210987654321n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });
  });

  describe('Inverse', () => {
    it('should correctly compute the modular inverse of a ProvableBigInt', () => {
      const a = BigInt381.fromBigInt(2n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(modularInverse(2n, modulus));
    });

    it('should correctly compute the modular inverse of 1', () => {
      const a = BigInt381.fromBigInt(1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the modular inverse of a large number', () => {
      const a = BigInt381.fromBigInt(modulus - 1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n); // 16 * 16 ≡ 1 (mod 17)
    });

    it('should correctly compute the modular inverse of a random number', () => {
      const a = BigInt381.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a negative number', () => {
      const a = BigInt381.fromBigInt(-5n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of the modulus itself', () => {
      const a = BigInt381.fromBigInt(modulus);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });

    it('should correctly compute the modular inverse of a number greater than the modulus', () => {
      const a = BigInt381.fromBigInt(modulus + 5n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a number much larger than the modulus', () => {
      const a = BigInt381.fromBigInt(987654321098765432109876543210987654320n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of 0', () => {
      const a = BigInt381.fromBigInt(0n);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });
  });

  describe('Power', () => {
    it('should correctly compute the power of a ProvableBigInt with exponent 0', () => {
      const base = BigInt381.fromBigInt(5n);
      const exponent = BigInt381.fromBigInt(0n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^0 ≡ 1 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with exponent 1', () => {
      const base = BigInt381.fromBigInt(5n);
      const exponent = BigInt381.fromBigInt(1n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^1 ≡ 5 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a small exponent', () => {
      const base = BigInt381.fromBigInt(12n);
      const exponent = BigInt381.fromBigInt(2n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 12^2 ≡ 144 ≡ 8 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a large exponent', () => {
      const base = BigInt381.fromBigInt(3n);
      const exponent = BigInt381.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 3^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a large base and exponent', () => {
      const base = BigInt381.fromBigInt(16n);
      const exponent = BigInt381.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 16^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a negative exponent', () => {
      const base = BigInt381.fromBigInt(3n);
      const exponent = BigInt381.fromBigInt(-1n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a random base and exponent', () => {
      const base = BigInt381.fromBigInt(7n);
      const exponent = BigInt381.fromBigInt(5n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a very large base and small exponent', () => {
      const base = BigInt381.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt381.fromBigInt(2n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a small base and very large exponent', () => {
      const base = BigInt381.fromBigInt(2n);
      const exponent = BigInt381.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with both base and exponent being very large', () => {
      const base = BigInt381.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt381.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });
  });

  describe('Comparison', () => {
    it('should correctly compare two BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(13n);
      const b = BigInt381.fromBigInt(12n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly check equality of two BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(11n);
      const b = BigInt381.fromBigInt(11n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt381 numbers with zero', () => {
      const a = BigInt381.fromBigInt(0n);
      const b = BigInt381.fromBigInt(16n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt381 numbers with modulus', () => {
      const a = BigInt381.fromBigInt(modulus);
      const b = BigInt381.fromBigInt(1n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare negative BigInt381 numbers', () => {
      const a = BigInt381.fromBigInt(-1n); // -1 mod 17 = 16
      const b = BigInt381.fromBigInt(modulus - 1n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt381 numbers with random values', () => {
      const a = BigInt381.fromBigInt(7n);
      const b = BigInt381.fromBigInt(5n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt381 numbers with equal values', () => {
      const a = BigInt381.fromBigInt(8n);
      const b = BigInt381.fromBigInt(8n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt381 numbers with one being zero', () => {
      const a = BigInt381.fromBigInt(0n);
      const b = BigInt381.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt381 numbers with one being the modulus', () => {
      const a = BigInt381.fromBigInt(modulus);
      const b = BigInt381.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt381 numbers properly', () => {
      const a = BigInt381.Unsafe.fromFields([
        new Field(1),
        new Field(3),
        new Field(3),
        new Field(0),
      ]);
      const b = BigInt381.Unsafe.fromFields([
        new Field(1),
        new Field(2),
        new Field(4),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt381 numbers properly', () => {
      const a = BigInt381.Unsafe.fromFields([
        new Field(1),
        new Field(0),
        new Field(4),
        new Field(0),
      ]);
      const b = BigInt381.Unsafe.fromFields([
        new Field(1),
        new Field(18446744073709551615n),
        new Field(1),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt381 numbers properly', () => {
      const a = BigInt381.Unsafe.fromFields([
        new Field(18446744073709551615n),
        new Field(1),
        new Field(1),
        new Field(0),
      ]);
      const b = BigInt381.Unsafe.fromFields([
        new Field(1),
        new Field(1),
        new Field(2),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
    });
  });
});

describe('BigInt512', () => {
  const modulus =
    0xaadd9db8dbe9c48b3fd4e6ae33c9fc07cb308db3b3c9d20ed6639cca703308717d4d9b009bc66842aecda12ae6a380e62881ff2f2d82c68528aa6056583a48f3n;
  const BigInt512 = createProvableBigInt(modulus);

  describe('Creation and Conversion', () => {
    it('should correctly create a BigInt512 instance from a bigint and convert back to bigint', () => {
      const value = 12n;
      const bigInt = BigInt512.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly create a BigInt512 instance from a negative bigint', () => {
      const value = -12n;
      const bigInt = BigInt512.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value + modulus);
    });

    it('should correctly reduce a number bigger than modulus', () => {
      const value = modulus + 79n;
      const bigInt = BigInt512.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value % modulus);
    });

    it('should correctly create a BigInt512 instance from a maximum bigint', () => {
      const value = modulus - 1n;
      const bigInt = BigInt512.fromBigInt(value);
      expect(bigInt.toBigInt()).toStrictEqual(value);
    });

    it('should correctly convert a BigInt512 instance to bits and convert back to BigInt512', () => {
      const value = Field.random().toBigInt();
      const bigInt = BigInt512.fromBigInt(value);
      const bits = bigInt.toBits();
      const newBigInt = BigInt512.Unsafe.fromBits(bits);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });

    it('should correctly convert a BigInt512 instance to fields and convert back to BigInt512', () => {
      const value = Field.random().toBigInt();
      const bigInt = BigInt512.fromBigInt(value);
      const fields = bigInt.toFields();
      const newBigInt = BigInt512.Unsafe.fromFields(fields);
      expect(bigInt.toBigInt()).toStrictEqual(newBigInt.toBigInt());
    });
  });

  describe('Addition', () => {
    it('should correctly add two BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(9n);
      const b = BigInt512.fromBigInt(13n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((a.toBigInt() + b.toBigInt()) % modulus);
    });

    it('should correctly add two zero BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(0n);
      const b = BigInt512.fromBigInt(0n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() + b.toBigInt());
    });

    it('should correctly add two maximum BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(modulus - 1n);
      const b = BigInt512.fromBigInt(modulus - 1n);
      const result = a.add(b);
      expect(result.toBigInt()).toStrictEqual((modulus - 1n + (modulus - 1n)) % modulus);
    });

    it('should satisfy commutativity of addition for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(13n);
      const b = BigInt512.fromBigInt(9n);
      expect(a.add(b).equals(b.add(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy addition with identity element for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(7n);
      const b = BigInt512.fromBigInt(0n);
      expect(a.add(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy associativity of addition for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(3n);
      const b = BigInt512.fromBigInt(15n);
      const c = BigInt512.fromBigInt(9n);
      expect(
        a
          .add(b)
          .add(c)
          .equals(a.add(b.add(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  describe('Subtraction', () => {
    it('should correctly subtract two BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(13n);
      const b = BigInt512.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt() - (b.toBigInt() % modulus));
    });

    it('should satisfy subtraction with identity element for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(9n);
      const b = BigInt512.fromBigInt(0n);
      expect(a.sub(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should correctly subtract two BigInt512 numbers resulting in zero', () => {
      const a = BigInt512.fromBigInt(9n);
      const b = BigInt512.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two max BigInt512 numbers resulting in zero', () => {
      const a = BigInt512.fromBigInt(modulus - 1n);
      const b = BigInt512.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly subtract two BigInt512 numbers with reduced results', () => {
      const a = BigInt512.fromBigInt(3n);
      const b = BigInt512.fromBigInt(9n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() - b.toBigInt()) + modulus);
    });

    it('should correctly subtract max BigInt512 from zero BigInt512', () => {
      const a = BigInt512.zero();
      const b = BigInt512.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() - b.toBigInt()) + modulus);
    });

    it('should correctly subtract max BigInt512 from one BigInt512', () => {
      const a = BigInt512.one();
      const b = BigInt512.fromBigInt(modulus - 1n);
      const result = a.sub(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() - b.toBigInt()) + modulus);
    });
  });

  describe('Multiplication', () => {
    it('should correctly multiply two BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(9n);
      const b = BigInt512.fromBigInt(7n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two BigInt512 numbers with small values', () => {
      const a = BigInt512.fromBigInt(2n);
      const b = BigInt512.fromBigInt(3n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should correctly multiply two max BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(modulus - 1n);
      const b = BigInt512.fromBigInt(modulus - 1n);
      const result = a.mul(b);
      expect(result.toBigInt()).toStrictEqual(BigInt(a.toBigInt() * b.toBigInt()) % modulus);
    });

    it('should satisfy multiplication with identity element for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(12n);
      const b = BigInt512.fromBigInt(1n);
      expect(a.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy multiplication with zero for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(12n);
      const b = BigInt512.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt()); // not equal when not using toBigints
    });

    it('should satisfy multiplication with zero commuted for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(7n);
      const b = BigInt512.fromBigInt(0n);
      expect(a.mul(b).toBigInt()).toStrictEqual(b.toBigInt());
    });

    it('should satisfy commutativity of multiplication for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(3n);
      const b = BigInt512.fromBigInt(4n);
      expect(a.mul(b).equals(b.mul(a)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy associativity of multiplication for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(3n);
      const b = BigInt512.fromBigInt(5n);
      const c = BigInt512.fromBigInt(11n);
      expect(a.mul(b.mul(c)).equals(a.mul(b).mul(c)).toBoolean()).toStrictEqual(true);
    });

    it('should satisfy distributivity of multiplication over addition for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(4n);
      const b = BigInt512.fromBigInt(7n);
      const c = BigInt512.fromBigInt(13n);
      expect(
        a
          .mul(b.add(c))
          .equals(a.mul(b).add(a.mul(c)))
          .toBoolean()
      ).toStrictEqual(true);
    });
  });

  //! We should test (a * y^-1) % p
  // The inverse logic is included in the witness and can't be used here
  // as a utility for testing
  describe('Division', () => {
    it('should correctly divide two BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(10n);
      const b = BigInt512.fromBigInt(3n);
      const result = a.div(b);
      expect(result.mul(b).toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should satisfy division with identity element for BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(13n);
      const b = BigInt512.fromBigInt(1n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual(a.toBigInt());
    });

    it('should throw a division by zero error ', () => {
      const a = BigInt512.fromBigInt(13n);
      const b = BigInt512.fromBigInt(0n);
      expect(() => a.div(b)).toThrowError();
    });

    it('should correctly divide two BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(3n);
      const b = BigInt512.fromBigInt(10n);
      const result = a.div(b);
      expect(result.toBigInt()).toStrictEqual((3n * modularInverse(10n, modulus)) % modulus);
    });
  });

  describe('Square root', () => {
    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt512.fromBigInt(4n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt512.fromBigInt(9n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of a ProvableBigInt', () => {
      const a = BigInt512.fromBigInt(16n);
      const result = a.sqrt();
      expect(modularExponentiation(result.toBigInt(), 2n, modulus)).toStrictEqual(a.toBigInt());
    });

    it('should correctly take square root of 1', () => {
      const a = BigInt512.fromBigInt(1n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly take square root of 0', () => {
      const a = BigInt512.fromBigInt(0n);
      const result = a.sqrt();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should throw when square root doesnt exist', () => {
      const a = BigInt512.fromBigInt(5n);
      expect(() => a.sqrt()).toThrowError();
    });
  });

  describe('Negate', () => {
    it('should correctly compute the additive inverse of a ProvableBigInt', () => {
      const a = BigInt512.fromBigInt(9n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - a.toBigInt());
    });

    it('should correctly compute the additive inverse of 0', () => {
      const a = BigInt512.fromBigInt(0n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a large number', () => {
      const a = BigInt512.fromBigInt(modulus - 1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the additive inverse of 1', () => {
      const a = BigInt512.fromBigInt(1n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n);
    });

    it('should correctly compute the additive inverse of a random number', () => {
      const a = BigInt512.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of a negative number', () => {
      const a = BigInt512.fromBigInt(-5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - a.toBigInt()) % modulus);
    });

    it('should correctly compute the additive inverse of the modulus itself', () => {
      const a = BigInt512.fromBigInt(modulus);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual(0n);
    });

    it('should correctly compute the additive inverse of a number greater than the modulus', () => {
      const a = BigInt512.fromBigInt(modulus + 5n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });

    it('should correctly compute the additive inverse of a number much larger than the modulus', () => {
      const a = BigInt512.fromBigInt(987654321098765432109876543210987654321n);
      const result = a.negate();
      expect(result.toBigInt()).toStrictEqual((modulus - (a.toBigInt() % modulus)) % modulus);
    });
  });

  describe('Inverse', () => {
    it('should correctly compute the modular inverse of a ProvableBigInt', () => {
      const a = BigInt512.fromBigInt(2n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(modularInverse(2n, modulus));
    });

    it('should correctly compute the modular inverse of 1', () => {
      const a = BigInt512.fromBigInt(1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(1n);
    });

    it('should correctly compute the modular inverse of a large number', () => {
      const a = BigInt512.fromBigInt(modulus - 1n);
      const result = a.inverse();
      expect(result.toBigInt()).toStrictEqual(modulus - 1n); // 16 * 16 ≡ 1 (mod 17)
    });

    it('should correctly compute the modular inverse of a random number', () => {
      const a = BigInt512.fromBigInt(1234567890123456789012345678901234567890n % modulus);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a negative number', () => {
      const a = BigInt512.fromBigInt(-5n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of the modulus itself', () => {
      const a = BigInt512.fromBigInt(modulus);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });

    it('should correctly compute the modular inverse of a number greater than the modulus', () => {
      const a = BigInt512.fromBigInt(modulus + 5n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of a number much larger than the modulus', () => {
      const a = BigInt512.fromBigInt(987654321098765432109876543210987654320n);
      const result = a.inverse();
      const expected = modularInverse(a.toBigInt(), modulus);
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the modular inverse of 0', () => {
      const a = BigInt512.fromBigInt(0n);
      expect(() => a.inverse()).toThrowError('a is not invertible');
    });
  });

  describe('Power', () => {
    it('should correctly compute the power of a ProvableBigInt with exponent 0', () => {
      const base = BigInt512.fromBigInt(5n);
      const exponent = BigInt512.fromBigInt(0n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^0 ≡ 1 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with exponent 1', () => {
      const base = BigInt512.fromBigInt(5n);
      const exponent = BigInt512.fromBigInt(1n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 5^1 ≡ 5 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a small exponent', () => {
      const base = BigInt512.fromBigInt(12n);
      const exponent = BigInt512.fromBigInt(2n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 12^2 ≡ 144 ≡ 8 (mod 17)
    });

    it('should correctly compute the power of a ProvableBigInt with a large exponent', () => {
      const base = BigInt512.fromBigInt(3n);
      const exponent = BigInt512.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 3^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a large base and exponent', () => {
      const base = BigInt512.fromBigInt(16n);
      const exponent = BigInt512.fromBigInt(16n);
      const result = base.pow(exponent);
      expect(result.toBigInt()).toStrictEqual(
        BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus))
      ); // 16^16 % 17
    });

    it('should correctly compute the power of a ProvableBigInt with a negative exponent', () => {
      const base = BigInt512.fromBigInt(3n);
      const exponent = BigInt512.fromBigInt(-1n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a random base and exponent', () => {
      const base = BigInt512.fromBigInt(7n);
      const exponent = BigInt512.fromBigInt(5n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a very large base and small exponent', () => {
      const base = BigInt512.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt512.fromBigInt(2n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with a small base and very large exponent', () => {
      const base = BigInt512.fromBigInt(2n);
      const exponent = BigInt512.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });

    it('should correctly compute the power of a ProvableBigInt with both base and exponent being very large', () => {
      const base = BigInt512.fromBigInt(987654321098765432109876543210987654321n);
      const exponent = BigInt512.fromBigInt(987654321098765432109876543210987654321n);
      const result = base.pow(exponent);
      const expected = BigInt(modularExponentiation(base.toBigInt(), exponent.toBigInt(), modulus));
      expect(result.toBigInt()).toStrictEqual(expected);
    });
  });

  describe('Comparison', () => {
    it('should correctly compare two BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(13n);
      const b = BigInt512.fromBigInt(12n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly check equality of two BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(11n);
      const b = BigInt512.fromBigInt(11n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt512 numbers with zero', () => {
      const a = BigInt512.fromBigInt(0n);
      const b = BigInt512.fromBigInt(16n);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt512 numbers with modulus', () => {
      const a = BigInt512.fromBigInt(modulus);
      const b = BigInt512.fromBigInt(1n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare negative BigInt512 numbers', () => {
      const a = BigInt512.fromBigInt(-1n); // -1 mod 17 = 16
      const b = BigInt512.fromBigInt(modulus - 1n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt512 numbers with random values', () => {
      const a = BigInt512.fromBigInt(7n);
      const b = BigInt512.fromBigInt(5n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt512 numbers with equal values', () => {
      const a = BigInt512.fromBigInt(8n);
      const b = BigInt512.fromBigInt(8n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt512 numbers with one being zero', () => {
      const a = BigInt512.fromBigInt(0n);
      const b = BigInt512.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt512 numbers with one being the modulus', () => {
      const a = BigInt512.fromBigInt(modulus);
      const b = BigInt512.fromBigInt(0n);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.equals(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt512 numbers properly', () => {
      const a = BigInt512.Unsafe.fromFields([
        new Field(1),
        new Field(3),
        new Field(3),
        new Field(1),
        new Field(0),
      ]);
      const b = BigInt512.Unsafe.fromFields([
        new Field(1),
        new Field(2),
        new Field(4),
        new Field(1),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
    });

    it('should correctly compare BigInt512 numbers properly', () => {
      const a = BigInt512.Unsafe.fromFields([
        new Field(1),
        new Field(0),
        new Field(4),
        new Field(7),
        new Field(0),
      ]);
      const b = BigInt512.Unsafe.fromFields([
        new Field(1),
        new Field(18446744073709551615n),
        new Field(1),
        new Field(5),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(true);
    });

    it('should correctly compare BigInt512 numbers properly', () => {
      const a = BigInt512.Unsafe.fromFields([
        new Field(18446744073709551615n),
        new Field(1),
        new Field(1),
        new Field(0),
        new Field(0),
      ]);
      const b = BigInt512.Unsafe.fromFields([
        new Field(1),
        new Field(1),
        new Field(2),
        new Field(0),
        new Field(0),
      ]);
      expect(a.equals(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThan(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThanOrEqual(b).toBoolean()).toStrictEqual(false);
      expect(a.lessThanOrEqual(b).toBoolean()).toStrictEqual(true);
      expect(a.greaterThan(b).toBoolean()).toStrictEqual(false);
    });
  });
});

function modularExponentiation(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  base = base % modulus;

  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    exponent = exponent >> 1n; // Divide exponent by 2
    base = (base * base) % modulus;
  }

  return result;
}

function modularInverse(a: bigint, modulus: bigint): bigint {
  let m0 = modulus;
  let y = 0n;
  let x = 1n;

  if (modulus === 1n) {
    return 0n;
  }

  while (a > 1n) {
    // q is quotient
    const q = a / modulus;
    let t = modulus;

    // m is remainder now, process same as Euclid's algo
    modulus = a % modulus;
    a = t;
    t = y;

    // Update x and y
    y = x - q * y;
    x = t;
  }

  // Make x positive
  if (x < 0n) {
    x += m0;
  }

  return x;
}
