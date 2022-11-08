import { Binable } from './binable.js';
import { GenericHashInput, GenericProvableExtended } from './generic.js';

export { Field, Bool, UInt32, UInt64, Sign };
export {
  pseudoClass,
  ProvableExtended,
  HashInput,
  ProvableBigint,
  BinableBigint,
  sizeInBits,
};

type Field = bigint;
type Bool = 0n | 1n;
type UInt32 = bigint;
type UInt64 = bigint;

// TODO: auto-generate
const MODULUS =
  0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001n;
const sizeInBits = MODULUS.toString(2).length;
const sizeInBytes = Math.ceil(sizeInBits / 8);

type minusOne =
  0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;
const minusOne: minusOne =
  0x40000000000000000000000000000000224698fc094cf91b992d30ed00000000n;
type Sign = 1n | minusOne;

type HashInput = GenericHashInput<Field>;
type ProvableExtended<T, J> = GenericProvableExtended<T, J, Field>;

const Field = pseudoClass(
  function Field(value: bigint | number | string): Field {
    return BigInt(value) % MODULUS;
  },
  { ...ProvableBigint(), ...BinableBigint(sizeInBytes) }
);

const Bool = pseudoClass(
  function Bool(value: boolean): Bool {
    return BigInt(value) as Bool;
  },
  {
    ...ProvableBigint<Bool>(),
    ...BinableBigint<Bool>(1),
    toInput(x: Bool): HashInput {
      return {
        fields: [],
        packed: [[x, 1]],
      };
    },
    toJSON(x: Bool) {
      return !!x;
    },
    fromJSON(x: boolean) {
      return BigInt(x) as Bool;
    },
    sizeInBytes() {
      return 1;
    },
    Unsafe: {
      fromField(x: Field) {
        return x as 0n | 1n;
      },
    },
  }
);

function Unsigned(bits: number) {
  return pseudoClass(
    function Unsigned(value: bigint | number | string) {
      let x = BigInt(value);
      if (x < 0n) throw Error('Unsigned: input must be positive.');
      if (x >= 1n << BigInt(bits))
        throw Error(`Unsigned: input must fit in ${bits} bits.`);
      return BigInt(value);
    },
    {
      ...ProvableBigint(),
      ...BinableBigint(Math.ceil(bits / 8)),
      toInput(x: bigint): HashInput {
        return {
          fields: [],
          packed: [[x, bits]],
        };
      },
    }
  );
}
const UInt32 = Unsigned(32);
const UInt64 = Unsigned(64);

const Sign = pseudoClass(
  function Sign(value: 1 | -1): Sign {
    if (value !== 1 && value !== -1)
      throw Error('Sign: input must be 1 or -1.');
    return (BigInt(value) % MODULUS) as Sign;
  },
  {
    ...ProvableBigint<Sign, 'Positive' | 'Negative'>(),
    ...BinableBigint<Sign>(1),
    toInput(x: Sign): HashInput {
      return {
        fields: [],
        packed: [[x === 1n ? 1n : 0n, 1]],
      };
    },
    toJSON(x: Sign) {
      return x === 1n ? 'Positive' : 'Negative';
    },
    fromJSON(x: 'Positive' | 'Negative'): Sign {
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

function ProvableBigint<
  T extends bigint = bigint,
  TJSON extends string = string
>(): ProvableExtended<T, TJSON> {
  return {
    sizeInFields() {
      return 1;
    },
    toFields(x): Field[] {
      return [x];
    },
    toAuxiliary() {
      return [];
    },
    check() {},
    fromFields([x]) {
      return x as T;
    },
    toInput(x) {
      return { fields: [x], packed: [] };
    },
    toJSON(x) {
      return x.toString() as TJSON;
    },
    fromJSON(x) {
      return BigInt(x) as T;
    },
  };
}

function BinableBigint<T extends bigint = bigint>(
  sizeInBytes: number
): Binable<T> {
  return {
    toBytes(x) {
      return bigIntToBytes(x, sizeInBytes);
    },
    fromBytes(bytes) {
      return bytesToBigInt(bytes) as T;
    },
    sizeInBytes() {
      return sizeInBytes;
    },
  };
}

function bytesToBigInt(bytes: Uint8Array | number[]) {
  let x = 0n;
  let bitPosition = 0n;
  for (let byte of bytes) {
    x += BigInt(byte) << bitPosition;
    bitPosition += 8n;
  }
  return x;
}

function bigIntToBytes(x: bigint, length: number) {
  let bytes: number[] = Array(length);
  for (let i = 0; i < length; i++, x >>= 8n) {
    bytes[i] = Number(x & 0xffn);
  }
  return bytes;
}
