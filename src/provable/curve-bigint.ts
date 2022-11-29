import { Fq } from '../js_crypto/finite_field.js';
import { GroupProjective, Pallas } from '../js_crypto/elliptic_curve.js';
import { versionBytes } from '../js_crypto/constants.js';
import { base58, tuple, withVersionNumber } from './binable.js';
import {
  BinableBigint,
  Bool,
  Field,
  ProvableBigint,
  pseudoClass,
} from './field-bigint.js';
import { provable } from './provable-bigint.js';

export { Group, PublicKey, Scalar, PrivateKey };

type Group = { x: Field; y: Field };
type PublicKey = { x: Field; isOdd: Bool };
type Scalar = bigint;
type PrivateKey = bigint;

const Group = {
  toProjective({ x, y }: Group): GroupProjective {
    return Pallas.ofAffine({ x, y, infinity: false });
  },
  fromProjective(point: GroupProjective): Group {
    let { x, y, infinity } = Pallas.toAffine(point);
    if (infinity) throw Error('Group.fromProjective: point is infinity');
    return { x, y };
  },
  get one(): Group {
    return this.fromProjective(Pallas.one);
  },
  scale(point: Group, scalar: Scalar): Group {
    return this.fromProjective(Pallas.scale(this.toProjective(point), scalar));
  },
};

// TODO generate
let FIELD_VERSION = 1;
let PUBLIC_KEY_VERSION = 1;

let FieldWithVersion = withVersionNumber(Field, FIELD_VERSION);
let BinablePublicKey = withVersionNumber(
  tuple([FieldWithVersion, Bool]),
  PUBLIC_KEY_VERSION
);
let Base58PublicKey = base58(BinablePublicKey, versionBytes.publicKey);

const PublicKey = {
  ...provable({ x: Field, isOdd: Bool }),

  toJSON({ x, isOdd }: PublicKey) {
    return Base58PublicKey.toBase58([x, isOdd]);
  },
  fromJSON(json: string): PublicKey {
    let [x, isOdd] = Base58PublicKey.fromBase58(json);
    return { x, isOdd };
  },
  toGroup({ x, isOdd }: PublicKey): Group {
    let { mul, add } = Field;
    let ySquared = add(mul(x, mul(x, x)), 5n);
    let y = Field.sqrt(ySquared);
    if (y === undefined) {
      throw Error('PublicKey.toGroup: not a valid group element');
    }
    if (isOdd !== (y & 1n)) y = Field.negate(y);
    return { x, y };
  },
  fromGroup({ x, y }: Group): PublicKey {
    let isOdd = (y & 1n) as Bool;
    return { x, isOdd };
  },
};

const OTHER_MODULUS =
  0x40000000000000000000000000000000224698fc0994a8dd8c46eb2100000001n;
const sizeInBits = OTHER_MODULUS.toString(2).length;
const sizeInBytes = Math.ceil(sizeInBits / 8);

const Scalar = pseudoClass(
  function Scalar(value: bigint | number | string): Scalar {
    return BigInt(value) % OTHER_MODULUS;
  },
  { ...ProvableBigint(), ...BinableBigint(sizeInBytes), ...Fq }
);

const PrivateKey = {
  ...Scalar,
  ...provable(Scalar),
};
