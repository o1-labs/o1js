import { Bn254Fp, mod } from '../bindings/crypto/finite-field.js';
import { pseudoClass, checkRange } from './field-bigint.js';
import {
  BinableBigint,
  HashInput,
  ProvableBigint,
} from '../bindings/lib/provable-bigint.js';

export { FieldBn254, BoolBn254 };
export { sizeInBits, checkField };

type FieldBn254 = bigint;
type BoolBn254 = 0n | 1n;

const sizeInBits = Bn254Fp.sizeInBits;

const checkField = checkRange(0n, Bn254Fp.modulus, 'FieldBn254');
const checkBool = checkAllowList(new Set([0n, 1n]), 'BoolBn254');

/**
 * The base field of the Bn254 curve
 */
const FieldBn254 = pseudoClass(
  function FieldBn254(value: bigint | number | string): FieldBn254 {
    return mod(BigInt(value), Bn254Fp.modulus);
  },
  {
    ...ProvableBigint(checkField),
    ...BinableBigint(Bn254Fp.sizeInBits, checkField),
    ...Bn254Fp,
  }
);

/**
 * A field element which is either 0 or 1
 */
const BoolBn254 = pseudoClass(
  function BoolBn254(value: boolean): BoolBn254 {
    return BigInt(value) as BoolBn254;
  },
  {
    ...ProvableBigint<BoolBn254>(checkBool),
    ...BinableBigint<BoolBn254>(1, checkBool),
    toInput(x: BoolBn254): HashInput {
      return { fields: [], packed: [[x, 1]] };
    },
    toBoolean(x: BoolBn254) {
      return !!x;
    },
    toJSON(x: BoolBn254) {
      return !!x;
    },
    fromJSON(b: boolean) {
      let x = BigInt(b) as BoolBn254;
      checkBool(x);
      return x;
    },
    sizeInBytes: 1,
    fromField(x: FieldBn254) {
      checkBool(x);
      return x as 0n | 1n;
    },
  }
);

function checkAllowList(valid: Set<bigint>, name: string) {
  return (x: bigint) => {
    if (!valid.has(x)) {
      throw Error(
        `${name}: input must be one of ${[...valid].join(', ')}, got ${x}`
      );
    }
  };
}
