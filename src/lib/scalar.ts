import { Snarky, Provable, Bool } from '../snarky.js';
import { Scalar as Fq } from '../provable/curve-bigint.js';
import { Field, FieldConst, FieldVar } from './field.js';

export { Scalar, ScalarConst, unshift };

type BoolVar = FieldVar;
type ScalarConst = Uint8Array;

const ScalarConst = {
  fromBigint: constFromBigint,
  toBigint: constToBigint,
};

let scalarShift = Fq(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

/**
 * Represents a {@link Scalar}.
 */
class Scalar {
  bits: BoolVar[];
  constantValue?: Fq;

  constructor(bits: BoolVar[], constantValue?: Fq) {
    this.bits = bits;
    this.constantValue = constantValue ?? toConstantScalar(bits);
  }

  static fromBigint(scalar: Fq) {
    let bits = toBits(scalar);
    return new Scalar(bits, scalar);
  }

  /**
   * Serialize this Scalar to Field elements. Part of the {@link Provable} interface.
   *
   * **Warning**: This function is for internal usage. It returns 255 field elements
   * which represent the Scalar in a shifted, bitwise format.
   * Check out {@link Scalar.toFieldsCompressed} for a user-friendly serialization
   * that can be used outside proofs.
   */
  toFields(): Field[] {
    return this.bits.map((b) => new Field(b));
  }

  // operations on constant scalars

  #assertConstant(name: string): Fq {
    if (this.constantValue === undefined)
      throw Error(
        `Scalar.${name}() is not available in provable code.
That means it can't be called in a @method or similar environment, and there's no alternative implemented to achieve that.`
      );
    return this.constantValue;
  }

  /**
   * Serialize a Scalar into a Field element plus one bit, where the bit is represented as a Bool.
   *
   * **Warning**: This method is not available for provable code.
   *
   * Note: Since the Scalar field is slightly larger than the base Field, an additional high bit
   * is needed to represent all Scalars. However, for a random Scalar, the high bit will be `false` with overwhelming probability.
   */
  toFieldsCompressed(): { field: Field; highBit: Bool } {
    let s = this.#assertConstant('toFieldsCompressed');
    let lowBitSize = BigInt(Fq.sizeInBits - 1);
    let lowBitMask = (1n << lowBitSize) - 1n;
    return {
      field: new Field(s & lowBitMask),
      highBit: Bool(s >> lowBitSize === 1n),
    };
  }

  /**
   * Negate a scalar field element.
   *
   * **Warning**: This method is not available for provable code.
   */
  neg() {
    let x = this.#assertConstant('neg');
    let z = Fq.negate(x);
    return Scalar.fromBigint(z);
  }

  /**
   * Add scalar field elements.
   *
   * **Warning**: This method is not available for provable code.
   */
  add(y: Scalar) {
    let x = this.#assertConstant('add');
    let y0 = y.#assertConstant('add');
    let z = Fq.add(x, y0);
    return Scalar.fromBigint(z);
  }

  /**
   * Subtract scalar field elements.
   *
   * **Warning**: This method is not available for provable code.
   */
  sub(y: Scalar) {
    let x = this.#assertConstant('sub');
    let y0 = y.#assertConstant('sub');
    let z = Fq.sub(x, y0);
    return Scalar.fromBigint(z);
  }

  /**
   * Multiply scalar field elements.
   *
   * **Warning**: This method is not available for provable code.
   */
  mul(y: Scalar) {
    let x = this.#assertConstant('mul');
    let y0 = y.#assertConstant('mul');
    let z = Fq.mul(x, y0);
    return Scalar.fromBigint(z);
  }

  /**
   * Divide scalar field elements.
   * Throws if the denominator is zero.
   *
   * **Warning**: This method is not available for provable code.
   */
  div(y: Scalar) {
    let x = this.#assertConstant('div');
    let y0 = y.#assertConstant('div');
    let z = Fq.div(x, y0);
    if (z === undefined) throw Error('Scalar.div(): Division by zero');
    return Scalar.fromBigint(z);
  }
}

function toConstantScalar(bits: BoolVar[]): Fq | undefined {
  let constantBits = Array<boolean>(bits.length);
  for (let i = 0; i < bits.length; i++) {
    let bool = bits[i];
    if (!FieldVar.isConstant(bool)) return undefined;
    constantBits[i] = FieldConst.equal(bool[1], FieldConst[1]);
  }
  let sShifted = Fq.fromBits(constantBits);
  return unshift(sShifted);
}
function toBits(constantValue: Fq): BoolVar[] {
  return Fq.toBits(shift(constantValue)).map((b) =>
    FieldVar.constant(BigInt(b))
  );
}

/**
 * s -> 2s + 1 + 2^255
 */
function shift(s: Fq): Fq {
  return Fq.add(Fq.add(s, s), scalarShift);
}

/**
 * inverse of shift, 2s + 1 + 2^255 -> s
 */
function unshift(s: Fq): Fq {
  return Fq.mul(Fq.sub(s, scalarShift), oneHalf);
}

function constToBigint(x: ScalarConst): Fq {
  return Fq.fromBytes([...x]);
}
function constFromBigint(x: Fq) {
  return Uint8Array.from(Fq.toBytes(x));
}
