"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zkAppBodyPrefix = exports.signaturePrefix = exports.deriveNonce = exports.verifyLegacy = exports.signLegacy = exports.Signature = exports.verifyFieldElement = exports.signFieldElement = exports.verify = exports.sign = void 0;
const blakejs_1 = require("blakejs");
const field_bigint_js_1 = require("./field-bigint.js");
const curve_bigint_js_1 = require("./curve-bigint.js");
const poseidon_bigint_js_1 = require("./poseidon-bigint.js");
const binable_js_1 = require("../../bindings/lib/binable.js");
const base58_js_1 = require("../../lib/util/base58.js");
const constants_js_1 = require("../../bindings/crypto/constants.js");
const elliptic_curve_js_1 = require("../../bindings/crypto/elliptic-curve.js");
const types_js_1 = require("./types.js");
const networkIdMainnet = 0x01n;
const networkIdDevnet = 0x00n;
const BinableSignature = (0, binable_js_1.withVersionNumber)((0, binable_js_1.record)({ r: field_bigint_js_1.Field, s: curve_bigint_js_1.Scalar }, ['r', 's']), curve_bigint_js_1.versionNumbers.signature);
const Signature = {
    ...BinableSignature,
    ...(0, base58_js_1.base58)(BinableSignature, constants_js_1.versionBytes.signature),
    toJSON({ r, s }) {
        return {
            field: field_bigint_js_1.Field.toJSON(r),
            scalar: curve_bigint_js_1.Scalar.toJSON(s),
        };
    },
    fromJSON({ field, scalar }) {
        let r = field_bigint_js_1.Field.fromJSON(field);
        let s = curve_bigint_js_1.Scalar.fromJSON(scalar);
        return { r, s };
    },
    dummy() {
        return { r: (0, field_bigint_js_1.Field)(1), s: (0, curve_bigint_js_1.Scalar)(1) };
    },
};
exports.Signature = Signature;
/**
 * Convenience wrapper around {@link sign} where the message is a single {@link Field} element
 */
function signFieldElement(message, privateKey, networkId) {
    return sign({ fields: [message] }, privateKey, networkId);
}
exports.signFieldElement = signFieldElement;
/**
 * Convenience wrapper around {@link verify} where the message is a single {@link Field} element
 */
function verifyFieldElement(signature, message, publicKey, networkId) {
    return verify(signature, { fields: [message] }, publicKey, networkId);
}
exports.verifyFieldElement = verifyFieldElement;
/**
 * Schnorr signature algorithm consistent with the OCaml implementation in Schnorr.Chunked.sign, over
 * the Pallas curve with the original "Mina" generator.
 *
 * @see {@link https://github.com/MinaProtocol/mina/blob/develop/docs/specs/signatures/description.md detailed spec of the algorithm}
 *
 * In contrast to the spec above, this uses the "chunked" style of hash input packing, implemented in {@link packToFields}.
 *
 * @param message The `message` can be an arbitrary {@link HashInput}, that can be created with
 * `ProvableExtended<T>.toInput(t)` for any provable type `T`, and by concatenating multiple hash inputs
 * with {@link HashInput.append}.
 * Currently, we only use the variant {@link signFieldElement} where the message is a single field element,
 * which itself is the result of computing a hash.
 *
 * @param privateKey The `privateKey` represents an element of the Pallas scalar field, and should be given as a native bigint.
 * It can be converted from the base58 string representation using {@link PrivateKey.fromBase58}.
 *
 * @param networkId The `networkId` is either "devnet" or "mainnet" and ensures that testnet transactions can
 * never be used as valid mainnet transactions.
 *
 * @see {@link deriveNonce} and {@link hashMessage} for details on how the nonce and hash are computed.
 */
function sign(message, privateKey, networkId) {
    let publicKey = curve_bigint_js_1.Group.scale(curve_bigint_js_1.Group.generatorMina, privateKey);
    let kPrime = deriveNonce(message, publicKey, privateKey, networkId);
    if (curve_bigint_js_1.Scalar.equal(kPrime, 0n))
        throw Error('sign: derived nonce is 0');
    let { x: rx, y: ry } = curve_bigint_js_1.Group.scale(curve_bigint_js_1.Group.generatorMina, kPrime);
    let k = field_bigint_js_1.Field.isEven(ry) ? kPrime : curve_bigint_js_1.Scalar.negate(kPrime);
    let e = hashMessage(message, publicKey, rx, networkId);
    let s = curve_bigint_js_1.Scalar.add(k, curve_bigint_js_1.Scalar.mul(e, privateKey));
    return { r: rx, s };
}
exports.sign = sign;
/**
 * Deterministically derive the nonce for the Schnorr signature algorithm, by:
 * - packing all inputs into a byte array,
 * - applying the [blake2b](https://en.wikipedia.org/wiki/BLAKE_(hash_function)) hash function, and
 * - interpreting the resulting 32 bytes as an element of the Pallas curve scalar field (by dropping bits 254 and 255).
 *
 * @see {@link https://github.com/MinaProtocol/mina/blob/develop/docs/specs/signatures/description.md detailed spec of the algorithm}
 *
 * In contrast to the spec above, this uses the "chunked" style of hash input packing, implemented in {@link packToFields}.
 *
 * Input arguments are the same as for {@link sign}, with an additional `publicKey` (a non-zero, affine point on the Pallas curve),
 * which `sign` re-derives by scaling the Pallas "Mina" generator by the `privateKey`.
 */
function deriveNonce(message, publicKey, privateKey, networkId) {
    let { x, y } = publicKey;
    let d = (0, field_bigint_js_1.Field)(privateKey);
    let id = getNetworkIdHashInput(networkId);
    let input = poseidon_bigint_js_1.HashInput.append(message, {
        fields: [x, y, d],
        packed: [id],
    });
    let packedInput = (0, poseidon_bigint_js_1.packToFields)(input);
    let inputBits = packedInput.map(field_bigint_js_1.Field.toBits).flat();
    let inputBytes = (0, binable_js_1.bitsToBytes)(inputBits);
    let bytes = (0, blakejs_1.blake2b)(Uint8Array.from(inputBytes), undefined, 32);
    // drop the top two bits to convert into a scalar field element
    // (creates negligible bias because q = 2^254 + eps, eps << q)
    bytes[bytes.length - 1] &= 0x3f;
    return curve_bigint_js_1.Scalar.fromBytes([...bytes]);
}
exports.deriveNonce = deriveNonce;
/**
 * Hash a message for use by the Schnorr signature algorithm, by:
 * - packing the inputs `message`, `publicKey`, `r` into an array of Pallas base field elements,
 * - apply a salted hash with the {@link Poseidon} hash function,
 * - interpreting the resulting base field element as a scalar
 *   (which is always possible, and is a no-op, since the scalar field is larger and both fields are represented with bigints).
 *
 * @see {@link https://github.com/MinaProtocol/mina/blob/develop/docs/specs/signatures/description.md detailed spec of the algorithm}
 *
 * In contrast to the spec above, this uses the "chunked" style of hash input packing, implemented in {@link packToFields}.
 *
 * @param message an arbitrary {@link HashInput}
 * @param publicKey an affine, non-zero point on the Pallas curve, derived by {@link sign} from the private key
 * @param r an element of the Pallas base field, computed by {@link sign} as the x-coordinate of the generator, scaled by the nonce.
 * @param networkId either "testnet" or "mainnet", determines the salt (initial state) in the Poseidon hash.
 */
function hashMessage(message, publicKey, r, networkId) {
    let { x, y } = publicKey;
    let input = poseidon_bigint_js_1.HashInput.append(message, { fields: [x, y, r] });
    return (0, poseidon_bigint_js_1.hashWithPrefix)(signaturePrefix(networkId), (0, poseidon_bigint_js_1.packToFields)(input));
}
/**
 * Verifies a signature created by {@link sign}, returns `true` if (and only if) the signature is valid.
 *
 * @see {@link https://github.com/MinaProtocol/mina/blob/develop/docs/specs/signatures/description.md detailed spec of the algorithm}
 *
 * In contrast to the spec above, this uses the "chunked" style of hash input packing, implemented in {@link packToFields}.
 *
 * @param publicKey the public key has to be passed in as a compressed {@link PublicKey}.
 * It can be created from a base58 string with {@link PublicKey.fromBase58}.
 */
function verify(signature, message, publicKey, networkId) {
    let { r, s } = signature;
    let pk = curve_bigint_js_1.PublicKey.toGroup(publicKey);
    let e = hashMessage(message, pk, r, networkId);
    let { scale, one, sub } = elliptic_curve_js_1.Pallas;
    let R = sub(scale(one, s), scale(curve_bigint_js_1.Group.toProjective(pk), e));
    try {
        // if `R` is infinity, Group.fromProjective throws an error, so `verify` returns false
        let { x: rx, y: ry } = curve_bigint_js_1.Group.fromProjective(R);
        return field_bigint_js_1.Field.isEven(ry) && field_bigint_js_1.Field.equal(rx, r);
    }
    catch {
        return false;
    }
}
exports.verify = verify;
// legacy signatures
/**
 * Same as {@link sign}, but using the "legacy" style of hash input packing.
 */
function signLegacy(message, privateKey, networkId) {
    let publicKey = curve_bigint_js_1.Group.scale(curve_bigint_js_1.Group.generatorMina, privateKey);
    let kPrime = deriveNonceLegacy(message, publicKey, privateKey, networkId);
    if (curve_bigint_js_1.Scalar.equal(kPrime, 0n))
        throw Error('sign: derived nonce is 0');
    let { x: rx, y: ry } = curve_bigint_js_1.Group.scale(curve_bigint_js_1.Group.generatorMina, kPrime);
    let k = field_bigint_js_1.Field.isEven(ry) ? kPrime : curve_bigint_js_1.Scalar.negate(kPrime);
    let e = hashMessageLegacy(message, publicKey, rx, networkId);
    let s = curve_bigint_js_1.Scalar.add(k, curve_bigint_js_1.Scalar.mul(e, privateKey));
    return { r: rx, s };
}
exports.signLegacy = signLegacy;
/**
 * Same as {@link verify}, but using the "legacy" style of hash input packing.
 */
function verifyLegacy(signature, message, publicKey, networkId) {
    try {
        let { r, s } = signature;
        let pk = curve_bigint_js_1.PublicKey.toGroup(publicKey);
        let e = hashMessageLegacy(message, pk, r, networkId);
        let { scale, one, sub } = elliptic_curve_js_1.Pallas;
        let R = sub(scale(one, s), scale(curve_bigint_js_1.Group.toProjective(pk), e));
        // if `R` is infinity, Group.fromProjective throws an error, so `verify` returns false
        let { x: rx, y: ry } = curve_bigint_js_1.Group.fromProjective(R);
        return field_bigint_js_1.Field.isEven(ry) && field_bigint_js_1.Field.equal(rx, r);
    }
    catch {
        return false;
    }
}
exports.verifyLegacy = verifyLegacy;
/**
 * Same as {@link deriveNonce}, but using the "legacy" style of hash input packing.
 */
function deriveNonceLegacy(message, publicKey, privateKey, networkId) {
    let { x, y } = publicKey;
    let scalarBits = curve_bigint_js_1.Scalar.toBits(privateKey);
    let id = getNetworkIdHashInput(networkId)[0];
    let idBits = (0, binable_js_1.bytesToBits)([Number(id)]);
    let input = poseidon_bigint_js_1.HashInputLegacy.append(message, {
        fields: [x, y],
        bits: [...scalarBits, ...idBits],
    });
    let inputBits = (0, poseidon_bigint_js_1.inputToBitsLegacy)(input);
    let inputBytes = (0, binable_js_1.bitsToBytes)(inputBits);
    let bytes = (0, blakejs_1.blake2b)(Uint8Array.from(inputBytes), undefined, 32);
    // drop the top two bits to convert into a scalar field element
    // (creates negligible bias because q = 2^254 + eps, eps << q)
    bytes[bytes.length - 1] &= 0x3f;
    return curve_bigint_js_1.Scalar.fromBytes([...bytes]);
}
/**
 * Same as {@link hashMessage}, except for two differences:
 * - uses the "legacy" style of hash input packing.
 * - uses Poseidon with "legacy" parameters for hashing
 *
 * The method produces a hash in the Pallas base field ({@link Field}) and reinterprets it as a {@link Scalar}.
 * This is possible, and a no-op, since the scalar field is larger and both fields are represented with bigints.
 */
function hashMessageLegacy(message, publicKey, r, networkId) {
    let { x, y } = publicKey;
    let input = poseidon_bigint_js_1.HashInputLegacy.append(message, { fields: [x, y, r], bits: [] });
    let prefix = signaturePrefix(networkId);
    return poseidon_bigint_js_1.HashLegacy.hashWithPrefix(prefix, (0, poseidon_bigint_js_1.packToFieldsLegacy)(input));
}
const numberToBytePadded = (b) => b.toString(2).padStart(8, '0');
function networkIdOfString(n) {
    let l = n.length;
    let acc = '';
    for (let i = l - 1; i >= 0; i--) {
        let b = n.charCodeAt(i);
        let padded = numberToBytePadded(b);
        acc = acc.concat(padded);
    }
    return [BigInt('0b' + acc), acc.length];
}
function getNetworkIdHashInput(network) {
    let s = types_js_1.NetworkId.toString(network);
    switch (s) {
        case 'mainnet':
            return [networkIdMainnet, 8];
        case 'devnet':
        case 'testnet':
            return [networkIdDevnet, 8];
        default:
            return networkIdOfString(s);
    }
}
const createCustomPrefix = (prefix) => {
    const maxLength = 20;
    const paddingChar = '*';
    let length = prefix.length;
    if (length <= maxLength) {
        let diff = maxLength - length;
        return prefix + paddingChar.repeat(diff);
    }
    else {
        return prefix.substring(0, maxLength);
    }
};
const signaturePrefix = (network) => {
    let s = types_js_1.NetworkId.toString(network);
    switch (s) {
        case 'mainnet':
            return poseidon_bigint_js_1.prefixes.signatureMainnet;
        case 'devnet':
        case 'testnet':
            return poseidon_bigint_js_1.prefixes.signatureTestnet;
        default:
            return createCustomPrefix(s + 'Signature');
    }
};
exports.signaturePrefix = signaturePrefix;
const zkAppBodyPrefix = (network) => {
    let s = types_js_1.NetworkId.toString(network);
    switch (s) {
        case 'mainnet':
            return poseidon_bigint_js_1.prefixes.zkappBodyMainnet;
        case 'devnet':
        case 'testnet':
            return poseidon_bigint_js_1.prefixes.zkappBodyTestnet;
        default:
            return createCustomPrefix(s + 'ZkappBody');
    }
};
exports.zkAppBodyPrefix = zkAppBodyPrefix;
