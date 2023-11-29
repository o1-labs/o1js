import { ProvablePure } from '../snarky.js';
import { mod, Fp } from '../bindings/crypto/finite_field.js';
import { Field, FieldVar, checkBitLength, withMessage } from './field.js';
import { Provable } from './provable.js';
import { Bool } from './bool.js';
import { Tuple, TupleN } from './util/types.js';
import { Field3 } from './gadgets/foreign-field.js';
import { Gadgets } from './gadgets/gadgets.js';
import { assert } from './gadgets/common.js';
import { l3, l } from './gadgets/range-check.js';

// external API
export { createForeignField };
export type {
  ForeignField,
  UnreducedForeignField,
  AlmostForeignField,
  CanonicalForeignField,
};

class ForeignField {
  static _modulus: bigint | undefined = undefined;

  // static parameters
  static get modulus() {
    assert(this._modulus !== undefined, 'ForeignField class not initialized.');
    return this._modulus;
  }
  get modulus() {
    return (this.constructor as typeof ForeignField).modulus;
  }
  static get sizeInBits() {
    return this.modulus.toString(2).length;
  }

  /**
   * The internal representation of a foreign field element, as a tuple of 3 limbs.
   */
  value: Field3;

  private get Class() {
    return this.constructor as typeof ForeignField;
  }

  /**
   * Sibling classes that represent different ranges of field elements.
   */
  static _variants:
    | {
        unreduced: typeof UnreducedForeignField;
        almostReduced: typeof AlmostForeignField;
        canonical: typeof CanonicalForeignField;
      }
    | undefined = undefined;

  static get Unreduced() {
    assert(this._variants !== undefined, 'ForeignField class not initialized.');
    return this._variants.unreduced;
  }
  static get AlmostReduced() {
    assert(this._variants !== undefined, 'ForeignField class not initialized.');
    return this._variants.almostReduced;
  }
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
   */
  constructor(x: ForeignField | Field3 | bigint | number | string) {
    const p = this.modulus;
    if (x instanceof ForeignField) {
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

  private static toLimbs(x: bigint | number | string | ForeignField): Field3 {
    if (x instanceof ForeignField) return x.value;
    return Field3.from(mod(BigInt(x), this.modulus));
  }

  /**
   * Coerce the input to a {@link ForeignField}.
   */
  static from(x: bigint | number | string): CanonicalForeignField {
    return new this(x) as CanonicalForeignField;
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
    return new this.Class(constantLimbs);
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
   * You should typically use the weaker property because it is cheaper to prove and sufficient for
   * ensuring validity of all our non-native field arithmetic methods.
   */
  assertAlmostFieldElement(): asserts this is AlmostForeignField {
    // TODO: this is not very efficient, but the only way to abstract away the complicated
    // range check assumptions and also not introduce a global context of pending range checks.
    // we plan to get rid of bounds checks anyway, then this is just a multi-range check
    Gadgets.ForeignField.assertAlmostFieldElements([this.value], this.modulus, {
      skipMrc: true,
    });
  }

  /**
   * Assert that this field element is fully reduced,
   * i.e. lies in the range [0, p), where p is the foreign field modulus.
   */
  assertCanonicalFieldElement(): asserts this is CanonicalForeignField {
    const p = this.modulus;
    this.assertLessThan(p);
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
    return this.Class.sum([this, y], [1]);
  }

  /**
   * Finite field negation
   * @example
   * ```ts
   * x.neg(); // -x mod p = p - x
   * ```
   */
  neg() {
    let zero: ForeignField = this.Class.from(0n);
    return this.Class.sum([zero, this], [-1]);
  }

  /**
   * Finite field subtraction
   * @example
   * ```ts
   * x.sub(1); // x - 1 mod p
   * ```
   */
  sub(y: ForeignField | bigint | number) {
    return this.Class.sum([this, y], [-1]);
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
    const p = this.modulus;
    let fields = xs.map((x) => this.toLimbs(x));
    let ops = operations.map((op) => (op === 1 ? 1n : -1n));
    let z = Gadgets.ForeignField.sum(fields, ops, p);
    return new this.Unreduced(z);
  }

  /**
   * Finite field multiplication
   * @example
   * ```ts
   * x.mul(y); // x*y mod p
   * ```
   */
  mul(y: AlmostForeignField | bigint | number) {
    const p = this.modulus;
    let z = Gadgets.ForeignField.mul(this.value, this.Class.toLimbs(y), p);
    return new this.Class.Unreduced(z);
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
    return new this.Class.AlmostReduced(z);
  }

  /**
   * Division in the finite field, i.e. `x*y^(-1) mod p` where `y^(-1)` is the finite field inverse.
   * @example
   * ```ts
   * let z = x.div(y); // x/y mod p
   * z.mul(y).assertEquals(x);
   * ```
   */
  div(y: ForeignField | bigint | number) {
    const p = this.modulus;
    let z = Gadgets.ForeignField.div(this.value, this.Class.toLimbs(y), p);
    return new this.Class.AlmostReduced(z);
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
    const p = this.modulus;
    try {
      if (this.isConstant() && isConstant(y)) {
        let x = this.toBigInt();
        let y0 = mod(toBigInt(y), p);
        if (x !== y0) {
          throw Error(`ForeignField.assertEquals(): ${x} != ${y0}`);
        }
        return;
      }
      return Provable.assertEqual(this.Class.provable, this, new this.Class(y));
    } catch (err) {
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
  assertLessThan(c: bigint | number, message?: string) {
    assert(
      c >= 0 && c < 1n << l3,
      `ForeignField.assertLessThan(): expected c <= c < 2^264, got ${c}`
    );
    try {
      Gadgets.ForeignField.assertLessThan(this.value, toBigInt(c));
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
    const p = this.modulus;
    if (this.isConstant() && isConstant(y)) {
      return new Bool(this.toBigInt() === mod(toBigInt(y), p));
    }
    return Provable.equal(this.Class.provable, this, new this.Class(y));
  }

  // bit packing

  /**
   * Unpack a field element to its bits, as a {@link Bool}[] array.
   *
   * This method is provable!
   */
  toBits(length?: number) {
    const sizeInBits = this.Class.sizeInBits;
    if (length === undefined) length = sizeInBits;
    checkBitLength('ForeignField.toBits()', length, sizeInBits);
    let [l0, l1, l2] = this.value;
    let limbSize = Number(l);
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
    checkBitLength('ForeignField.fromBits()', length, this.sizeInBits);
    let limbSize = Number(l);
    let l0 = Field.fromBits(bits.slice(0 * limbSize, 1 * limbSize));
    let l1 = Field.fromBits(bits.slice(1 * limbSize, 2 * limbSize));
    let l2 = Field.fromBits(bits.slice(2 * limbSize, 3 * limbSize));
    // note: due to the check on the number of bits, we know we return an "almost valid" field element
    return new this([l0, l1, l2]) as AlmostForeignField;
  }

  /**
   * Instance version of `Provable<ForeignField>.toFields`, see {@link Provable.toFields}
   */
  toFields(): Field[] {
    return this.value;
  }

  static check(_: ForeignField) {
    throw Error('ForeignField.check() not implemented: must use a subclass');
  }

  static _provable: any = undefined;

  /**
   * `Provable<ForeignField>`, see {@link Provable}
   */
  static get provable() {
    assert(this._provable !== undefined, 'ForeignField class not initialized.');
    return this._provable;
  }
}

class UnreducedForeignField extends ForeignField {
  type: 'Unreduced' | 'AlmostReduced' | 'FullyReduced' = 'Unreduced';

  static _provable: ProvablePure<UnreducedForeignField> | undefined = undefined;
  static get provable() {
    assert(this._provable !== undefined, 'ForeignField class not initialized.');
    return this._provable;
  }

  static check(x: ForeignField): asserts x is UnreducedForeignField {
    Gadgets.multiRangeCheck(x.value);
  }
}

class AlmostForeignField extends ForeignField {
  type: 'AlmostReduced' | 'FullyReduced' = 'AlmostReduced';

  static _provable: ProvablePure<AlmostForeignField> | undefined = undefined;
  static get provable() {
    assert(this._provable !== undefined, 'ForeignField class not initialized.');
    return this._provable;
  }

  static check(x: ForeignField): asserts x is AlmostForeignField {
    Gadgets.multiRangeCheck(x.value);
    x.assertAlmostFieldElement();
  }
}

class CanonicalForeignField extends ForeignField {
  type = 'FullyReduced' as const;

  static _provable: ProvablePure<CanonicalForeignField> | undefined = undefined;
  static get provable() {
    assert(this._provable !== undefined, 'ForeignField class not initialized.');
    return this._provable;
  }

  static check(x: ForeignField): asserts x is CanonicalForeignField {
    Gadgets.multiRangeCheck(x.value);
    x.assertCanonicalFieldElement();
  }
}

function toBigInt(x: bigint | string | number | ForeignField) {
  if (x instanceof ForeignField) return x.toBigInt();
  return BigInt(x);
}

function isConstant(x: bigint | number | string | ForeignField) {
  if (x instanceof ForeignField) return x.isConstant();
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
 * Since the full `x < p` check is expensive, by default we only prove a weaker assertion, `x < 2^ceil(log2(p))`,
 * see {@link ForeignField.assertAlmostFieldElement} for more details.
 * If you need to prove that you have a fully reduced field element, use {@link ForeignField.assertCanonicalFieldElement}:
 *
 * ```ts
 * x.assertCanonicalFieldElement(); // x < p
 * ```
 *
 * @param modulus the modulus of the finite field you are instantiating
 */
function createForeignField(modulus: bigint): typeof ForeignField {
  assert(
    modulus > 0n,
    `ForeignField: modulus must be positive, got ${modulus}`
  );
  assert(
    modulus < foreignFieldMax,
    `ForeignField: modulus exceeds the max supported size of 2^${foreignFieldMaxBits}`
  );

  class UnreducedField extends UnreducedForeignField {
    static _modulus = modulus;
    static _provable = provable(UnreducedField);

    // bind public static methods to the class so that they have `this` defined
    static from = ForeignField.from.bind(UnreducedField);
    static sum = ForeignField.sum.bind(UnreducedField);
    static fromBits = ForeignField.fromBits.bind(UnreducedField);
  }

  class AlmostField extends AlmostForeignField {
    static _modulus = modulus;
    static _provable = provable(AlmostField);

    // bind public static methods to the class so that they have `this` defined
    static from = ForeignField.from.bind(AlmostField);
    static sum = ForeignField.sum.bind(AlmostField);
    static fromBits = ForeignField.fromBits.bind(AlmostField);
  }

  class CanonicalField extends CanonicalForeignField {
    static _modulus = modulus;
    static _provable = provable(CanonicalField);

    // bind public static methods to the class so that they have `this` defined
    static from = ForeignField.from.bind(CanonicalField);
    static sum = ForeignField.sum.bind(CanonicalField);
    static fromBits = ForeignField.fromBits.bind(CanonicalField);
  }

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

// provable

type Constructor<T> = new (...args: any[]) => T;

function provable<F extends ForeignField>(
  Class: Constructor<F> & { check(x: ForeignField): asserts x is F }
): ProvablePure<F> {
  return {
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
      return new Class(limbs);
    },
    check(x: ForeignField): asserts x is F {
      Class.check(x);
    },
  };
}
