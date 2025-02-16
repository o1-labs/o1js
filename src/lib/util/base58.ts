import { versionBytes } from '../../bindings/crypto/constants.js';
import { Binable, withVersionNumber } from '../../bindings/lib/binable.js';
import { sha256 } from 'js-sha256';
import { changeBase } from '../../bindings/crypto/bigint-helpers.js';

export { toBase58Check, fromBase58Check, base58, withBase58, fieldEncodings, Base58, alphabet };

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.split('');
let inverseAlphabet: Record<string, number> = {};
alphabet.forEach((c, i) => {
  inverseAlphabet[c] = i;
});

function toBase58Check(input: number[] | Uint8Array, versionByte: number) {
  let withVersion = [versionByte, ...input];
  let checksum = computeChecksum(withVersion);
  let withChecksum = withVersion.concat(checksum);
  return toBase58(withChecksum);
}

function fromBase58Check(base58: string, versionByte: number) {
  // throws on invalid character
  let bytes = fromBase58(base58);
  // check checksum
  let checksum = bytes.slice(-4);
  let originalBytes = bytes.slice(0, -4);
  let actualChecksum = computeChecksum(originalBytes);
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
  while (bytes[z] === 0) z++;
  // for some reason, this is big-endian, so we need to reverse
  let digits = [...bytes].map(BigInt).reverse();
  // change base and reverse
  let base58Digits = changeBase(digits, 256n, 58n).reverse();
  // add leading zeroes, map into alphabet
  base58Digits = Array(z).fill(0n).concat(base58Digits);
  return base58Digits.map((x) => alphabet[Number(x)]).join('');
}

function fromBase58(base58: string) {
  let base58Digits = [...base58].map((c) => {
    let digit = inverseAlphabet[c];
    if (digit === undefined) throw Error('fromBase58: invalid character');
    return BigInt(digit);
  });
  let z = 0;
  while (base58Digits[z] === 0n) z++;
  let digits = changeBase(base58Digits.reverse(), 58n, 256n).reverse();
  digits = Array(z).fill(0n).concat(digits);
  return digits.map(Number);
}

function computeChecksum(input: number[] | Uint8Array) {
  let hash1 = sha256.create();
  hash1.update(input);
  let hash2 = sha256.create();
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
      let bytes = binable.toBytes(t);
      return toBase58Check(bytes, versionByte);
    },
    fromBase58(base58) {
      let bytes = fromBase58Check(base58, versionByte);
      return binable.fromBytes(bytes);
    },
  };
}

function withBase58<T>(binable: Binable<T>, versionByte: number): Binable<T> & Base58<T> {
  return { ...binable, ...base58(binable, versionByte) };
}

// encoding of fields as base58, compatible with ocaml encodings (provided the versionByte and versionNumber are the same)

function customEncoding<Field>(Field: Binable<Field>, versionByte: number, versionNumber?: number) {
  let customField = versionNumber !== undefined ? withVersionNumber(Field, versionNumber) : Field;
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
