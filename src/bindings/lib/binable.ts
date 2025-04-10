// generic encoding infrastructure
import {
  assertNonNegativeInteger,
  NonNegativeInteger,
  PositiveInteger,
} from '../crypto/non-negative.js';
import { bytesToBigInt, bigIntToBytes } from '../crypto/bigint-helpers.js';
import { GenericSignableField } from './generic.js';

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
  stringFromBytes,
  stringLengthInBytes,
  BinableString,
  BinableInt32,
  BinableInt64,
  BinableUint32,
  BinableUint64,
};

type Binable<T> = {
  toBytes(t: T): number[];
  readBytes<N extends number>(
    bytes: number[],
    offset: NonNegativeInteger<N>
  ): [value: T, offset: number];
  fromBytes(bytes: number[]): T;
};
type BinableWithBits<T> = Binable<T> & {
  toBits(t: T): boolean[];
  fromBits(bits: boolean[]): T;
  sizeInBytes: number;
  sizeInBits: number;
};

function defineBinable<T>({
  toBytes,
  readBytes,
}: {
  toBytes(t: T): number[];
  readBytes<N extends number>(
    bytes: number[],
    offset: NonNegativeInteger<N>
  ): [value: T, offset: number];
}): Binable<T> {
  // spec: input offset has to be a non-negative integer, and be smaller than the bytes length
  // output offset has to be greater or equal input, and not exceed the bytes length
  let readBytes_ = <N extends number>(
    bytes: number[],
    offset: NonNegativeInteger<N>
  ) => {
    assertNonNegativeInteger(offset, 'readBytes: offset must be integer >= 0');
    if (offset >= bytes.length)
      throw Error('readBytes: offset must be within bytes length');
    let [value, end] = readBytes(bytes, offset);
    if (end < offset)
      throw Error(
        'offset returned by readBytes must be greater than initial offset'
      );
    if (end > bytes.length)
      throw Error('offset returned by readBytes must not exceed bytes length');
    return [value, end] as [T, number];
  };
  return {
    toBytes,
    readBytes: readBytes_,
    // spec: fromBytes throws if the input bytes are not all used
    fromBytes(bytes) {
      let [value, offset] = readBytes_(bytes, 0);
      if (offset < bytes.length)
        throw Error('fromBytes: input bytes left over');
      return value;
    },
  };
}

function withVersionNumber<T>(
  binable: Binable<T>,
  versionNumber: number
): Binable<T> {
  return defineBinable({
    toBytes(t) {
      let bytes = binable.toBytes(t);
      bytes.unshift(versionNumber);
      return bytes;
    },
    readBytes(bytes, offset) {
      let version = bytes[offset++];
      if (version !== versionNumber) {
        throw Error(
          `fromBytes: Invalid version byte. Expected ${versionNumber}, got ${version}.`
        );
      }
      return binable.readBytes(bytes, offset);
    },
  });
}

function withCheck<T>(
  { toBytes, readBytes }: Binable<T>,
  check: (t: T) => void
): Binable<T> {
  return defineBinable({
    toBytes,
    readBytes(bytes, start) {
      let [value, end] = readBytes(bytes, start);
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
    readBytes(bytes, start) {
      let [tupleValue, end] = tupleBinable.readBytes(bytes, start);
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
    readBytes(bytes, offset) {
      let values = [];
      for (let i = 0; i < n; i++) {
        let [value, newOffset] = binables[i].readBytes(bytes, offset);
        offset = newOffset as any;
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
  [i in number]: Enum_[i] extends EnumWithArgument<string, any>
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
    readBytes(bytes, offset) {
      let i = bytes[offset];
      offset++;
      let type = types[i];
      if ('value' in type) {
        let [value, end] = type.value.readBytes(bytes, offset);
        return [{ type: type.type, value }, end];
      }
      return [{ type: type.type }, offset];
    },
  });
}

const BinableString = defineBinable({
  toBytes(t: string) {
    return [stringLengthInBytes(t), ...stringToBytes(t)];
  },
  readBytes(bytes, offset) {
    let length = bytes[offset++];
    let end = offset + length;
    let string = stringFromBytes(bytes.slice(offset, end));
    return [string, end];
  },
});

const CODE_NEG_INT8 = 0xff;
const CODE_INT16 = 0xfe;
const CODE_INT32 = 0xfd;
const CODE_INT64 = 0xfc;

function BinableInt<N extends number>(bits: PositiveInteger<N>) {
  let maxValue = 1n << BigInt(bits - 1);
  let nBytes = bits >> 3;
  if (nBytes * 8 !== bits) throw Error('bits must be evenly divisible by 8');
  return defineBinable({
    toBytes(n: bigint) {
      if (n < -maxValue || n >= maxValue)
        throw Error(`int${bits} out of range, got ${n}`);
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
        if (n >= -0x80000000)
          return [CODE_INT32, ...bigIntToBytes((M + n) & 0xffff_ffffn, 4)];
        else return [CODE_INT64, ...bigIntToBytes(M + n, 8)];
      }
    },
    readBytes(bytes, offset) {
      let code = bytes[offset++];
      if (code < 0x80) return [BigInt(code), offset];
      let size = {
        [CODE_NEG_INT8]: 1,
        [CODE_INT16]: 2,
        [CODE_INT32]: 4,
        [CODE_INT64]: 8,
      }[code];
      if (size === undefined) {
        throw Error('binable integer: invalid start byte');
      }
      let end = offset + size;
      let x = fillUInt(bytes.slice(offset, end), nBytes);
      // map from uint to int range
      if (x >= maxValue) {
        x -= 2n * maxValue;
      }
      if (x < -maxValue || x >= maxValue) {
        throw Error(`int${bits} out of range, got ${x}`);
      }
      return [x, end];
    },
  });
}

function fillUInt(startBytes: number[], nBytes: number) {
  let n = startBytes.length;
  // fill up int with the highest bit of startBytes
  let lastBit = startBytes[n - 1] >> 7;
  let fillByte = lastBit === 1 ? 0xff : 0x00;
  let intBytes = startBytes.concat(Array(nBytes - n).fill(fillByte));
  // interpret result as a bigint > 0
  let x = bytesToBigInt(intBytes);
  return x;
}

function BinableUint<N extends number>(bits: PositiveInteger<N>) {
  let binableInt = BinableInt(bits);
  let maxValue = 1n << BigInt(bits - 1);
  return iso(binableInt, {
    to(uint: bigint) {
      if (uint < 0n || uint >= 2n * maxValue)
        throw Error(`uint${bits} out of range, got ${uint}`);
      let ret = uint >= maxValue ? uint - 2n * maxValue : uint;
      return ret;
    },
    from(int: bigint) {
      let uint = int < 0n ? int + 2n * maxValue : int;
      if (uint < 0n || uint >= 2n * maxValue)
        throw Error(`uint${bits} out of range, got ${uint}`);
      return uint;
    },
  });
}

const BinableInt64 = BinableInt(64);
const BinableInt32 = BinableInt(32);
const BinableUint64 = BinableUint(64);
const BinableUint32 = BinableUint(32);

// same as Random_oracle.prefix_to_field in OCaml
// converts string to bytes and bytes to field; throws if bytes don't fit in one field
function prefixToField<Field>(
  Field: GenericSignableField<Field>,
  prefix: string
) {
  let fieldSize = Field.sizeInBytes;
  if (prefix.length >= fieldSize) throw Error('prefix too long');
  let stringBytes = stringToBytes(prefix);
  return Field.fromBytes(
    stringBytes.concat(Array(fieldSize - stringBytes.length).fill(0))
  );
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
    sizeInBytes: Math.ceil(sizeInBits / 8),
    sizeInBits,
  };
}

function iso<T, S>(
  binable: Binable<T>,
  { to, from }: { to(s: S): T; from(t: T): S }
): Binable<S> {
  return defineBinable({
    toBytes(s: S) {
      return binable.toBytes(to(s));
    },
    readBytes(bytes, offset) {
      let [value, end] = binable.readBytes(bytes, offset);
      return [from(value), end];
    },
  });
}

let encoder = new TextEncoder();
let decoder = new TextDecoder();

function stringToBytes(s: string) {
  return [...encoder.encode(s)];
}
function stringFromBytes(bytes: number[]) {
  return decoder.decode(Uint8Array.from(bytes));
}
function stringLengthInBytes(s: string) {
  return encoder.encode(s).length;
}
