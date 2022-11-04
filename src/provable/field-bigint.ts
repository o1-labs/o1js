import { GenericHashInput, GenericProvableExtended } from './generic.js';

export { Field, Bool, UInt32, UInt64, Sign };
export { pseudoClass, ProvableExtended, HashInput };

type Field = bigint;
type Bool = 0n | 1n;
type UInt32 = bigint;
type UInt64 = bigint;
type Sign = -1n | 1n;

type HashInput = GenericHashInput<Field>;
type ProvableExtended<T, J> = GenericProvableExtended<T, J, Field>;

// TODO: auto-generate
const MODULUS =
  0x40000000000000000000000000000000224698fc094cf91b992d30ed00000001n;

const Field = pseudoClass(function Field(
  value: bigint | number | string
): Field {
  return BigInt(value) % MODULUS;
},
ProvableBigint());

const Bool = pseudoClass(
  function Bool(value: boolean): Bool {
    return BigInt(value) as Bool;
  },
  {
    ...ProvableBigint<Bool>(),
    toInput(x: Bool): HashInput {
      return {
        fields: [],
        packed: [[x, 1]],
      };
    },
    toJSON(x: Bool) {
      return !!x;
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
    return BigInt(value) as Sign;
  },
  {
    ...ProvableBigint<Sign>(),
    toInput(x: Sign): HashInput {
      return {
        fields: [],
        packed: [[x, 1]],
      };
    },
    toJSON(x: Sign) {
      return x === 1n ? 'Positive' : 'Negative';
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
  TJSON = string
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
  };
}
