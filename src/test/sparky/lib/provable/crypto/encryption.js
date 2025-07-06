"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptBytes = exports.encryptBytes = exports.decrypt = exports.encrypt = void 0;
const wrapped_js_1 = require("../wrapped.js");
const poseidon_js_1 = require("./poseidon.js");
const provable_js_1 = require("../provable.js");
const bit_slices_js_1 = require("../gadgets/bit-slices.js");
const bytes_js_1 = require("../bytes.js");
const int_js_1 = require("../int.js");
const arrays_js_1 = require("../../util/arrays.js");
/**
 * Decrypts a {@link CipherText} using a {@link PrivateKey}.
 */
function decrypt({ publicKey, cipherText }, privateKey) {
    // key exchange
    const sharedSecret = publicKey.scale(privateKey.s);
    const sponge = new poseidon_js_1.Poseidon.Sponge();
    sponge.absorb(sharedSecret.x);
    const authenticationTag = cipherText.pop();
    // decryption
    const message = [];
    for (let i = 0; i < cipherText.length; i++) {
        // absorb frame tag
        if (i === cipherText.length - 1)
            sponge.absorb((0, wrapped_js_1.Field)(1));
        else
            sponge.absorb((0, wrapped_js_1.Field)(0));
        const keyStream = sponge.squeeze();
        const messageChunk = cipherText[i].sub(keyStream);
        // push the message to our final messages
        message.push(messageChunk);
        // absorb the cipher text chunk
        sponge.absorb(cipherText[i]);
    }
    // authentication tag
    sponge.squeeze().assertEquals(authenticationTag);
    return message;
}
exports.decrypt = decrypt;
/**
 * Public Key Encryption, encrypts Field elements using a {@link PublicKey}.
 */
function encrypt(message, otherPublicKey) {
    // key exchange
    const privateKey = provable_js_1.Provable.witness(wrapped_js_1.Scalar, () => wrapped_js_1.Scalar.random());
    const publicKey = wrapped_js_1.Group.generator.scale(privateKey);
    const sharedSecret = otherPublicKey.toGroup().scale(privateKey);
    const sponge = new poseidon_js_1.Poseidon.Sponge();
    sponge.absorb(sharedSecret.x);
    // encryption
    const cipherText = [];
    for (let [n, chunk] of message.entries()) {
        // absorb frame bit
        if (n === message.length - 1)
            sponge.absorb((0, wrapped_js_1.Field)(1));
        else
            sponge.absorb((0, wrapped_js_1.Field)(0));
        const keyStream = sponge.squeeze();
        const encryptedChunk = chunk.add(keyStream);
        cipherText.push(encryptedChunk);
        sponge.absorb(encryptedChunk);
    }
    // authentication tag
    const authenticationTag = sponge.squeeze();
    cipherText.push(authenticationTag);
    return { publicKey, cipherText };
}
exports.encrypt = encrypt;
/**
 * Public Key Encryption, encrypts Bytes using a {@link PublicKey}.
 */
function encryptBytes(message, otherPublicKey) {
    const bytes = message.bytes;
    const messageLength = bytes.length;
    // pad message to a multiple of 31 so they still fit into one field element
    const multipleOf = 31;
    const n = Math.ceil(messageLength / multipleOf) * multipleOf;
    // create the padding
    const padding = Array.from({ length: n - messageLength }, () => int_js_1.UInt8.from(0));
    // convert message into chunks of 31 bytes
    const chunks = (0, arrays_js_1.chunk)(bytes.concat(padding), 31);
    // call into encryption() and convert chunk to field elements
    return {
        ...encrypt(chunks.map((chunk) => (0, bit_slices_js_1.bytesToWord)(chunk)), otherPublicKey),
        messageLength,
    };
}
exports.encryptBytes = encryptBytes;
/**
 * Decrypts a {@link CipherText} using a {@link PrivateKey}.
 */
function decryptBytes(cipherText, privateKey) {
    // calculate padding
    const messageLength = cipherText.messageLength;
    const multipleOf = 31;
    const n = Math.ceil(messageLength / multipleOf) * multipleOf;
    // decrypt plain field elements and convert them into bytes
    const message = decrypt(cipherText, privateKey);
    const bytes = message.map((m) => (0, bit_slices_js_1.wordToBytes)(m, 31));
    return bytes_js_1.Bytes.from(bytes.flat().slice(0, messageLength - n));
}
exports.decryptBytes = decryptBytes;
