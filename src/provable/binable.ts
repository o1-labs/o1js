// generic encoding infrastructure
import { GenericField } from './generic.js';

export {
  Binable,
  withVersionNumber,
  tuple,
  prefixToField,
  bytesToBits,
  bitsToBytes,
  withBits,
  BinableWithBits,
};

type Binable<T> = {
  toBytes(t: T): number[];
  fromBytes(bytes: number[]): T;
  sizeInBytes(): number;
};
type BinableWithBits<T> = Binable<T> & {
  toBits(t: T): boolean[];
  fromBits(bits: boolean[]): T;
  sizeInBits(): number;
};

function withVersionNumber<T>(
  binable: Binable<T>,
  versionNumber?: number
): Binable<T> {
  return {
    toBytes(t) {
      let bytes = binable.toBytes(t);
      if (versionNumber !== undefined) bytes.unshift(versionNumber);
      return bytes;
    },
    fromBytes(bytes) {
      if (versionNumber !== undefined) bytes.shift();
      return binable.fromBytes(bytes);
    },
    sizeInBytes() {
      let size = binable.sizeInBytes();
      return versionNumber !== undefined ? size + 1 : size;
    },
  };
}

type Tuple<T> = [T, ...T[]] | [];

function tuple<Types extends Tuple<any>>(
  binables: Array<any> & {
    [i in keyof Types]: Binable<Types[i]>;
  }
): Binable<Types> {
  let n = binables.length;
  let sizes = binables.map((b) => b.sizeInBytes());
  let totalSize = sizes.reduce((s, c) => s + c);
  return {
    toBytes(t) {
      let bytes: number[] = [];
      for (let i = 0; i < n; i++) {
        let subBytes = binables[i].toBytes(t[i]);
        bytes.push(...subBytes);
      }

      return bytes;
    },
    fromBytes(bytes): Types {
      let offset = 0;
      let values = [];
      for (let i = 0; i < n; i++) {
        let size = sizes[i];
        let subBytes = bytes.slice(offset, offset + size);
        let value = binables[i].fromBytes(subBytes);
        values.push(value);
        offset += size;
      }
      return values as any;
    },
    sizeInBytes() {
      return totalSize;
    },
  };
}

// same as Random_oracle.prefix_to_field in OCaml
// converts string to bytes and bytes to field; throws if bytes don't fit in one field
function prefixToField<Field>(Field: GenericField<Field>, prefix: string) {
  if (prefix.length >= Field.sizeInBytes()) throw Error('prefix too long');
  let bytes = [...prefix].map((char) => char.charCodeAt(0));
  return Field.fromBytes(bytes);
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

function withBits<T>(
  binable: Binable<T>,
  sizeInBits?: number
): BinableWithBits<T> {
  sizeInBits ??= binable.sizeInBytes() * 8;
  return {
    ...binable,
    toBits(t: T) {
      return bytesToBits(binable.toBytes(t)).slice(0, sizeInBits);
    },
    fromBits(bits: boolean[]) {
      return binable.fromBytes(bitsToBytes(bits));
    },
    sizeInBits() {
      return sizeInBits!;
    },
  };
}
