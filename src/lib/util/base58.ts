import { versionBytes } from '../../bindings/crypto/constants.js';
import { Binable, withVersionNumber } from '../../bindings/lib/binable.js';
import { sha256 } from 'js-sha256';
import { changeBase } from '../../bindings/crypto/bigint-helpers.js';

export { toBase58Check, fromBase58Check, base58, withBase58, fieldEncodings, Base58, alphabet };

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.split('');
const inverseAlphabet = Object.fromEntries(alphabet.map((c, i) => [c, i]));

function toBase58Check(input: number[] | Uint8Array, versionByte: number) {
  const withVersion = [versionByte, ...input];
  const checksum = computeChecksum(withVersion);
  const withChecksum = withVersion.concat(checksum);
  return toBase58(withChecksum);
}

function fromBase58Check(base58: string, versionByte: number) {
  // throws on invalid character
  const bytes = fromBase58(base58);
  // check checksum
  const checksum = bytes.slice(-4);
  const originalBytes = bytes.slice(0, -4);
  const actualChecksum = computeChecksum(originalBytes);
  if (!arrayEqual(checksum, actualChecksum)) throw Error('fromBase58Check: invalid checksum');
  // check version byte
  if (originalBytes[0] !== versionByte)
    throw Error(
      `fromBase58Check: input version byte ${versionByte} does not match encoded version byte ${originalBytes[0]}`
    );
  // return result
  return originalBytes.slice(1);
}

function toBase58(bytes: number[] | Uint8Array) {
  // count the leading zeroes. these get turned into leading zeroes in the output
  let z = 0;
  while (z < bytes.length && bytes[z] === 0) z++;
  
  // for some reason, this is big-endian, so we need to reverse
  const digits = Array.isArray(bytes) ? bytes.map(BigInt).reverse() : Array.from(bytes).map(BigInt).reverse();
  
  // change base and reverse
  const base58Digits = changeBase(digits, 256n, 58n).reverse();
  
  // add leading zeroes, map into alphabet
  const result = new Array(z).fill(alphabet[0]);
  base58Digits.forEach((x: bigint) => result.push(alphabet[Number(x)]));
  return result.join('');
}

function fromBase58(base58: string) {
  const chars = base58.split('');
  let z = 0;
  while (z < chars.length && chars[z] === alphabet[0]) z++;
  
  const base58Digits: bigint[] = [];
  for (let i = z; i < chars.length; i++) {
    const digit = inverseAlphabet[chars[i]];
    if (digit === undefined) throw Error('fromBase58: invalid character');
    base58Digits.push(BigInt(digit));
  }
  
  const digits = base58Digits.length === 0 ? [] : changeBase(base58Digits.reverse(), 58n, 256n).reverse();
  const result = new Array(z).fill(0);
  digits.forEach((d: bigint) => result.push(Number(d)));
  return result;
}

function computeChecksum(input: number[] | Uint8Array) {
  const hash1 = sha256.create();
  hash1.update(input);
  const hash2 = sha256.create();
  hash2.update(hash1.array());
  return hash2.array().slice(0, 4);
}

type Base58<T> = {
  toBase58(t: T): string;
  fromBase58(base58: string): T;
};

function base58<T>(binable: Binable<T>, versionByte: number): Base58<T> {
  return {
    toBase58(t) {
      const bytes = binable.toBytes(t);
      return toBase58Check(bytes, versionByte);
    },
    fromBase58(base58) {
      const bytes = fromBase58Check(base58, versionByte);
      return binable.fromBytes(bytes);
    },
  };
}

function withBase58<T>(binable: Binable<T>, versionByte: number): Binable<T> & Base58<T> {
  return { ...binable, ...base58(binable, versionByte) };
}

// encoding of fields as base58, compatible with ocaml encodings (provided the versionByte and versionNumber are the same)

function customEncoding<Field>(Field: Binable<Field>, versionByte: number, versionNumber?: number) {
  const customField = versionNumber !== undefined ? withVersionNumber(Field, versionNumber) : Field;
  return base58(customField, versionByte);
}

const RECEIPT_CHAIN_HASH_VERSION = 1;
const LEDGER_HASH_VERSION = 1;
const EPOCH_SEED_VERSION = 1;
const STATE_HASH_VERSION = 1;

function fieldEncodings<Field>(Field: Binable<Field>) {
  const TokenId = customEncoding(Field, versionBytes.tokenIdKey);
  const ReceiptChainHash = customEncoding(
    Field,
    versionBytes.receiptChainHash,
    RECEIPT_CHAIN_HASH_VERSION
  );
  const LedgerHash = customEncoding(Field, versionBytes.ledgerHash, LEDGER_HASH_VERSION);
  const EpochSeed = customEncoding(Field, versionBytes.epochSeed, EPOCH_SEED_VERSION);
  const StateHash = customEncoding(Field, versionBytes.stateHash, STATE_HASH_VERSION);
  return { TokenId, ReceiptChainHash, LedgerHash, EpochSeed, StateHash };
}

function arrayEqual(a: unknown[], b: unknown[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
