import { Snarky } from '../snarky.js';
import { mod, inverse, Fp } from '../bindings/crypto/finite_field.js';
import { Tuple } from '../bindings/lib/binable.js';
import {
  Field,
  FieldVar,
  checkBitLength,
  withMessage,
} from './field.js';
import { Provable } from './provable.js';
import { Bool } from './bool.js';
import { MlArray, MlTuple } from './ml/base.js';
import { FieldBn254 } from './field_bn254.js';
import { ForeignFieldConst, ForeignFieldVar } from './foreign-field.js';
import { BoolBn254 } from './bool_bn254.js';

// external API
export { createForeignFieldBn254, ForeignFieldBn254 };

const limbBits = 88n;

type ForeignFieldBn254 = InstanceType<ReturnType<typeof createForeignFieldBn254>>;

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
 * The returned {@link ForeignFieldBn254} class supports arithmetic modulo `p` (addition and multiplication),
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
function createForeignFieldBn254(modulus: bigint, { unsafe = false } = {}) {
  const p = modulus;
  const pMl = ForeignFieldConst.fromBigint(p);

  if (p <= 0) {
    throw Error(`ForeignField: expected modulus to be positive, got ${p}`);
  }
  if (p > foreignFieldMax) {
    throw Error(
      `ForeignField: modulus exceeds the max supported size of 2^${foreignFieldMaxBits}`
    );
  }

  let sizeInBits = p.toString(2).length;

  class ForeignFieldBn254 {
    static modulus = p;
    value: ForeignFieldVar;

    static #zero = new ForeignFieldBn254(0);

    /**
     * Create a new {@link ForeignFieldBn254} from a bigint, number, string or another ForeignField.
     * @example
     * ```ts
     * let x = new ForeignField(5);
     * ```
     */
    constructor(x: ForeignFieldBn254 | ForeignFieldVar | bigint | number | string) {
      if (x instanceof ForeignFieldBn254) {
        this.value = x.value;
        return;
      }
      // ForeignFieldVar
      if (Array.isArray(x)) {
        this.value = x;
        return;
      }
      // constant
      this.value = ForeignFieldVar.fromBigint(mod(BigInt(x), p));
    }

    /**
     * Coerce the input to a {@link ForeignFieldBn254}.
     */
    static from(x: ForeignFieldBn254 | ForeignFieldVar | bigint | number | string) {
      if (x instanceof ForeignFieldBn254) return x;
      return new ForeignFieldBn254(x);
    }

    /**
     * Checks whether this field element is a constant.
     *
     * See {@link FieldVar} to understand constants vs variables.
     */
    isConstant() {
      let [, ...limbs] = this.value;
      return limbs.every(FieldVar.isConstant);
    }

    /**
     * Convert this field element to a constant.
     *
     * See {@link FieldVar} to understand constants vs variables.
     *
     * **Warning**: This function is only useful in {@link Provable.witnessBn254} or {@link Provable.asProverBn254} blocks,
     * that is, in situations where the prover computes a value outside provable code.
     */
    toConstant(): ForeignFieldBn254 {
      let [, ...limbs] = this.value;
      let constantLimbs = mapTuple(limbs, (l) =>
        FieldVar.constant(FieldVar.toConstant(l))
      );
      return new ForeignFieldBn254([0, ...constantLimbs]);
    }

    /**
     * Convert this field element to a bigint.
     */
    toBigInt() {
      return ForeignFieldVar.toBigintBn254(this.value);
    }

    /**
     * Assert that this field element lies in the range [0, p),
     * where p is the foreign field modulus.
     */
    assertValidElement() {
      if (this.isConstant()) return;
      Snarky.foreignFieldBn254.assertValidElement(this.value, pMl);
    }

    // arithmetic with full constraints, for safe use

    /**
     * Finite field addition
     * @example
     * ```ts
     * x.add(2); // x + 2 mod p
     * ```
     */
    add(y: ForeignFieldBn254 | bigint | number) {
      return ForeignFieldBn254.sum([this, y], [1]);
    }

    /**
     * Finite field negation
     * @example
     * ```ts
     * x.neg(); // -x mod p = p - x
     * ```
     */
    neg() {
      return ForeignFieldBn254.sum([ForeignFieldBn254.#zero, this], [-1]);
    }

    /**
     * Finite field subtraction
     * @example
     * ```ts
     * x.sub(1); // x - 1 mod p
     * ```
     */
    sub(y: ForeignFieldBn254 | bigint | number) {
      return ForeignFieldBn254.sum([this, y], [-1]);
    }

    /**
     * Sum (or difference) of multiple finite field elements.
     *
     * @example
     * ```ts
     * let z = ForeignFieldBn254.sum([3, 2, 1], [-1, 1]); // 3 - 2 + 1
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
     * than chaining calls to {@link ForeignFieldBn254.add} and {@link ForeignFieldBn254.sub}.
     *
     */
    static sum(xs: (ForeignFieldBn254 | bigint | number)[], operations: (1 | -1)[]) {
      if (xs.every(isConstant)) {
        let sum = xs.reduce((sum: bigint, x, i): bigint => {
          if (i === 0) return toFp(x);
          return sum + BigInt(operations[i - 1]) * toFp(x);
        }, 0n);
        // note: we don't reduce mod p because the constructor does that
        return new ForeignFieldBn254(sum);
      }
      let fields = MlArray.to(xs.map(toVar));
      let opModes = MlArray.to(
        operations.map((op) => (op === 1 ? OpMode.Add : OpMode.Sub))
      );
      let z = Snarky.foreignFieldBn254.sumChain(fields, opModes, pMl);
      return new ForeignFieldBn254(z);
    }

    /**
     * Finite field multiplication
     * @example
     * ```ts
     * x.mul(y); // x*y mod p
     * ```
     */
    mul(y: ForeignFieldBn254 | bigint | number) {
      if (this.isConstant() && isConstant(y)) {
        let z = mod(this.toBigInt() * toFp(y), p);
        return new ForeignFieldBn254(z);
      }
      let z = Snarky.foreignFieldBn254.mul(this.value, toVar(y), pMl);
      return new ForeignFieldBn254(z);
    }

    /**
     * Multiplicative inverse in the finite field
     * @example
     * ```ts
     * let z = x.inv(); // 1/x mod p
     * z.mul(x).assertEquals(1);
     * ```
     */
    inv(): ForeignFieldBn254 {
      if (this.isConstant()) {
        let z = inverse(this.toBigInt(), p);
        if (z === undefined) {
          if (this.toBigInt() === 0n) {
            throw Error('ForeignField.inv(): division by zero');
          } else {
            // in case this is used with non-prime moduli
            throw Error('ForeignField.inv(): inverse does not exist');
          }
        }
        return new ForeignFieldBn254(z);
      }
      let z = Provable.witnessBn254(ForeignFieldBn254, () => this.toConstant().inv());

      // in unsafe mode, `witness` didn't constrain z to be a valid field element
      if (unsafe) z.assertValidElement();

      // check that x * z === 1
      // TODO: range checks added by `mul` on `one` are unnecessary, since we already assert that `one` equals 1
      let one = Snarky.foreignFieldBn254.mul(this.value, z.value, pMl);
      new ForeignFieldBn254(one).assertEquals(new ForeignFieldBn254(1));

      return z;
    }

    // convenience methods

    /**
     * Assert equality with a ForeignField-like value
     * @example
     * ```ts
     * x.assertEquals(0, "x is zero");
     * ```
     */
    assertEquals(y: ForeignFieldBn254 | bigint | number, message?: string) {
      try {
        if (this.isConstant() && isConstant(y)) {
          let x = this.toBigInt();
          let y0 = toFp(y);
          if (x !== y0) {
            throw Error(`ForeignField.assertEquals(): ${x} != ${y0}`);
          }
        }
        return Provable.assertEqualBn254(ForeignFieldBn254, this, ForeignFieldBn254.from(y));
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
    equals(y: ForeignFieldBn254 | bigint | number) {
      if (this.isConstant() && isConstant(y)) {
        return new BoolBn254(this.toBigInt() === toFp(y));
      }
      return Provable.equalBn254(ForeignFieldBn254, this, ForeignFieldBn254.from(y));
    }

    // bit packing

    /**
     * Unpack a field element to its bits, as a {@link Bool}[] array.
     *
     * This method is provable!
     */
    toBits(length = sizeInBits) {
      checkBitLength('ForeignField.toBits()', length, sizeInBits);
      let [l0, l1, l2] = this.toFields();
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
    static fromBits(bits: BoolBn254[]) {
      let length = bits.length;
      checkBitLength('ForeignFieldBn254.fromBits()', length, sizeInBits);
      let limbSize = Number(limbBits);
      let l0 = FieldBn254.fromBits(bits.slice(0 * limbSize, 1 * limbSize));
      let l1 = FieldBn254.fromBits(bits.slice(1 * limbSize, 2 * limbSize));
      let l2 = FieldBn254.fromBits(bits.slice(2 * limbSize, 3 * limbSize));
      let x = ForeignFieldBn254.fromFields([l0, l1, l2]);
      // TODO: can this be made more efficient? since the limbs are already range-checked
      if (length === sizeInBits) x.assertValidElement();
      return x;
    }

    // ProvableBn254<ForeignFieldBn254>

    /**
     * `ProvableBn254<ForeignFieldBn254>.toFields`, see {@link ProvableBn254.toFields}
     */
    static toFields(x: ForeignFieldBn254) {
      let [, ...limbs] = x.value;
      return limbs.map((x) => new FieldBn254(x));
    }

    /**
     * Instance version of `ProvableBn254<ForeignFieldBn254>.toFields`, see {@link ProvableBn254.toFields}
     */
    toFields() {
      return ForeignFieldBn254.toFields(this);
    }

    /**
     * `ProvableBn254<ForeignFieldBn254>.toAuxiliary`, see {@link ProvableBn254.toAuxiliary}
     */
    static toAuxiliary(): [] {
      return [];
    }
    /**
     * `ProvableBn254<ForeignFieldBn254>.sizeInFields`, see {@link ProvableBn254.sizeInFields}
     */
    static sizeInFields() {
      return 3;
    }

    /**
     * `ProvableBn254<ForeignFieldBn254>.fromFields`, see {@link ProvableBn254.fromFields}
     */
    static fromFields(fields: FieldBn254[]) {
      let fieldVars = fields.map((x) => x.value);
      let limbs = arrayToTuple(fieldVars, 3, 'ForeignFieldBn254.fromFields()');
      return new ForeignFieldBn254([0, ...limbs]);
    }

    /**
     * `ProvableBn254<ForeignFieldBn254>.check`, see {@link ProvableBn254.check}
     *
     * This will check that the field element is in the range [0, p),
     * where p is the foreign field modulus.
     *
     * **Exception**: If {@link createForeignFieldBn254} is called with `{ unsafe: true }`,
     * we don't check that field elements are valid by default.
     */
    static check(x: ForeignFieldBn254) {
      // if the `unsafe` flag is set, we don't add any constraints when creating a new variable
      // this means a user has to take care of proper constraining themselves
      if (!unsafe) x.assertValidElement();
    }
  }

  function toFp(x: bigint | string | number | ForeignFieldBn254) {
    if (x instanceof ForeignFieldBn254) return x.toBigInt();
    return mod(BigInt(x), p);
  }
  function toVar(x: bigint | number | string | ForeignFieldBn254): ForeignFieldVar {
    if (x instanceof ForeignFieldBn254) return x.value;
    return ForeignFieldVar.fromBigint(mod(BigInt(x), p));
  }
  function isConstant(x: bigint | number | string | ForeignFieldBn254) {
    if (x instanceof ForeignFieldBn254) return x.isConstant();
    return true;
  }

  return ForeignFieldBn254;
}

enum OpMode {
  Add,
  Sub,
}

// helpers

const limbMax = (1n << limbBits) - 1n;

// the max foreign field modulus is f_max = floor(sqrt(p * 2^t)), where t = 3*limbBits = 264 and p is the native modulus
// see RFC: https://github.com/o1-labs/proof-systems/blob/1fdb1fd1d112f9d4ee095dbb31f008deeb8150b0/book/src/rfcs/foreign_field_mul.md
// since p = 2^254 + eps for both Pasta fields with eps small, a fairly tight lower bound is
// f_max >= sqrt(2^254 * 2^264) = 2^259
const foreignFieldMaxBits = (BigInt(Fp.sizeInBits - 1) + 3n * limbBits) / 2n;
const foreignFieldMax = 1n << foreignFieldMaxBits;

function mapTuple<T extends Tuple<any>, B>(
  tuple: T,
  f: (a: T[number]) => B
): { [i in keyof T]: B } {
  return tuple.map(f) as any;
}

/**
 * tuple type that has the length as generic parameter
 */
type TupleN<T, N extends number> = N extends N
  ? number extends N
  ? T[]
  : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

/**
 * Type-safe way of converting an array to a fixed-length tuple (same JS representation, but different TS type)
 */
function arrayToTuple<N extends number, E = unknown>(
  arr: E[],
  size: N,
  name: string
): TupleN<E, N> {
  if (arr.length !== size) {
    throw Error(
      `${name}: expected array of length ${size}, got length ${arr.length}`
    );
  }
  return arr as any;
}
