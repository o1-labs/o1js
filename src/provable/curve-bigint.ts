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

export { Group, PublicKey, Scalar, PrivateKey, versionNumbers };

// TODO generate
const versionNumbers = {
  field: 1,
  scalar: 1,
  publicKey: 1,
  signature: 1,
};

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

let FieldWithVersion = withVersionNumber(Field, versionNumbers.field);
let BinablePublicKey = withVersionNumber(
  tuple([FieldWithVersion, Bool]),
  versionNumbers.publicKey
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

const Scalar = pseudoClass(
  function Scalar(value: bigint | number | string): Scalar {
    return BigInt(value) % Fq.modulus;
  },
  { ...ProvableBigint(), ...BinableBigint(Fq.sizeInBits), ...Fq }
);

let BinablePrivateKey = withVersionNumber(Scalar, versionNumbers.scalar);
let Base58PrivateKey = base58(BinablePrivateKey, versionBytes.privateKey);

const PrivateKey = {
  ...Scalar,
  ...provable(Scalar),
  ...Base58PrivateKey,
  ...BinablePrivateKey,
};
