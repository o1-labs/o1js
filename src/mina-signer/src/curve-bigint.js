import { Fq, mod } from '../../bindings/crypto/finite-field.js';
import { Pallas } from '../../bindings/crypto/elliptic-curve.js';
import { versionBytes } from '../../bindings/crypto/constants.js';
import { record, withCheck, withVersionNumber } from '../../bindings/lib/binable.js';
import { base58, withBase58 } from '../../lib/util/base58.js';
import { Bool, checkRange, Field, pseudoClass } from './field-bigint.js';
import { BinableBigint, SignableBigint, signable } from './derivers-bigint.js';
export { Group, PublicKey, Scalar, PrivateKey, versionNumbers };
// TODO generate
const versionNumbers = {
    field: 1,
    scalar: 1,
    publicKey: 1,
    signature: 1,
};
/**
 * A non-zero point on the Pallas curve in affine form { x, y }
 */
const Group = {
    toProjective({ x, y }) {
        return Pallas.fromAffine({ x, y, infinity: false });
    },
    /**
     * Convert a projective point to a non-zero affine point.
     * Throws an error if the point is zero / infinity, i.e. if z === 0
     */
    fromProjective(point) {
        let { x, y, infinity } = Pallas.toAffine(point);
        if (infinity)
            throw Error('Group.fromProjective: point is infinity');
        return { x, y };
    },
    get generatorMina() {
        return Group.fromProjective(Pallas.one);
    },
    scale(point, scalar) {
        return Group.fromProjective(Pallas.scale(Group.toProjective(point), scalar));
    },
    b: Pallas.b,
    toFields({ x, y }) {
        return [x, y];
    },
};
let FieldWithVersion = withVersionNumber(Field, versionNumbers.field);
let BinablePublicKey = withVersionNumber(withCheck(record({ x: FieldWithVersion, isOdd: Bool }, ['x', 'isOdd']), ({ x }) => {
    let { mul, add } = Field;
    let ySquared = add(mul(x, mul(x, x)), Pallas.b);
    if (!Field.isSquare(ySquared)) {
        throw Error('PublicKey: not a valid group element');
    }
}), versionNumbers.publicKey);
/**
 * A public key, represented by a non-zero point on the Pallas curve, in compressed form { x, isOdd }
 */
const PublicKey = {
    ...signable({ x: Field, isOdd: Bool }),
    ...withBase58(BinablePublicKey, versionBytes.publicKey),
    toJSON(publicKey) {
        return PublicKey.toBase58(publicKey);
    },
    fromJSON(json) {
        return PublicKey.fromBase58(json);
    },
    toGroup({ x, isOdd }) {
        let { mul, add } = Field;
        let ySquared = add(mul(x, mul(x, x)), Pallas.b);
        let y = Field.sqrt(ySquared);
        if (y === undefined) {
            throw Error('PublicKey.toGroup: not a valid group element');
        }
        if (isOdd !== !!(y & 1n))
            y = Field.negate(y);
        return { x, y };
    },
    fromGroup({ x, y }) {
        let isOdd = !!(y & 1n);
        return { x, isOdd };
    },
    equal(pk1, pk2) {
        return pk1.x === pk2.x && pk1.isOdd === pk2.isOdd;
    },
    toInputLegacy({ x, isOdd }) {
        return { fields: [x], bits: [!!isOdd] };
    },
};
const checkScalar = checkRange(0n, Fq.modulus, 'Scalar');
/**
 * The scalar field of the Pallas curve
 */
const Scalar = pseudoClass(function Scalar(value) {
    return mod(BigInt(value), Fq.modulus);
}, {
    ...SignableBigint(checkScalar),
    ...BinableBigint(Fq.sizeInBits, checkScalar),
    ...Fq,
});
let BinablePrivateKey = withVersionNumber(Scalar, versionNumbers.scalar);
let Base58PrivateKey = base58(BinablePrivateKey, versionBytes.privateKey);
/**
 * A private key, represented by a scalar of the Pallas curve
 */
const PrivateKey = {
    ...Scalar,
    ...signable(Scalar),
    ...Base58PrivateKey,
    ...BinablePrivateKey,
    toPublicKey(key) {
        return PublicKey.fromGroup(Group.scale(Group.generatorMina, key));
    },
    convertPrivateKeyToBase58WithMod,
};
const Bigint256 = BinableBigint(256, () => {
    // no check supplied, allows any string of 256 bits
});
const OutOfDomainKey = base58(withVersionNumber(Bigint256, versionNumbers.scalar), versionBytes.privateKey);
function convertPrivateKeyToBase58WithMod(keyBase58) {
    let key = OutOfDomainKey.fromBase58(keyBase58);
    key = mod(key, Fq.modulus);
    return PrivateKey.toBase58(key);
}
