"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionNumbers = exports.PrivateKey = exports.Scalar = exports.PublicKey = exports.Group = void 0;
const finite_field_js_1 = require("../../bindings/crypto/finite-field.js");
const elliptic_curve_js_1 = require("../../bindings/crypto/elliptic-curve.js");
const constants_js_1 = require("../../bindings/crypto/constants.js");
const binable_js_1 = require("../../bindings/lib/binable.js");
const base58_js_1 = require("../../lib/util/base58.js");
const field_bigint_js_1 = require("./field-bigint.js");
const derivers_bigint_js_1 = require("./derivers-bigint.js");
// TODO generate
const versionNumbers = {
    field: 1,
    scalar: 1,
    publicKey: 1,
    signature: 1,
};
exports.versionNumbers = versionNumbers;
/**
 * A non-zero point on the Pallas curve in affine form { x, y }
 */
const Group = {
    toProjective({ x, y }) {
        return elliptic_curve_js_1.Pallas.fromAffine({ x, y, infinity: false });
    },
    /**
     * Convert a projective point to a non-zero affine point.
     * Throws an error if the point is zero / infinity, i.e. if z === 0
     */
    fromProjective(point) {
        let { x, y, infinity } = elliptic_curve_js_1.Pallas.toAffine(point);
        if (infinity)
            throw Error('Group.fromProjective: point is infinity');
        return { x, y };
    },
    get generatorMina() {
        return Group.fromProjective(elliptic_curve_js_1.Pallas.one);
    },
    scale(point, scalar) {
        return Group.fromProjective(elliptic_curve_js_1.Pallas.scale(Group.toProjective(point), scalar));
    },
    b: elliptic_curve_js_1.Pallas.b,
    toFields({ x, y }) {
        return [x, y];
    },
};
exports.Group = Group;
let FieldWithVersion = (0, binable_js_1.withVersionNumber)(field_bigint_js_1.Field, versionNumbers.field);
let BinablePublicKey = (0, binable_js_1.withVersionNumber)((0, binable_js_1.withCheck)((0, binable_js_1.record)({ x: FieldWithVersion, isOdd: field_bigint_js_1.Bool }, ['x', 'isOdd']), ({ x }) => {
    let { mul, add } = field_bigint_js_1.Field;
    let ySquared = add(mul(x, mul(x, x)), elliptic_curve_js_1.Pallas.b);
    if (!field_bigint_js_1.Field.isSquare(ySquared)) {
        throw Error('PublicKey: not a valid group element');
    }
}), versionNumbers.publicKey);
/**
 * A public key, represented by a non-zero point on the Pallas curve, in compressed form { x, isOdd }
 */
const PublicKey = {
    ...(0, derivers_bigint_js_1.signable)({ x: field_bigint_js_1.Field, isOdd: field_bigint_js_1.Bool }),
    ...(0, base58_js_1.withBase58)(BinablePublicKey, constants_js_1.versionBytes.publicKey),
    toJSON(publicKey) {
        return PublicKey.toBase58(publicKey);
    },
    fromJSON(json) {
        return PublicKey.fromBase58(json);
    },
    toGroup({ x, isOdd }) {
        let { mul, add } = field_bigint_js_1.Field;
        let ySquared = add(mul(x, mul(x, x)), elliptic_curve_js_1.Pallas.b);
        let y = field_bigint_js_1.Field.sqrt(ySquared);
        if (y === undefined) {
            throw Error('PublicKey.toGroup: not a valid group element');
        }
        if (isOdd !== !!(y & 1n))
            y = field_bigint_js_1.Field.negate(y);
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
exports.PublicKey = PublicKey;
const checkScalar = (0, field_bigint_js_1.checkRange)(0n, finite_field_js_1.Fq.modulus, 'Scalar');
/**
 * The scalar field of the Pallas curve
 */
const Scalar = (0, field_bigint_js_1.pseudoClass)(function Scalar(value) {
    return (0, finite_field_js_1.mod)(BigInt(value), finite_field_js_1.Fq.modulus);
}, {
    ...(0, derivers_bigint_js_1.SignableBigint)(checkScalar),
    ...(0, derivers_bigint_js_1.BinableBigint)(finite_field_js_1.Fq.sizeInBits, checkScalar),
    ...finite_field_js_1.Fq,
});
exports.Scalar = Scalar;
let BinablePrivateKey = (0, binable_js_1.withVersionNumber)(Scalar, versionNumbers.scalar);
let Base58PrivateKey = (0, base58_js_1.base58)(BinablePrivateKey, constants_js_1.versionBytes.privateKey);
/**
 * A private key, represented by a scalar of the Pallas curve
 */
const PrivateKey = {
    ...Scalar,
    ...(0, derivers_bigint_js_1.signable)(Scalar),
    ...Base58PrivateKey,
    ...BinablePrivateKey,
    toPublicKey(key) {
        return PublicKey.fromGroup(Group.scale(Group.generatorMina, key));
    },
    convertPrivateKeyToBase58WithMod,
};
exports.PrivateKey = PrivateKey;
const Bigint256 = (0, derivers_bigint_js_1.BinableBigint)(256, () => {
    // no check supplied, allows any string of 256 bits
});
const OutOfDomainKey = (0, base58_js_1.base58)((0, binable_js_1.withVersionNumber)(Bigint256, versionNumbers.scalar), constants_js_1.versionBytes.privateKey);
function convertPrivateKeyToBase58WithMod(keyBase58) {
    let key = OutOfDomainKey.fromBase58(keyBase58);
    key = (0, finite_field_js_1.mod)(key, finite_field_js_1.Fq.modulus);
    return PrivateKey.toBase58(key);
}
