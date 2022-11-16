import { Ledger } from '../snarky.js';
import { base58, tuple, withVersionNumber } from './binable.js';
import {
  BinableBigint,
  Bool,
  Field,
  ProvableBigint,
  pseudoClass,
} from './field-bigint.js';
import { provable } from './provable-bigint.js';

export { PublicKey, PrivateKey };

type PublicKey = { x: Field; isOdd: Bool };
type Scalar = bigint;
type PrivateKey = bigint;

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

const OTHER_MODULUS =
  0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001n;
const SIZE_IN_BITS = OTHER_MODULUS.toString(2).length;
const SIZE_IN_BYTES = Math.ceil(SIZE_IN_BITS / 8);

const Scalar = pseudoClass(
  function Scalar(value: bigint | number | string): Scalar {
    return BigInt(value) % OTHER_MODULUS;
  },
  { ...ProvableBigint(), ...BinableBigint(SIZE_IN_BYTES) }
);

const PrivateKey = {
  ...provable(Scalar),
};
