import { randomBytes } from '../../bindings/crypto/random.js';
import { Fp, mod } from '../../bindings/crypto/finite-field.js';
import { BinableBigint, HashInput, SignableBigint, BinableBool } from './derivers-bigint.js';

export { Field, Bool, UInt32, UInt64, Sign };
export { BinableFp, SignableFp };
export { pseudoClass, sizeInBits, checkRange, checkField };

type Field = bigint;
type Bool = boolean;
type UInt32 = bigint;
type UInt64 = bigint;

const sizeInBits = Fp.sizeInBits;

type minusOne = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;
const minusOne: minusOne = 0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;
type Sign = 1n | minusOne;

const checkField = checkRange(0n, Fp.modulus, 'Field');
const checkBool = checkAllowList(new Set([0n, 1n]), 'Bool');
const checkBoolBytes = checkAllowList(new Set([0, 1]), 'Bool');
const checkSign = checkAllowList(new Set([1n, minusOne]), 'Sign');

const BinableFp = BinableBigint(Fp.sizeInBits, checkField);
const SignableFp = SignableBigint(checkField);

/**
 * The base field of the Pallas curve
 */
const Field = pseudoClass(
  function Field(value: bigint | number | string): Field {
    return mod(BigInt(value), Fp.modulus);
  },
  { ...SignableFp, ...BinableFp, ...Fp, toBigint: (x: Field) => x }
);

/**
 * A field element which is either 0 or 1
 */
const Bool = pseudoClass(
  function Bool(value: boolean): Bool {
    return value;
  },
  {
    ...BinableBool(checkBoolBytes),
    fromBigint(x: Field) {
      checkBool(x);
      return x === 0n ? false : true;
    },
    toBigint(x: Bool) {
      return x ? 1n : 0n;
    },
    toInput(x: Bool): HashInput {
      return { fields: [], packed: [[Bool.toBigint(x), 1]] };
    },
    toBoolean(x: Bool) {
      return x;
    },
    toJSON(x: Bool) {
      return x;
    },
    fromJSON(b: boolean) {
      return b;
    },
    empty() {
      return false;
    },
    sizeInBytes: 1,
    fromField(x: Field) {
      return Bool.fromBigint(x);
    },
  }
);

function Unsigned(bits: number) {
  let maxValue = (1n << BigInt(bits)) - 1n;
  let checkUnsigned = checkRange(0n, 1n << BigInt(bits), `UInt${bits}`);
  let binable = BinableBigint(bits, checkUnsigned);
  let bytes = Math.ceil(bits / 8);

  return pseudoClass(
    function Unsigned(value: bigint | number | string) {
      let x = BigInt(value);
      checkUnsigned(x);
      return x;
    },
    {
      ...SignableBigint(checkUnsigned),
      ...binable,
      toInput(x: bigint): HashInput {
        return { fields: [], packed: [[x, bits]] };
      },
      maxValue,
      random() {
        return binable.fromBytes([...randomBytes(bytes)]);
      },
    }
  );
}
const UInt32 = Unsigned(32);
const UInt64 = Unsigned(64);

const Sign = pseudoClass(
  function Sign(value: 1 | -1): Sign {
    if (value !== 1 && value !== -1) throw Error('Sign: input must be 1 or -1.');
    return mod(BigInt(value), Fp.modulus) as Sign;
  },
  {
    ...SignableBigint<Sign, 'Positive' | 'Negative'>(checkSign),
    ...BinableBigint<Sign>(1, checkSign),
    empty() {
      return 1n;
    },
    toInput(x: Sign): HashInput {
      return { fields: [], packed: [[x === 1n ? 1n : 0n, 1]] };
    },
    fromFields([x]: Field[]): Sign {
      if (x === 0n) return 1n;
      checkSign(x);
      return x as Sign;
    },
    toJSON(x: Sign) {
      return x === 1n ? 'Positive' : 'Negative';
    },
    fromJSON(x: 'Positive' | 'Negative'): Sign {
      if (x !== 'Positive' && x !== 'Negative') throw Error('Sign: invalid input');
      return x === 'Positive' ? 1n : minusOne;
    },
  }
);

// helper

function pseudoClass<
  F extends (...args: any) => any,
  M
  // M extends Provable<ReturnType<F>>
>(constructor: F, module: M) {
  return Object.assign<F, M>(constructor, module);
}

// validity checks

function checkRange(lower: bigint, upper: bigint, name: string) {
  return (x: bigint) => {
    if (x < lower) throw Error(`${name}: inputs smaller than ${lower} are not allowed, got ${x}`);
    if (x >= upper)
      throw Error(`${name}: inputs larger than ${upper - 1n} are not allowed, got ${x}`);
  };
}

function checkAllowList<T>(valid: Set<T>, name: string) {
  return (x: T) => {
    if (!valid.has(x)) {
      throw Error(`${name}: input must be one of ${[...valid].join(', ')}, got ${x}`);
    }
  };
}
