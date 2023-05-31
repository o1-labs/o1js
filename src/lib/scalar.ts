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

let shift = Fq(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

/**
 * Represents a {@link Scalar}.
 */
class Scalar {
  bits: BoolVar[];
  constantValue?: ScalarConst;

  constructor(bits: BoolVar[], constantValue?: ScalarConst) {
    this.bits = bits;
    this.constantValue = constantValue ?? toConstantScalar(bits);
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

  /**
   * Serialize a Scalar into a Field element plus one bit, where the bit is represented as a Bool.
   *
   * **Warning**: This function is not available for provable code.
   *
   * Note: Since the Scalar field is slightly larger than the base Field, an additional high bit
   * is needed to represent all Scalars. However, for a random Scalar, the high bit will be `false` with overwhelming probability.
   */
  toFieldsCompressed(): { field: Field; highBit: Bool } {
    let isConstant = this.bits.every((b) => FieldVar.isConstant(b));
    let constantValue = this.constantValue;
    if (!isConstant || constantValue === undefined)
      throw Error(
        `Scalar.toFieldsCompressed is not available in provable code.
That means it can't be called in a @method or similar environment, and there's no alternative implemented to achieve that.`
      );
    let x = ScalarConst.toBigint(constantValue);
    let lowBitSize = BigInt(Fq.sizeInBits - 1);
    let lowBitMask = (1n << lowBitSize) - 1n;
    return {
      field: new Field(x & lowBitMask),
      highBit: Bool(x >> lowBitSize === 1n),
    };
  }
}

function toConstantScalar(bits: BoolVar[]) {
  let constantBits = Array<boolean>(bits.length);
  for (let i = 0; i < bits.length; i++) {
    let bool = bits[i];
    if (!FieldVar.isConstant(bool)) return undefined;
    constantBits[i] = FieldConst.equal(bool[1], FieldConst[1]);
  }
  let sShifted = Fq.fromBits(constantBits);
  let s = unshift(sShifted);
  return constFromBigint(s);
}

function unshift(s: Fq): Fq {
  return Fq.mul(Fq.sub(s, shift), oneHalf);
}

function constToBigint(x: ScalarConst): Fq {
  return Fq.fromBytes([...x]);
}
function constFromBigint(x: Fq) {
  return Uint8Array.from(Fq.toBytes(x));
}
