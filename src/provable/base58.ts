import { versionBytes } from '../js_crypto/constants.js';
import { Ledger } from '../snarky.js';
import { Binable, withVersionNumber } from './binable.js';

export { base58, fieldEncodings, Base58 };

type Base58<T> = {
  toBase58(t: T): string;
  fromBase58(base58: string): T;
};

function base58<T>(binable: Binable<T>, versionByte: number): Base58<T> {
  return {
    toBase58(t) {
      let bytes = binable.toBytes(t);
      let binaryString = String.fromCharCode(...bytes);
      // this `ocamlBytes` structure is the js_of_ocaml representation of a byte array.
      // the `t: 9` is an integer tag that says the content is a full ASCII string,
      // see https://github.com/ocsigen/js_of_ocaml/blob/master/runtime/mlBytes.js
      let ocamlBytes = { t: 9, c: binaryString, l: bytes.length };
      return Ledger.encoding.toBase58(ocamlBytes, versionByte);
    },
    fromBase58(base58) {
      let ocamlBytes = Ledger.encoding.ofBase58(base58, versionByte);
      let bytes = [...ocamlBytes.c].map((_, i) => ocamlBytes.c.charCodeAt(i));
      return binable.fromBytes(bytes);
    },
  };
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
