import { Ledger } from '../snarky.js';
import { base58, tuple, withVersionNumber } from './binable.js';
import { Bool, Field } from './field-bigint.js';
import { provable } from './provable-bigint.js';

export { PublicKey };

type PublicKey = { x: Field; isOdd: Bool };

// TODO generate
let FIELD_VERSION = 1;
let PUBLIC_KEY_VERSION = 1;

let FieldWithVersion = withVersionNumber(Field, FIELD_VERSION);
let BinablePublicKey = withVersionNumber(
  tuple([FieldWithVersion, Bool]),
  PUBLIC_KEY_VERSION
);
let Base58PublicKey = base58(
  BinablePublicKey,
  () => Ledger.encoding.versionBytes.publicKey
);

const PublicKey = {
  ...provable({ x: Field, isOdd: Bool }),

  toJSON({ x, isOdd }: PublicKey) {
    return Base58PublicKey.toBase58([x, isOdd]);
  },
  fromJSON(json: string): PublicKey {
    let [x, isOdd] = Base58PublicKey.fromBase58(json);
    return { x, isOdd };
  },
};
