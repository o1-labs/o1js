import { Bool } from './bool.js';
import { Field } from './field.js';
import { Provable } from './provable.js';
import { ProvablePureExtended, Struct } from './types/struct.js';
import { Gadgets } from './gadgets/gadgets.js';
import { assert } from './gadgets/common.js';
import { provableFromClass } from './types/provable-derivers.js';
import { Unconstrained } from './types/unconstrained.js';

export { createProvableBigInt, ProvableBigInt };

type BigIntParameter = {
  limb_num: number;
  limb_size: bigint;
  mask: bigint;
  MAX: bigint;
};

const BigIntParams: { [key: string]: BigIntParameter } = {
  348: {
    limb_num: 3,
    limb_size: 116n,
    mask: (1n << 116n) - 1n,
    MAX: (1n << 348n) - 1n,
  },
  464: {
    limb_num: 4,
    limb_size: 116n,
    mask: (1n << 116n) - 1n,
    MAX: (1n << 464n) - 1n,
  },
  580: {
    limb_num: 5,
    limb_size: 116n,
    mask: (1n << 116n) - 1n,
    MAX: (1n << 580n) - 1n,
  },
  1044: {
    limb_num: 9,
    limb_size: 116n,
    mask: (1n << 116n) - 1n,
    MAX: (1n << 1044n) - 1n,
  },
  2088: {
    limb_num: 18,
    limb_size: 116n,
    mask: (1n << 116n) - 1n,
    MAX: (1n << 2088n) - 1n,
  },
  4176: {
    limb_num: 36,
    limb_size: 116n,
    mask: (1n << 116n) - 1n,
    MAX: (1n << 4176n) - 1n,
  },
};

/**
 * Creates a class representing a ProvableBigInt with modular arithmetic capabilities.
 * This is particularly useful for implementing prime fields that doesn't fit into the native field.
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
 * - Conversion methods: fromBigInt, toBigint, fromFields, toFields, fromBits, toBits
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
 * Example usage:
 * ```ts
 * // Create a big integer type with modulus 2^521 - 1
 * const BigInt521 = createProvableBigInt(2n ** 521n - 1n);
 *
 * // Create instances
 * const a = BigInt521.fromBigint(123n);
 * const b = BigInt521.fromBigint(456n);
 * const c = BigInt521.fromBigint(1024n);
 *
 * // Perform operations
 * const sum = a.add(b);
 * const double = a.add(b);
 * const diff = a.sub(b);
 * const product = a.mul(b);
 * const square = a.square();
 * const quotient = a.div(b);
 * const inverse = a.inverse();
 * const negation = a.negate();
 * const power = a.pow(b);
 * const sqrt = c.sqrt();
 *
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
function createProvableBigInt(modulus: bigint, config?: BigIntParameter) {
  const config_ = config ?? findConfig(modulus);
  assert(modulus !== 0n, `ProvableBigInt: modulus must be non-zero, got ${modulus}`);
  assert(modulus > 0n, `ProvableBigInt: modulus must be positive, got ${modulus}`);
  assert(
    modulus < config_.MAX,
    `ProvableBigInt: modulus exceeds the max supported size of 2^${config_.MAX}`
  );
  let fields = [];
  let x = modulus;
  if (x < 0n) {
    throw new Error('Modulus must be non-negative.');
  }
  if (x > config_.MAX) {
    throw new Error(
      `Modulus exceeds ${config_.limb_num * Number(config_.limb_size)}-bit size limit.`
    );
  }

  for (let i = 0; i < config_.limb_num; i++) {
    fields.push(Field.from(x & config_.mask)); // fields[i] = x & mask
    x >>= config_.limb_size; // x = x >> limb_size
  }

  class ProvableBigInt_ extends ProvableBigInt<ProvableBigInt_> {
    constructor(fields: Field[], value: Unconstrained<bigint>) {
      super(fields, Unconstrained.from(value));
    }

    static {
      this._modulus = new ProvableBigInt_(fields, Unconstrained.from(modulus));
      this._config = config_;
      this._provable = provableFromClass(ProvableBigInt_, {
        fields: Provable.Array(Field, config_.limb_num),
      });
    }

    /**
     * Returns a ProvableBigInt representing zero
     * @returns A ProvableBigInt representing zero
     */
    static zero(): ProvableBigInt_ {
      return ProvableBigInt_.fromBigint(0n);
    }

    /**
     * Returns a ProvableBigInt representing one
     * @returns A ProvableBigInt representing one
     */
    static one(): ProvableBigInt_ {
      return ProvableBigInt_.fromBigint(1n);
    }

    static fromBigint(x: bigint): ProvableBigInt_ {
      let fields = [];
      let value = x;
      // SHOULD WE ACCEPT UNREDUCED INPUTS?
      if (value < 0n) {
        //throw new Error('Input must be non-negative.');
        value = ((x % modulus) + modulus) % modulus;
      }
      if (value > ProvableBigInt_.config.MAX) {
        throw new Error(
          `Input exceeds ${
            ProvableBigInt_.config.limb_num * Number(ProvableBigInt_.config.limb_size)
          }-bit size limit.`
        );
      }
      if (value >= ProvableBigInt_.modulus.toBigint()) {
        throw new Error(`Input exceeds modulus.`);
      }
      for (let i = 0; i < ProvableBigInt_.config.limb_num; i++) {
        fields.push(Field.from(value & ProvableBigInt_.config.mask)); // fields[i] = x & 2^64 - 1
        value >>= ProvableBigInt_.config.limb_size; // x = x >> limb_size
      }
      return new ProvableBigInt_(fields, Unconstrained.from(value));
    }

    get Constructor() {
      return this.constructor as typeof ProvableBigInt;
    }

    toBigint(): bigint {
      let result = 0n;
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        result |= this.fields[i].toBigInt() << (this.Constructor.config.limb_size * BigInt(i)); // result = result | fields[i] << 64 * i
      }
      return result;
    }

    toFields(): Field[] {
      return this.fields.slice(0, this.Constructor.config.limb_num);
    }

    static fromFields(fields: Field[]): ProvableBigInt_ {
      let value = 0n;
      for (let i = 0; i < ProvableBigInt_.config.limb_num; i++) {
        value |= BigInt(fields[i].toBigInt()) << (ProvableBigInt_.config.limb_size * BigInt(i));
      }
      return new ProvableBigInt_(fields, Unconstrained.from(value));
    }

    toBits(): Bool[] {
      // Calculate total needed bits based on modulus
      const totalBits = this.Constructor.modulus.toBigint().toString(2).length;
      const limbBits = Number(this.Constructor.config.limb_size);

      // Convert each field to bits with proper size
      let allBits = this.fields.flatMap((field, index) => {
        const bits = field.toBits();
        // For all limbs except the last one, ensure proper bit length
        if (index < this.Constructor.config.limb_num - 1) {
          while (bits.length < limbBits) {
            bits.push(new Bool(false));
          }
          return bits.slice(0, limbBits);
        }
        // For the last limb, only include significant bits
        return bits.slice(0, totalBits - index * limbBits);
      });

      // Ensure the total length doesn't exceed what's needed
      return allBits.slice(0, totalBits);
    }

    static fromBits(bits: Bool[]): ProvableBigInt_ {
      let value = 0n;
      for (let i = 0; i < bits.length; i++) {
        if (bits[i].toBoolean()) {
          value |= 1n << BigInt(i);
        }
      }
      return ProvableBigInt_.fromBigint(value);
    }

    clone(): ProvableBigInt_ {
      return new ProvableBigInt_(this.fields, this.value);
    }

    /**
     * Adds two ProvableBigInt instances
     * @param a The ProvableBigInt to add
     * @returns The sum as a ProvableBigInt
     */
    add(a: ProvableBigInt_, isDouble = false) {
      if (isDouble) a = this;
      // witness q, r so that x+y = q*p + r
      let { q, r } = Provable.witness(Struct({ q: ProvableBigInt_, r: ProvableBigInt_ }), () => {
        let xPlusY = this.toBigint() + a.toBigint();
        let p0 = this.Constructor.modulus.toBigint();
        let q = xPlusY / p0;
        let r = xPlusY - q * p0;
        return {
          q: ProvableBigInt_.fromBigint(q),
          r: ProvableBigInt_.fromBigint(r),
        };
      });

      let delta: Field[] = Array.from({ length: this.Constructor.config.limb_num }, () =>
        Field.from(0)
      );
      let [X, Y, Q, R, P] = [
        this.fields,
        a.fields,
        q.fields,
        r.fields,
        this.Constructor.modulus.fields,
      ];

      // compute X + Y limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        if (isDouble) delta[i] = X[i].mul(2);
        else delta[i] = X[i].add(Y[i]);
      }

      // subtract q*p limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        for (let j = 0; j < this.Constructor.config.limb_num; j++) {
          if (i + j < this.Constructor.config.limb_num) {
            delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
          }
        }
      }

      // subtract r limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        delta[i] = delta[i].sub(R[i]).seal();
      }

      let carry = Field.from(0);

      for (let i = 0; i < this.Constructor.config.limb_num - 1; i++) {
        let deltaPlusCarry = delta[i].add(carry).seal();

        carry = Provable.witness(Field, () => deltaPlusCarry.div(1n << 116n));
        rangeCheck(carry, 128, true);

        // ensure that after adding the carry, the limb is a multiple of 2^116
        deltaPlusCarry.assertEquals(carry.mul(1n << this.Constructor.config.limb_size));
      }

      // the final limb plus carry should be zero to assert correctness
      delta[this.Constructor.config.limb_num - 1].add(carry).assertEquals(0n);

      return r;
    }

    double(): ProvableBigInt_ {
      return this.add(this, true);
    }

    /**
     * Subtracts one ProvableBigInt from another
     * @param a The ProvableBigInt to substract
     * @returns The difference as a ProvableBigInt
     */
    sub(a: ProvableBigInt_) {
      // witness q, r so that this-a = q*p + r
      let { q, r } = Provable.witness(Struct({ q: ProvableBigInt_, r: ProvableBigInt_ }), () => {
        let diff = this.toBigint() - a.toBigint();
        let p0 = this.Constructor.modulus.toBigint();
        let q = diff / p0;
        let r = diff - q * p0;
        return {
          q: ProvableBigInt_.fromBigint(q),
          r: ProvableBigInt_.fromBigint(r),
        };
      });

      let delta: Field[] = Array.from({ length: this.Constructor.config.limb_num }, () =>
        Field.from(0)
      );
      let [X, Y, Q, R, P] = [
        this.fields,
        a.fields,
        q.fields,
        r.fields,
        this.Constructor.modulus.fields,
      ];

      // compute X - Y limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        delta[i] = X[i].sub(Y[i]);
      }

      // subtract q*p limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        for (let j = 0; j < this.Constructor.config.limb_num; j++) {
          if (i + j < this.Constructor.config.limb_num) {
            delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
          }
        }
      }

      // subtract r limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        delta[i] = delta[i].sub(R[i]).seal();
      }

      let carry = Field.from(0);

      for (let i = 0; i < this.Constructor.config.limb_num - 1; i++) {
        let deltaPlusCarry = delta[i].add(carry).seal();

        carry = Provable.witness(Field, () =>
          deltaPlusCarry.div(1n << this.Constructor.config.limb_size)
        );
        rangeCheck(carry, 128, true);

        // ensure that after adding the carry, the limb is a multiple of 2^limb_size
        deltaPlusCarry.assertEquals(carry.mul(1n << this.Constructor.config.limb_size));
      }
      // the final limb plus carry should be zero to assert correctness
      delta[this.Constructor.config.limb_num - 1].add(carry).assertEquals(0n);

      return r;
    }

    /**
     * Multiplies two ProvableBigInt instances
     * @param a The ProvableBigInt to multiply
     * @returns The product as a ProvableBigInt
     */
    mul(a: ProvableBigInt_, isSquare = false): ProvableBigInt_ {
      if (isSquare) a = this;

      let { q, r } = Provable.witness(Struct({ q: ProvableBigInt_, r: ProvableBigInt_ }), () => {
        let xy = this.toBigint() * a.toBigint();
        let p0 = this.Constructor.modulus.toBigint();
        let q = xy / p0;
        let r = xy - q * p0;
        return {
          q: ProvableBigInt_.fromBigint(q),
          r: ProvableBigInt_.fromBigint(r),
        };
      });

      let delta: Field[] = Array.from(
        { length: 2 * this.Constructor.config.limb_num - 1 },
        () => new Field(0)
      );
      let [X, Y, Q, R, P] = [
        this.fields,
        a.fields,
        q.fields,
        r.fields,
        this.Constructor.modulus.fields,
      ];

      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        if (isSquare) {
          for (let j = 0; j < i; j++) {
            delta[i + j] = delta[i + j].add(X[i].mul(X[j]).mul(2n));
          }
          delta[2 * i] = delta[2 * i].add(X[i].mul(X[i]));
        } else {
          for (let j = 0; j < this.Constructor.config.limb_num; j++) {
            delta[i + j] = delta[i + j].add(X[i].mul(Y[j]));
          }
        }

        for (let j = 0; j < this.Constructor.config.limb_num; j++) {
          delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
        }

        delta[i] = delta[i].sub(R[i]).seal();
      }

      let carry = new Field(0);

      for (let i = 0; i < 2 * this.Constructor.config.limb_num - 2; i++) {
        let deltaPlusCarry = delta[i].add(carry).seal();

        carry = Provable.witness(Field, () =>
          deltaPlusCarry.div(1n << BigInt(this.Constructor.config.limb_size))
        );
        rangeCheck(carry, 128, true);

        deltaPlusCarry.assertEquals(carry.mul(1n << BigInt(this.Constructor.config.limb_size)));
      }

      delta[2 * this.Constructor.config.limb_num - 2].add(carry).assertEquals(0n);

      return r;
    }

    /**
     * Computes the square root of a ProvableBigInt
     * @returns The square root as a ProvableBigInt
     */
    square(): ProvableBigInt_ {
      return this.mul(this, true);
    }

    /**
     * Divides one ProvableBigInt by another.
     * @param a The divisor as a ProvableBigInt
     * @returns The quotient as ProvableBigInt
     */
    div(a: ProvableBigInt_) {
      const inv_a = a.inverse();

      let res = this.mul(inv_a);

      return res;
    }

    /**
     * Computes the modular inverse of a ProvableBigInt
     * @returns The inverse as a ProvableBigInt
     */
    inverse(): ProvableBigInt_ {
      let { res } = Provable.witness(
        Struct({ res: ProvableBigInt_ as typeof ProvableBigInt }),
        () => {
          const p = this.Constructor.modulus.toBigint();
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

          return { res: ProvableBigInt_.fromBigint(t) };
        }
      );

      res.mul(this).assertEquals(ProvableBigInt_.one());

      return res;
    }

    /**
     * Computes the additive inverse of a ProvableBigInt
     * @returns The additive inverse as a ProvableBigInt
     * @summary x + x' = 0 mod p. For all x except 0, inverse of a is equal to (p - a) mod p. Inverse of 0 is 0 itself.
     */
    negate(): ProvableBigInt_ {
      // If a is zero, return zero. Otherwise, return the result of subtracting a from the modulus.
      return Provable.if(
        this.equals(ProvableBigInt_.zero()),
        ProvableBigInt_,
        ProvableBigInt_.zero(),
        this.Constructor.modulus.sub(this)
      );
    }

    /**
     * Computes the power of a ProvableBigInt raised to an exponent
     * @param exp The exponent
     * @returns The result as a ProvableBigInt
     */
    pow(exp: ProvableBigInt_): ProvableBigInt_ {
      let { r } = Provable.witness(Struct({ r: ProvableBigInt_ as typeof ProvableBigInt }), () => {
        const modulo = this.Constructor.modulus.toBigint();
        const b = this.toBigint();
        const x = exp.toBigint();
        const res = b ** x % modulo;
        return { r: ProvableBigInt_.fromBigint(res) };
      });

      const exponentBits = exp.toBits();
      const processChunk = function* (bits: Bool[], chunkSize: number) {
        for (let i = 0; i < bits.length; i += chunkSize) {
          yield bits.slice(i, i + chunkSize);
        }
      };

      let result = ProvableBigInt_.one();
      let base = this.clone();

      for (const chunk of processChunk(exponentBits, 100)) {
        for (const bit of chunk) {
          result = Provable.if(bit, ProvableBigInt_, result.mul(base), result);
          base = base.mul(base);
        }
      }

      result.assertEquals(r);
      return r;
    }

    /**
     * Computes the square root of a Provable BigInt
     * @returns The square root as a ProvableBigInt
     */
    sqrt(): ProvableBigInt_ {
      let r = Provable.witness(ProvableBigInt_, () => {
        const p = this.Constructor.modulus.toBigint();
        // Special cases
        // Case 1: If input is 0, square root is 0
        if (this.toBigint() === 0n) return ProvableBigInt_.fromBigint(0n);

        // Case 2: If p ≡ 3 (mod 4), we can use a simpler formula
        // In this case, the square root is a^((p+1)/4) mod p
        if (p % 4n === 3n) {
          const pplusonedivfour = (p + 1n) / 4n;
          const pplusonedivfour_reduced = pplusonedivfour % p;
          const sqrt = modularExponentiation(this.toBigint(), pplusonedivfour_reduced, p);
          return ProvableBigInt_.fromBigint(sqrt);
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
            throw new Error(
              'Tonelli-Shanks algorithm failed to find a solution. Make sure modulo is prime!'
            );
          }

          // Update variables for next iteration
          const b = c ** (2n ** (M - i - 1n)) % p;
          M = i;
          c = b ** 2n % p;
          t = (t * c) % p;
          R = (R * b) % p;
        }

        return ProvableBigInt_.fromBigint(R);
      });

      r.square().assertEquals(this);

      return r;
    }

    mod() {
      // witness q, r so that this = q*p + r
      let { q, r } = Provable.witness(Struct({ q: ProvableBigInt_, r: ProvableBigInt_ }), () => {
        let this_big = this.toBigint();
        let p0 = this.Constructor.modulus.toBigint();
        let q = this_big / p0;
        let r = this_big - q * p0;
        return {
          q: ProvableBigInt_.fromBigint(q),
          r: ProvableBigInt_.fromBigint(r),
        };
      });

      let [X, Q, R, P] = [this.fields, q.fields, r.fields, this.Constructor.modulus.fields];
      let delta: Field[] = X;

      // subtract q*p limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        for (let j = 0; j < this.Constructor.config.limb_num; j++) {
          if (i + j < this.Constructor.config.limb_num) {
            delta[i + j] = delta[i + j].sub(Q[i].mul(P[j]));
          }
        }
      }

      // subtract r limb-by-limb
      for (let i = 0; i < this.Constructor.config.limb_num; i++) {
        delta[i] = delta[i].sub(R[i]).seal();
      }

      let carry = Field.from(0);

      for (let i = 0; i < this.Constructor.config.limb_num - 1; i++) {
        let deltaPlusCarry = delta[i].add(carry).seal();

        carry = Provable.witness(Field, () =>
          deltaPlusCarry.div(1n << this.Constructor.config.limb_size)
        );
        rangeCheck(carry, 128, true);

        deltaPlusCarry.assertEquals(carry.mul(1n << this.Constructor.config.limb_size));
      }

      delta[this.Constructor.config.limb_num - 1].add(carry).assertEquals(0n);

      return r;
    }

    /**
     * Checks if one ProvableBigInt is greater than another
     * @param a The ProvableBigInt to compare
     * @returns A Bool indicating if a is greater than b
     */
    greaterThan(a: ProvableBigInt_): Bool {
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
     * @param a The ProvableBigInt to compare
     * @returns A Bool indicating if a is greater than or equal to b
     */
    greaterThanOrEqual(a: ProvableBigInt_): Bool {
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
     * @param a The ProvableBigInt to compare
     * @returns A Bool indicating if a is less than b
     */
    lessThan(a: ProvableBigInt_): Bool {
      return this.fields
        .map((field, i) => ({
          isLess: field.lessThan(a.fields[i]),
          isEqual: field.equals(a.fields[i]),
        }))
        .reduce((result, { isLess, isEqual }) => isLess.or(result.and(isEqual)), new Bool(false));
    }

    /**
     * Checks if one ProvableBigInt is less than or equal to another
     * @param a The ProvableBigInt to compare
     * @returns A Bool indicating if a is less than or equal to b
     */
    lessThanOrEqual(a: ProvableBigInt_): Bool {
      return this.fields
        .map((field, i) => ({
          isLess: field.lessThan(a.fields[i]),
          isEqual: field.equals(a.fields[i]),
        }))
        .reduce((result, { isLess, isEqual }) => isLess.or(result.and(isEqual)), new Bool(false))
        .or(this.equals(a));
    }

    /**
     * Checks if one ProvableBigInt is equal to another
     * @param a The ProvableBigInt to compare
     * @returns A Bool indicating if a is equal to b
     */
    equals(a: ProvableBigInt_): Bool {
      return this.fields
        .map((field, i) => field.equals(a.fields[i]))
        .reduce((result, isEqual) => result.and(isEqual), new Bool(true));
    }

    /**
     * Checks if one ProvableBigInt is less than or equal to another
     * @param a The ProvableBigInt to compare
     * @returns A Bool indicating if a is less than or equal to b
     */
    assertEquals(a: ProvableBigInt_) {
      this.equals(a).assertTrue('ProvableBigInts are not equal');
    }
  }
  return ProvableBigInt_;
}

abstract class ProvableBigInt<T extends ProvableBigInt<T>> {
  fields: Field[];
  value: Unconstrained<bigint>;

  static _provable?: ProvablePureExtended<
    ProvableBigInt<ProvableBigInt<any>>,
    { fields: bigint[] },
    { fields: string[] }
  >;

  static get provable() {
    assert(this._provable !== undefined, 'ProvableBigInt not initialized');
    return this._provable;
  }

  public static _modulus?: ProvableBigInt<any>;
  public static _config?: BigIntParameter;

  static get modulus(): ProvableBigInt<any> {
    assert(this._modulus !== undefined, 'Modulus not initialized');
    return this._modulus;
  }

  static get config(): BigIntParameter {
    assert(this._config !== undefined, 'Config not initialized');
    return this._config;
  }

  constructor(fields: Field[], value: Unconstrained<bigint>) {
    this.fields = fields;
    this.value = Unconstrained.from(value);
  }

  abstract get Constructor(): typeof ProvableBigInt;
  abstract toBigint(): bigint;
  abstract toFields(): Field[];
  abstract toBits(): Bool[];
  abstract clone(): T;
  abstract add(a: T, isDouble?: boolean): T;
  abstract double(): T;
  abstract sub(a: T): T;
  abstract mul(a: T, isSquare?: boolean): T;
  abstract square(): T;
  abstract div(a: T): T;
  abstract inverse(): T;
  abstract negate(): T;
  abstract pow(exp: T): T;
  abstract sqrt(): T;
  abstract mod(): T;
  abstract greaterThan(a: T): Bool;
  abstract greaterThanOrEqual(a: T): Bool;
  abstract lessThan(a: T): Bool;
  abstract lessThanOrEqual(a: T): Bool;
  abstract equals(a: T): Bool;
  abstract assertEquals(a: T): void;
}

function rangeCheck(x: Field, bits: number, signed?: boolean) {
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
      if (signed) rangeCheck128Signed(x);
      break;
  }
}

function rangeCheck48(x: Field) {
  let [x0, x1] = Provable.witnessFields(2, () => [
    x.toBigInt() & ((1n << 32n) - 1n),
    x.toBigInt() >> 32n,
  ]);

  Gadgets.rangeCheck32(x0); // 32 bits
  Gadgets.rangeCheck16(x1); // 16 bits
  x0.add(x1.mul(1n << 32n)).assertEquals(x); // 48 bits
}

function rangeCheck116(x: Field) {
  let [x0, x1] = Provable.witnessFields(2, () => [
    x.toBigInt() & ((1n << 64n) - 1n),
    x.toBigInt() >> 64n,
  ]);

  Gadgets.rangeCheck64(x0); // 64 bits
  let [x52] = Gadgets.rangeCheck64(x1);
  x52.assertEquals(0n); // 52 bits
  x0.add(x1.mul(1n << 64n)).assertEquals(x);
}

function rangeCheck128Signed(xSigned: Field) {
  let x = xSigned.add(1n << 127n);

  let [x0, x1] = Provable.witnessFields(2, () => {
    const x0 = x.toBigInt() & ((1n << 64n) - 1n);
    const x1 = x.toBigInt() >> 64n;
    return [x0, x1];
  });

  Gadgets.rangeCheck64(x0);
  Gadgets.rangeCheck64(x1);

  x0.add(x1.mul(1n << 64n)).assertEquals(x);
}

function findConfig(modulus: bigint): BigIntParameter {
  const BigIntParamList: string[] = Object.keys(BigIntParams);
  const filteredParams = BigIntParamList.filter((param) => BigIntParams[param].MAX >= modulus);
  if (filteredParams.length === 0) {
    throw new Error(
      `No configuration found for modulus ${modulus}. It exceeds the maximum supported size.`
    );
  }
  const index = filteredParams.reduce((maxParam, currentParam) => {
    return BigIntParams[currentParam].MAX > BigIntParams[maxParam].MAX ? currentParam : maxParam;
  }, filteredParams[0]);

  return BigIntParams[index];
}

function modularExponentiation(base: bigint, exponent: bigint, modulus: bigint): bigint {
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
