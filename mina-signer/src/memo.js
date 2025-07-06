"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memo = void 0;
const binable_js_1 = require("../../bindings/lib/binable.js");
const base58_js_1 = require("../../lib/util/base58.js");
const poseidon_bigint_js_1 = require("./poseidon-bigint.js");
const constants_js_1 = require("../../bindings/crypto/constants.js");
function fromString(memo) {
    let length = (0, binable_js_1.stringLengthInBytes)(memo);
    if (length > 32)
        throw Error('Memo.fromString: string too long');
    return `\x01${String.fromCharCode(length)}${memo}` + '\x00'.repeat(32 - length);
}
function toString(memo) {
    let totalLength = (0, binable_js_1.stringLengthInBytes)(memo);
    if (totalLength !== 34) {
        throw Error(`Memo.toString: length ${totalLength} does not equal 34`);
    }
    if (memo[0] !== '\x01') {
        throw Error('Memo.toString: expected memo to start with 0x01 byte');
    }
    let length = memo.charCodeAt(1);
    if (length > 32)
        throw Error('Memo.toString: invalid length encoding');
    let bytes = (0, binable_js_1.stringToBytes)(memo).slice(2, 2 + length);
    return (0, binable_js_1.stringFromBytes)(bytes);
}
function hash(memo) {
    let bits = Memo.toBits(memo);
    let fields = (0, poseidon_bigint_js_1.packToFieldsLegacy)(poseidon_bigint_js_1.HashInputLegacy.bits(bits));
    return (0, poseidon_bigint_js_1.hashWithPrefix)(poseidon_bigint_js_1.prefixes.zkappMemo, fields);
}
const SIZE = 34;
const Binable = (0, binable_js_1.defineBinable)({
    toBytes(memo) {
        return (0, binable_js_1.stringToBytes)(memo);
    },
    readBytes(bytes, start) {
        let end = start + SIZE;
        let memo = (0, binable_js_1.stringFromBytes)(bytes.slice(start, end));
        return [memo, end];
    },
});
const Memo = {
    fromString,
    toString,
    hash,
    ...(0, binable_js_1.withBits)(Binable, SIZE * 8),
    ...(0, base58_js_1.base58)(Binable, constants_js_1.versionBytes.userCommandMemo),
    sizeInBytes: SIZE,
    empty() {
        return Memo.fromString('');
    },
    toValidString(memo = '') {
        if ((0, binable_js_1.stringLengthInBytes)(memo) > 32)
            throw Error('Memo: string too long');
        return memo;
    },
};
exports.Memo = Memo;
