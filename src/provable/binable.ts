// generic encoding infrastructure
import { bigIntToBytes } from './field-bigint.js';
import { GenericField } from './generic.js';

export {
  Binable,
  defineBinable,
  withVersionNumber,
  tuple,
  record,
  enumWithArgument,
  prefixToField,
  bytesToBits,
  bitsToBytes,
  withBits,
  withCheck,
  BinableWithBits,
  stringToBytes,
  BinableString,
  BinableBigintInteger,
};

type Binable<T> = {
  toBytes(t: T): number[];
  fromBytesInternal(
    bytes: number[],
    offset: number
  ): [value: T, offset: number];
  fromBytes(bytes: number[]): T;
};
type BinableWithBits<T> = Binable<T> & {
  toBits(t: T): boolean[];
  fromBits(bits: boolean[]): T;
  sizeInBytes(): number;
  sizeInBits(): number;
};

function defineBinable<T>({
  toBytes,
  fromBytesInternal,
}: {
  toBytes(t: T): number[];
  fromBytesInternal(
    bytes: number[],
    offset: number
  ): [value: T, offset: number];
}): Binable<T> {
  return {
    toBytes,
    fromBytesInternal,
    // spec: fromBytes throws if the input bytes are not all used
    fromBytes(bytes) {
      let [value, offset] = fromBytesInternal(bytes, 0);
      if (offset < bytes.length)
        throw Error('fromBytes: input bytes left over');
      return value;
    },
  };
}

function withVersionNumber<T>(
  binable: Binable<T>,
  versionNumber?: number
): Binable<T> {
  return defineBinable({
    toBytes(t) {
      let bytes = binable.toBytes(t);
      if (versionNumber !== undefined) bytes.unshift(versionNumber);
      return bytes;
    },
    fromBytesInternal(bytes, offset) {
      if (versionNumber !== undefined) offset++;
      return binable.fromBytesInternal(bytes, offset);
    },
  });
}

function withCheck<T>(
  { toBytes, fromBytesInternal }: Binable<T>,
  check: (t: T) => void
): Binable<T> {
  return defineBinable({
    toBytes,
    fromBytesInternal(bytes, start) {
      let [value, end] = fromBytesInternal(bytes, start);
      check(value);
      return [value, end];
    },
  });
}

type Tuple<T> = [T, ...T[]] | [];

function record<Types extends Record<string, any>>(
  binables: {
    [i in keyof Types]: Binable<Types[i]>;
  },
  keys: Tuple<keyof Types>
): Binable<Types> {
  let binablesTuple = keys.map((key) => binables[key]) as Tuple<Binable<any>>;
  let tupleBinable = tuple<Tuple<any>>(binablesTuple);
  return defineBinable({
    toBytes(t) {
      let array = keys.map((key) => t[key]) as Tuple<any>;
      return tupleBinable.toBytes(array);
    },
    fromBytesInternal(bytes, start) {
      let [tupleValue, end] = tupleBinable.fromBytesInternal(bytes, start);
      let value = Object.fromEntries(
        keys.map((key, i) => [key, tupleValue[i]])
      ) as any;
      return [value, end];
    },
  });
}

function tuple<Types extends Tuple<any>>(binables: {
  [i in keyof Types]: Binable<Types[i]>;
}): Binable<Types> {
  let n = (binables as any[]).length;
  return defineBinable({
    toBytes(t) {
      let bytes: number[] = [];
      for (let i = 0; i < n; i++) {
        let subBytes = binables[i].toBytes(t[i]);
        bytes.push(...subBytes);
      }
      return bytes;
    },
    fromBytesInternal(bytes, offset) {
      let values = [];
      for (let i = 0; i < n; i++) {
        let [value, newOffset] = binables[i].fromBytesInternal(bytes, offset);
        offset = newOffset;
        values.push(value);
      }
      return [values as Types, offset];
    },
  });
}

type EnumNoArgument<T extends string> = { type: T };
type EnumWithArgument<T extends string, V> = { type: T; value: V };
type AnyEnum = EnumNoArgument<string> | EnumWithArgument<string, any>;

function enumWithArgument<Enum_ extends Tuple<AnyEnum>>(types: {
  [i in keyof Enum_]: Enum_[i] extends EnumWithArgument<string, any>
    ? {
        type: Enum_[i]['type'];
        value: Binable<Enum_[i]['value']>;
      }
    : { type: Enum_[i]['type'] };
}): Binable<Enum_[number]> {
  let typeToIndex = Object.fromEntries(
    (types as { type: string; value: any }[]).map(({ type }, i) => [type, i])
  );
  return defineBinable({
    toBytes(en) {
      let i = typeToIndex[en.type];
      let type = types[i];
      if ('value' in type) {
        let binable = type.value;
        return [i, ...binable.toBytes((en as any).value)];
      }
      return [i];
    },
    fromBytesInternal(bytes, offset) {
      let i = bytes[offset];
      offset++;
      let type = types[i];
      if ('value' in type) {
        let [value, end] = type.value.fromBytesInternal(bytes, offset);
        return [{ type: type.type, value }, end];
      }
      return [{ type: type.type }, offset];
    },
  });
}

const BinableString = defineBinable({
  toBytes(t: string) {
    return [t.length, ...stringToBytes(t)];
  },
  fromBytesInternal(bytes, offset) {
    let length = bytes[offset++];
    let end = offset + length;
    let string = String.fromCharCode(...bytes.slice(offset, end));
    return [string, end];
  },
});

const CODE_NEG_INT8 = 0xff;
const CODE_INT16 = 0xfe;
const CODE_INT32 = 0xfd;
const CODE_INT64 = 0xfc;

const BinableBigintInteger = defineBinable({
  toBytes(n: bigint) {
    if (n >= 0) {
      if (n < 0x80n) return bigIntToBytes(n, 1);
      if (n < 0x8000n) return [CODE_INT16, ...bigIntToBytes(n, 2)];
      if (n < 0x80000000) return [CODE_INT32, ...bigIntToBytes(n, 4)];
      else return [CODE_INT64, ...bigIntToBytes(n, 8)];
    } else {
      let M = 1n << 64n;
      if (n >= -0x80n)
        return [CODE_NEG_INT8, ...bigIntToBytes((M + n) & 0xffn, 1)];
      if (n >= -0x8000n)
        return [CODE_INT16, ...bigIntToBytes((M + n) & 0xffffn, 2)];
      if (n >= 0x80000000)
        return [CODE_INT32, ...bigIntToBytes((M + n) & 0xffff_ffffn, 4)];
      else return [CODE_INT64, ...bigIntToBytes(M + n, 8)];
    }
  },
  fromBytesInternal(bytes, offset) {
    throw 'todo';
  },
});

// same as Random_oracle.prefix_to_field in OCaml
// converts string to bytes and bytes to field; throws if bytes don't fit in one field
function prefixToField<Field>(Field: GenericField<Field>, prefix: string) {
  if (prefix.length >= Field.sizeInBytes()) throw Error('prefix too long');
  return Field.fromBytes(stringToBytes(prefix));
}

function bitsToBytes([...bits]: boolean[]) {
  let bytes: number[] = [];
  while (bits.length > 0) {
    let byteBits = bits.splice(0, 8);
    let byte = 0;
    for (let i = 0; i < 8; i++) {
      if (!byteBits[i]) continue;
      byte |= 1 << i;
    }
    bytes.push(byte);
  }
  return bytes;
}

function bytesToBits(bytes: number[]) {
  return bytes
    .map((byte) => {
      let bits: boolean[] = Array(8);
      for (let i = 0; i < 8; i++) {
        bits[i] = !!(byte & 1);
        byte >>= 1;
      }
      return bits;
    })
    .flat();
}

/**
 * This takes a `Binable<T>` plus an optional `sizeInBits`, and derives toBits() / fromBits() functions.
 * - `sizeInBits` has to observe `Math.ceil(sizeInBits / 8) === sizeInBytes`, so the bit size can be slightly smaller than the byte size
 * - If `sizeInBits` is `< sizeInBytes * 8`, then we assume that toBytes() returns a byte sequence where the bits
 *   higher than `sizeInBits` are all 0. This assumption manifests in toBits(), where we slice off those higher bits,
 *   to return a result that is of length `sizeInBits`.
 *
 * This is useful for serializing field elements, where -- depending on the circumstance -- we either want a
 * 32-byte (= 256-bit) serialization, or a 255-bit serialization
 */
function withBits<T>(
  binable: Binable<T>,
  sizeInBits: number
): BinableWithBits<T> {
  return {
    ...binable,
    toBits(t: T) {
      return bytesToBits(binable.toBytes(t)).slice(0, sizeInBits);
    },
    fromBits(bits: boolean[]) {
      return binable.fromBytes(bitsToBytes(bits));
    },
    sizeInBytes() {
      return Math.ceil(sizeInBits / 8);
    },
    sizeInBits() {
      return sizeInBits;
    },
  };
}

function stringToBytes(s: string) {
  return [...s].map((_, i) => s.charCodeAt(i));
}
