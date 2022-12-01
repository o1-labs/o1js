import { Fq } from '../js_crypto/finite_field.js';
import { GroupProjective, Pallas } from '../js_crypto/elliptic_curve.js';
import { versionBytes } from '../js_crypto/constants.js';
import { tuple, withVersionNumber } from './binable.js';
import { base58 } from './base58.js';
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

/**
 * A non-zero point on the Pallas curve in affine form { x, y }
 */
const Group = {
  toProjective({ x, y }: Group): GroupProjective {
    return Pallas.ofAffine({ x, y, infinity: false });
  },
  fromProjective(point: GroupProjective): Group {
    let { x, y, infinity } = Pallas.toAffine(point);
    if (infinity) throw Error('Group.fromProjective: point is infinity');
    return { x, y };
  },
  get generatorMina(): Group {
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

/**
 * A public key, represented by a non-zero point on the Pallas curve, in compressed form { x, isOdd }
 */
const PublicKey = {
  ...provable({ x: Field, isOdd: Bool }),

  toBase58({ x, isOdd }: PublicKey) {
    return Base58PublicKey.toBase58([x, isOdd]);
  },
  fromBase58(json: string): PublicKey {
    let [x, isOdd] = Base58PublicKey.fromBase58(json);
    return { x, isOdd };
  },

  toJSON(publicKey: PublicKey) {
    return this.toBase58(publicKey);
  },
  fromJSON(json: string): PublicKey {
    return this.fromBase58(json);
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

/**
 * The scalar field of the Pallas curve
 */
const Scalar = pseudoClass(
  function Scalar(value: bigint | number | string): Scalar {
    return BigInt(value) % Fq.modulus;
  },
  { ...ProvableBigint(), ...BinableBigint(Fq.sizeInBits), ...Fq }
);

let BinablePrivateKey = withVersionNumber(Scalar, versionNumbers.scalar);
let Base58PrivateKey = base58(BinablePrivateKey, versionBytes.privateKey);

/**
 * A private key, represented by a scalar of the Pallas curve
 */
const PrivateKey = {
  ...Scalar,
  ...provable(Scalar),
  ...Base58PrivateKey,
  ...BinablePrivateKey,
};
