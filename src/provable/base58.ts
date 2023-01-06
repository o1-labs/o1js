import { versionBytes } from '../js_crypto/constants.js';
import { Ledger } from '../snarky.js';
import { Binable, stringToBytes, withVersionNumber } from './binable.js';
import sha256 from 'crypto-js/sha256.js';
import { changeBase } from '../js_crypto/bigint-helpers.js';

export {
  stringToDigits,
  toBase58Check,
  base58,
  withBase58,
  fieldEncodings,
  Base58,
};

const alphabet =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.split('');
let inverseAlphabet: Record<string, number> = {};
alphabet.forEach((c, i) => {
  inverseAlphabet[c] = i;
});

function stringToDigits(string: string) {
  return [...string].map((c) => inverseAlphabet[c]);
}

function toBase58Check(input: number[] | Uint8Array, versionByte: number) {
  let withVersion = [versionByte, ...input];
  let checksum = computeChecksum(withVersion);
  let withChecksum = withVersion.concat(checksum);
  return toBase58(withChecksum);
}

function toBase58(bytes: number[] | Uint8Array) {
  console.log('bytes js', bytes);
  // count the leading zeroes. these get turned into leading zeroes in the output
  let z = 0;
  while (bytes[z] === 0) z++;
  // for some reason, this is big-endian, so we need to reverse
  let digits = [...bytes].map(BigInt).reverse();
  // change base and reverse
  let base58Digits = changeBase(digits, 256n, 58n).reverse();
  // add leading zeroes, map into alphabet
  base58Digits = Array(z).fill(0).concat(base58Digits);
  return base58Digits.map((x) => alphabet[Number(x)]).join('');
}

function computeChecksum(input: number[] | Uint8Array) {
  let inputString = String.fromCharCode(...input);
  let hash = sha256(sha256(inputString));
  // first 4 bytes = first int32 word
  let int32Array = new Int32Array([hash.words[0]]);
  return [...new Uint8Array(int32Array.buffer)].reverse();
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
      // let binaryString = String.fromCharCode(...bytes);
      // // this `ocamlBytes` structure is the js_of_ocaml representation of a byte array.
      // // the `t: 9` is an integer tag that says the content is a full ASCII string,
      // // see https://github.com/ocsigen/js_of_ocaml/blob/master/runtime/mlBytes.js
      // let ocamlBytes = { t: 9, c: binaryString, l: bytes.length };
      // return Ledger.encoding.toBase58(ocamlBytes, versionByte);
    },
    fromBase58(base58) {
      let ocamlBytes = Ledger.encoding.ofBase58(base58, versionByte);
      let bytes = stringToBytes(ocamlBytes.c);
      return binable.fromBytes(bytes);
    },
  };
}

function withBase58<T>(
  binable: Binable<T>,
  versionByte: number
): Binable<T> & Base58<T> {
  return { ...binable, ...base58(binable, versionByte) };
}

// encoding of fields as base58, compatible with ocaml encodings (provided the versionByte and versionNumber are the same)

function customEncoding<Field>(
  Field: Binable<Field>,
  versionByte: number,
  versionNumber?: number
) {
  return base58(withVersionNumber(Field, versionNumber), versionByte);
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
  const LedgerHash = customEncoding(
    Field,
    versionBytes.ledgerHash,
    LEDGER_HASH_VERSION
  );
  const EpochSeed = customEncoding(
    Field,
    versionBytes.epochSeed,
    EPOCH_SEED_VERSION
  );
  const StateHash = customEncoding(
    Field,
    versionBytes.stateHash,
    STATE_HASH_VERSION
  );
  return { TokenId, ReceiptChainHash, LedgerHash, EpochSeed, StateHash };
}
