import { Bn254Fp, mod } from '../bindings/crypto/finite_field.js';
import {
  BinableBigint,
  HashInput,
  ProvableBigint,
} from '../bindings/lib/provable-bigint.js';
import { checkRange, pseudoClass } from './field-bigint.js';

export { FieldBn254, BoolBn254 };
export { pseudoClass, sizeInBits, checkRange, checkFieldBn254 as checkField };

type FieldBn254 = bigint;
type BoolBn254 = 0n | 1n;

const sizeInBits = Bn254Fp.sizeInBits;

type minusOne =
  0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;
const minusOne: minusOne =
  0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;

const checkFieldBn254 = checkRange(0n, Bn254Fp.modulus, 'FieldBn254');
const checkBoolBn254 = checkAllowList(new Set([0n, 1n]), 'BoolBn254');

/**
 * The base field of the Bn254 curve
 */
const FieldBn254 = pseudoClass(
  function FieldBn254(value: bigint | number | string): FieldBn254 {
    return mod(BigInt(value), Bn254Fp.modulus);
  },
  {
    ...ProvableBigint(checkFieldBn254),
    ...BinableBigint(Bn254Fp.sizeInBits, checkFieldBn254),
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
    ...ProvableBigint<BoolBn254>(checkBoolBn254),
    ...BinableBigint<BoolBn254>(1, checkBoolBn254),
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
      checkBoolBn254(x);
      return x;
    },
    sizeInBytes() {
      return 1;
    },
    fromField(x: FieldBn254) {
      checkBoolBn254(x);
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
