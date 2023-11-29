import { ProvablePure } from '../snarky.js';
import { mod, Fp } from '../bindings/crypto/finite_field.js';
import { Field, FieldVar, checkBitLength, withMessage } from './field.js';
import { Provable } from './provable.js';
import { Bool } from './bool.js';
import { Tuple, TupleN } from './util/types.js';
import { Field3 } from './gadgets/foreign-field.js';
import { Gadgets } from './gadgets/gadgets.js';

// external API
export { createForeignField, ForeignField };

// internal API
export { limbBits };

const limbBits = 88n;

type ForeignField = InstanceType<ReturnType<typeof createForeignField>>;

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
 * _Advanced usage:_
 *
 * Internally, a foreign field element is represented as three native field elements, each of which
 * represents a limb of 88 bits. Therefore, being a valid foreign field element means that all 3 limbs
 * fit in 88 bits, and the foreign field element altogether is smaller than the modulus p.
 * With default parameters, new `ForeignField` elements introduced in provable code are automatically
 * constrained to be valid on creation.
 *
 * However, optimized code may want to forgo these automatic checks because in some
 * situations they are redundant. Skipping automatic validity checks can be done
 * by passing the `unsafe: true` flag:
 *
 * ```ts
 * class UnsafeField extends createForeignField(17n, { unsafe: true }) {}
 * ```
 *
 * You then often need to manually add validity checks:
 * ```ts
 * let x: UnsafeField;
 * x.assertValidElement(); // prove that x is a valid foreign field element
 * ```
 *
 * @param modulus the modulus of the finite field you are instantiating
 * @param options
 * - `unsafe: boolean` determines whether `ForeignField` elements are constrained to be valid on creation.
 */
function createForeignField(modulus: bigint, { unsafe = false } = {}) {
  const p = modulus;

  if (p <= 0) {
    throw Error(`ForeignField: expected modulus to be positive, got ${p}`);
  }
  if (p > foreignFieldMax) {
    throw Error(
      `ForeignField: modulus exceeds the max supported size of 2^${foreignFieldMaxBits}`
    );
  }

  let sizeInBits = p.toString(2).length;

  class ForeignField {
    static modulus = p;
    value: Field3;

    static #zero = new ForeignField(0);

    /**
     * Create a new {@link ForeignField} from a bigint, number, string or another ForeignField.
     * @example
     * ```ts
     * let x = new ForeignField(5);
     * ```
     */
    constructor(x: ForeignField | Field3 | bigint | number | string) {
      if (x instanceof ForeignField) {
        this.value = x.value;
        return;
      }
      // ForeignFieldVar
      if (Array.isArray(x)) {
        this.value = x;
        return;
      }
      // constant
      this.value = Field3.from(mod(BigInt(x), p));
    }

    /**
     * Coerce the input to a {@link ForeignField}.
     */
    static from(x: ForeignField | Field3 | bigint | number | string) {
      if (x instanceof ForeignField) return x;
      return new ForeignField(x);
    }

    /**
     * Checks whether this field element is a constant.
     *
     * See {@link FieldVar} to understand constants vs variables.
     */
    isConstant() {
      return Field3.isConstant(this.value);
    }

    /**
     * Convert this field element to a constant.
     *
     * See {@link FieldVar} to understand constants vs variables.
     *
     * **Warning**: This function is only useful in {@link Provable.witness} or {@link Provable.asProver} blocks,
     * that is, in situations where the prover computes a value outside provable code.
     */
    toConstant(): ForeignField {
      let constantLimbs = Tuple.map(this.value, (l) => l.toConstant());
      return new ForeignField(constantLimbs);
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
     * Note: this does not ensure that the field elements is in the canonical range [0, p).
     * To assert that stronger property, use {@link ForeignField.assertCanonicalFieldElement}.
     *
     * We use the weaker property by default because it is cheaper to prove and sufficient for
     * ensuring validity of all our non-native field arithmetic methods.
     */
    assertAlmostFieldElement() {
      if (this.isConstant()) return;
      // TODO
      throw Error('unimplemented');
    }

    /**
     * Assert that this field element lies in the range [0, p),
     * where p is the foreign field modulus.
     */
    assertCanonicalFieldElement() {
      if (this.isConstant()) return;
      // TODO
      throw Error('unimplemented');
    }

    // arithmetic with full constraints, for safe use

    /**
     * Finite field addition
     * @example
     * ```ts
     * x.add(2); // x + 2 mod p
     * ```
     */
    add(y: ForeignField | bigint | number) {
      return ForeignField.sum([this, y], [1]);
    }

    /**
     * Finite field negation
     * @example
     * ```ts
     * x.neg(); // -x mod p = p - x
     * ```
     */
    neg() {
      return ForeignField.sum([ForeignField.#zero, this], [-1]);
    }

    /**
     * Finite field subtraction
     * @example
     * ```ts
     * x.sub(1); // x - 1 mod p
     * ```
     */
    sub(y: ForeignField | bigint | number) {
      return ForeignField.sum([this, y], [-1]);
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
    static sum(xs: (ForeignField | bigint | number)[], operations: (1 | -1)[]) {
      let fields = xs.map(toLimbs);
      let ops = operations.map((op) => (op === 1 ? 1n : -1n));
      let z = Gadgets.ForeignField.sum(fields, ops, p);
      return new ForeignField(z);
    }

    /**
     * Finite field multiplication
     * @example
     * ```ts
     * x.mul(y); // x*y mod p
     * ```
     */
    mul(y: ForeignField | bigint | number) {
      let z = Gadgets.ForeignField.mul(this.value, toLimbs(y), p);
      return new ForeignField(z);
    }

    /**
     * Multiplicative inverse in the finite field
     * @example
     * ```ts
     * let z = x.inv(); // 1/x mod p
     * z.mul(x).assertEquals(1);
     * ```
     */
    inv(): ForeignField {
      let z = Gadgets.ForeignField.inv(this.value, p);
      return new ForeignField(z);
    }

    // convenience methods

    /**
     * Assert equality with a ForeignField-like value
     * @example
     * ```ts
     * x.assertEquals(0, "x is zero");
     * ```
     */
    assertEquals(y: ForeignField | bigint | number, message?: string) {
      try {
        if (this.isConstant() && isConstant(y)) {
          let x = this.toBigInt();
          let y0 = toFp(y);
          if (x !== y0) {
            throw Error(`ForeignField.assertEquals(): ${x} != ${y0}`);
          }
        }
        return Provable.assertEqual(
          ForeignField.provable,
          this,
          ForeignField.from(y)
        );
      } catch (err) {
        throw withMessage(err, message);
      }
    }

    /**
     * Check equality with a ForeignField-like value
     * @example
     * ```ts
     * let isXZero = x.equals(0);
     * ```
     */
    equals(y: ForeignField | bigint | number) {
      if (this.isConstant() && isConstant(y)) {
        return new Bool(this.toBigInt() === toFp(y));
      }
      return Provable.equal(ForeignField.provable, this, ForeignField.from(y));
    }

    // bit packing

    /**
     * Unpack a field element to its bits, as a {@link Bool}[] array.
     *
     * This method is provable!
     */
    toBits(length = sizeInBits) {
      checkBitLength('ForeignField.toBits()', length, sizeInBits);
      let [l0, l1, l2] = this.value;
      let limbSize = Number(limbBits);
      let xBits = l0.toBits(Math.min(length, limbSize));
      length -= limbSize;
      if (length <= 0) return xBits;
      let yBits = l1.toBits(Math.min(length, limbSize));
      length -= limbSize;
      if (length <= 0) return [...xBits, ...yBits];
      let zBits = l2.toBits(Math.min(length, limbSize));
      return [...xBits, ...yBits, ...zBits];
    }

    /**
     * Create a field element from its bits, as a `Bool[]` array.
     *
     * This method is provable!
     */
    static fromBits(bits: Bool[]) {
      let length = bits.length;
      checkBitLength('ForeignField.fromBits()', length, sizeInBits);
      let limbSize = Number(limbBits);
      let l0 = Field.fromBits(bits.slice(0 * limbSize, 1 * limbSize));
      let l1 = Field.fromBits(bits.slice(1 * limbSize, 2 * limbSize));
      let l2 = Field.fromBits(bits.slice(2 * limbSize, 3 * limbSize));
      // note: due to the check on the number of bits, we know we return an "almost valid" field element
      return ForeignField.from([l0, l1, l2]);
    }

    // Provable<ForeignField>

    /**
     * `Provable<ForeignField>`, see {@link Provable}
     */
    static provable: ProvablePure<ForeignField> = {
      toFields(x) {
        return x.value;
      },
      toAuxiliary(): [] {
        return [];
      },
      sizeInFields() {
        return 3;
      },
      fromFields(fields) {
        let limbs = TupleN.fromArray(3, fields);
        return new ForeignField(limbs);
      },
      /**
       * This performs the check in {@link ForeignField.assertAlmostFieldElement}.
       */
      check(x: ForeignField) {
        x.assertAlmostFieldElement();
      },
    };

    /**
     * Instance version of `Provable<ForeignField>.toFields`, see {@link Provable.toFields}
     */
    toFields(): Field[] {
      return this.value;
    }
  }

  function toFp(x: bigint | string | number | ForeignField) {
    if (x instanceof ForeignField) return x.toBigInt();
    return mod(BigInt(x), p);
  }
  function toLimbs(x: bigint | number | string | ForeignField): Field3 {
    if (x instanceof ForeignField) return x.value;
    return Field3.from(mod(BigInt(x), p));
  }
  function isConstant(x: bigint | number | string | ForeignField) {
    if (x instanceof ForeignField) return x.isConstant();
    return true;
  }

  return ForeignField;
}

// the max foreign field modulus is f_max = floor(sqrt(p * 2^t)), where t = 3*limbBits = 264 and p is the native modulus
// see RFC: https://github.com/o1-labs/proof-systems/blob/1fdb1fd1d112f9d4ee095dbb31f008deeb8150b0/book/src/rfcs/foreign_field_mul.md
// since p = 2^254 + eps for both Pasta fields with eps small, a fairly tight lower bound is
// f_max >= sqrt(2^254 * 2^264) = 2^259
const foreignFieldMaxBits = (BigInt(Fp.sizeInBits - 1) + 3n * limbBits) / 2n;
const foreignFieldMax = 1n << foreignFieldMaxBits;
