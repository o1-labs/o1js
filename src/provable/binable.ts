// generic encoding infrastructure
import { Ledger } from '../snarky.js';
import { GenericField } from './generic.js';

export {
  Binable,
  Base58,
  withVersionNumber,
  compose,
  base58,
  fieldEncodings,
  prefixToField,
  bytesToBits,
  bitsToBytes,
};

type Binable<T> = {
  toBytes(t: T): number[];
  fromBytes(bytes: number[]): T;
  sizeInBytes(): number;
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

function compose<Types extends Tuple<any>>(
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

type Base58<T> = {
  toBase58(t: T): string;
  fromBase58(base58: string): T;
};

function base58<T>(binable: Binable<T>, versionByte: () => number): Base58<T> {
  return {
    toBase58(t) {
      let bytes = binable.toBytes(t);
      let binaryString = String.fromCharCode(...bytes);
      let ocamlBytes = { t: 9, c: binaryString, l: bytes.length };
      return Ledger.encoding.toBase58(ocamlBytes, versionByte());
    },
    fromBase58(base58) {
      let ocamlBytes = Ledger.encoding.ofBase58(base58, versionByte());
      let bytes = [...ocamlBytes.c].map((_, i) => ocamlBytes.c.charCodeAt(i));
      return binable.fromBytes(bytes);
    },
  };
}

// encoding of fields as base58, compatible with ocaml encodings (provided the versionByte and versionNumber are the same)

function customEncoding<Field>(
  Field: Binable<Field>,
  versionByte: () => number,
  versionNumber?: number
) {
  return base58(withVersionNumber(Field, versionNumber), versionByte);
}

const RECEIPT_CHAIN_HASH_VERSION = 1;
const LEDGER_HASH_VERSION = 1;
const EPOCH_SEED_VERSION = 1;
const STATE_HASH_VERSION = 1;

function fieldEncodings<Field>(Field: Binable<Field>) {
  const TokenId = customEncoding(
    Field,
    () => Ledger.encoding.versionBytes.tokenIdKey
  );
  const ReceiptChainHash = customEncoding(
    Field,
    () => Ledger.encoding.versionBytes.receiptChainHash,
    RECEIPT_CHAIN_HASH_VERSION
  );
  const LedgerHash = customEncoding(
    Field,
    () => Ledger.encoding.versionBytes.ledgerHash,
    LEDGER_HASH_VERSION
  );
  const EpochSeed = customEncoding(
    Field,
    () => Ledger.encoding.versionBytes.epochSeed,
    EPOCH_SEED_VERSION
  );
  const StateHash = customEncoding(
    Field,
    () => Ledger.encoding.versionBytes.stateHash,
    STATE_HASH_VERSION
  );
  return { TokenId, ReceiptChainHash, LedgerHash, EpochSeed, StateHash };
}

// same as Random_oracle.prefix_to_field in OCaml
// converts string to bytes and bytes to field; throws if bytes don't fit in one field
function prefixToField<Field>(Field: GenericField<Field>, prefix: string) {
  if (prefix.length >= Field.sizeInBytes()) throw Error('prefix too long');
  let bytes = [...prefix].map((char) => char.charCodeAt(0));
  return Field.fromBytes(bytes);
}

function bitsToBytes(bits: boolean[]) {
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
