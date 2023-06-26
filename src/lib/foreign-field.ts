import { Snarky } from '../snarky.js';
import { mod, inverse, Fp } from '../bindings/crypto/finite_field.js';
import { Tuple } from '../bindings/lib/binable.js';
import {
  Field,
  FieldConst,
  FieldVar,
  checkBitLength,
  withMessage,
} from './field.js';
import { Provable } from './provable.js';
import { Bool } from './bool.js';

// external API
export { createForeignField, ForeignField };

// internal API
export { ForeignFieldVar, ForeignFieldConst, limbBits };

const limbBits = 88n;

type MlForeignField<F> = [_: 0, x0: F, x1: F, x2: F];
type ForeignFieldVar = MlForeignField<FieldVar>;
type ForeignFieldConst = MlForeignField<FieldConst>;
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

  class ForeignField {
    static modulus = p;
    value: ForeignFieldVar;

    /**
     * Create a new {@link ForeignField} from a bigint, number, string or another ForeignField.
     * @example
     * ```ts
     * let x = new ForeignField(5);
     * ```
     */
    constructor(x: ForeignField | ForeignFieldVar | bigint | number | string) {
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
      this.value = ForeignFieldVar.fromBigint(mod(BigInt(x), p));
    }

    /**
     * Coerce the input to a {@link ForeignField}.
     */
    static from(x: ForeignField | ForeignFieldVar | bigint | number | string) {
      if (x instanceof ForeignField) return x;
      return new ForeignField(x);
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
     * **Warning**: This function is only useful in {@link Provable.witness} or {@link Provable.asProver} blocks,
     * that is, in situations where the prover computes a value outside provable code.
     */
    toConstant(): ForeignField {
      let [, ...limbs] = this.value;
      let constantLimbs = mapTuple(limbs, (l) =>
        FieldVar.constant(FieldVar.toConstant(l))
      );
      return new ForeignField([0, ...constantLimbs]);
    }

    /**
     * Convert this field element to a bigint.
     */
    toBigInt() {
      return ForeignFieldVar.toBigint(this.value);
    }

    /**
     * Assert that this field element lies in the range [0, p),
     * where p is the foreign field modulus.
     */
    assertValidElement() {
      if (this.isConstant()) return;
      Snarky.foreignField.assertValidElement(this.value, pMl);
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
      if (this.isConstant() && isConstant(y)) {
        let z = mod(this.toBigInt() + toFp(y), p);
        return new ForeignField(z);
      }
      let z = Snarky.foreignField.add(this.value, toVar(y), pMl);
      return new ForeignField(z);
    }

    /**
     * Finite field negation
     * @example
     * ```ts
     * x.neg(); // -x mod p = p - x
     * ```
     */
    neg() {
      if (this.isConstant()) {
        let x = this.toBigInt();
        let z = x === 0n ? 0n : p - x;
        return new ForeignField(z);
      }
      let z = Snarky.foreignField.sub(ForeignFieldVar[0], this.value, pMl);
      return new ForeignField(z);
    }

    /**
     * Finite field subtraction
     * @example
     * ```ts
     * x.sub(1); // x - 1 mod p
     * ```
     */
    sub(y: ForeignField | bigint | number) {
      if (this.isConstant() && isConstant(y)) {
        let z = mod(this.toBigInt() - toFp(y), p);
        return new ForeignField(z);
      }
      let z = Snarky.foreignField.sub(this.value, toVar(y), pMl);
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
      if (this.isConstant() && isConstant(y)) {
        let z = mod(this.toBigInt() * toFp(y), p);
        return new ForeignField(z);
      }
      let z = Snarky.foreignField.mul(this.value, toVar(y), pMl);
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
        return new ForeignField(z);
      }
      let z = Provable.witness(ForeignField, () => this.toConstant().inv());

      // in unsafe mode, `witness` didn't constrain z to be a valid field element
      if (unsafe) z.assertValidElement();

      // check that x * z === 1
      // TODO: range checks added by `mul` on `one` are unnecessary, since we already assert that `one` equals 1
      let one = Snarky.foreignField.mul(this.value, z.value, pMl);
      new ForeignField(one).assertEquals(new ForeignField(1));

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
    assertEquals(y: ForeignField | bigint | number, message?: string) {
      try {
        if (this.isConstant() && isConstant(y)) {
          let x = this.toBigInt();
          let y0 = toFp(y);
          if (x !== y0) {
            throw Error(`ForeignField.assertEquals(): ${x} != ${y0}`);
          }
        }
        return Provable.assertEqual(ForeignField, this, ForeignField.from(y));
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
      return Provable.equal(ForeignField, this, ForeignField.from(y));
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
    static fromBits(bits: Bool[]) {
      let length = bits.length;
      checkBitLength('ForeignField.fromBits()', length, sizeInBits);
      let limbSize = Number(limbBits);
      let l0 = Field.fromBits(bits.slice(0 * limbSize, 1 * limbSize));
      let l1 = Field.fromBits(bits.slice(1 * limbSize, 2 * limbSize));
      let l2 = Field.fromBits(bits.slice(2 * limbSize, 3 * limbSize));
      let x = ForeignField.fromFields([l0, l1, l2]);
      // TODO: can this be made more efficient? since the limbs are already range-checked
      if (length === sizeInBits) x.assertValidElement();
      return x;
    }

    // Provable<ForeignField>

    /**
     * `Provable<ForeignField>.toFields`, see {@link Provable.toFields}
     */
    static toFields(x: ForeignField) {
      let [, ...limbs] = x.value;
      return limbs.map((x) => new Field(x));
    }

    /**
     * Instance version of `Provable<ForeignField>.toFields`, see {@link Provable.toFields}
     */
    toFields() {
      return ForeignField.toFields(this);
    }

    /**
     * `Provable<ForeignField>.toAuxiliary`, see {@link Provable.toAuxiliary}
     */
    static toAuxiliary(): [] {
      return [];
    }
    /**
     * `Provable<ForeignField>.sizeInFields`, see {@link Provable.sizeInFields}
     */
    static sizeInFields() {
      return 3;
    }

    /**
     * `Provable<ForeignField>.fromFields`, see {@link Provable.fromFields}
     */
    static fromFields(fields: Field[]) {
      let fieldVars = fields.map((x) => x.value);
      let limbs = arrayToTuple(fieldVars, 3, 'ForeignField.fromFields()');
      return new ForeignField([0, ...limbs]);
    }

    /**
     * `Provable<ForeignField>.check`, see {@link Provable.check}
     *
     * This will check that the field element is in the range [0, p),
     * where p is the foreign field modulus.
     *
     * **Exception**: If {@link createForeignField} is called with `{ unsafe: true }`,
     * we don't check that field elements are valid by default.
     */
    static check(x: ForeignField) {
      // if the `unsafe` flag is set, we don't add any constraints when creating a new variable
      // this means a user has to take care of proper constraining themselves
      if (!unsafe) x.assertValidElement();
    }
  }

  function toFp(x: bigint | string | number | ForeignField) {
    if (x instanceof ForeignField) return x.toBigInt();
    return mod(BigInt(x), p);
  }
  function toVar(x: bigint | number | string | ForeignField): ForeignFieldVar {
    if (x instanceof ForeignField) return x.value;
    return ForeignFieldVar.fromBigint(mod(BigInt(x), p));
  }
  function isConstant(x: bigint | number | string | ForeignField) {
    if (x instanceof ForeignField) return x.isConstant();
    return true;
  }

  return ForeignField;
}

// helpers

const limbMax = (1n << limbBits) - 1n;

// the max foreign field modulus is f_max = floor(sqrt(p * 2^t)), where t = 3*limbBits = 264 and p is the native modulus
// see RFC: https://github.com/o1-labs/proof-systems/blob/1fdb1fd1d112f9d4ee095dbb31f008deeb8150b0/book/src/rfcs/foreign_field_mul.md
// since p = 2^254 + eps for both Pasta fields with eps small, a fairly tight lower bound is
// f_max >= sqrt(2^254 * 2^264) = 2^259
const foreignFieldMaxBits = (BigInt(Fp.sizeInBits - 1) + 3n * limbBits) / 2n;
const foreignFieldMax = 1n << foreignFieldMaxBits;

const ForeignFieldConst = {
  fromBigint(x: bigint): ForeignFieldConst {
    let limbs = mapTuple(to3Limbs(x), FieldConst.fromBigint);
    return [0, ...limbs];
  },
  toBigint([, ...limbs]: ForeignFieldConst): bigint {
    return from3Limbs(mapTuple(limbs, FieldConst.toBigint));
  },
  [0]: [
    0,
    FieldConst[0],
    FieldConst[0],
    FieldConst[0],
  ] satisfies ForeignFieldConst,
  [1]: [
    0,
    FieldConst[1],
    FieldConst[0],
    FieldConst[0],
  ] satisfies ForeignFieldConst,
};

const ForeignFieldVar = {
  fromBigint(x: bigint): ForeignFieldVar {
    let limbs = mapTuple(to3Limbs(x), FieldVar.constant);
    return [0, ...limbs];
  },
  toBigint([, ...limbs]: ForeignFieldVar): bigint {
    return from3Limbs(mapTuple(limbs, FieldVar.toBigint));
  },
  [0]: [0, FieldVar[0], FieldVar[0], FieldVar[0]] satisfies ForeignFieldVar,
  [1]: [0, FieldVar[1], FieldVar[0], FieldVar[0]] satisfies ForeignFieldVar,
};

function to3Limbs(x: bigint): [bigint, bigint, bigint] {
  let l0 = x & limbMax;
  x >>= limbBits;
  let l1 = x & limbMax;
  let l2 = x >> limbBits;
  return [l0, l1, l2];
}

function from3Limbs(limbs: [bigint, bigint, bigint]): bigint {
  let [l0, l1, l2] = limbs;
  return l0 + ((l1 + (l2 << limbBits)) << limbBits);
}

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
