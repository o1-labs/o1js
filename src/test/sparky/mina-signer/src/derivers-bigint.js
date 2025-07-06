"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinableBool = exports.BinableBigint = exports.SignableBigint = exports.signable = void 0;
const bigint_helpers_js_1 = require("../../bindings/crypto/bigint-helpers.js");
const provable_generic_js_1 = require("../../bindings/lib/provable-generic.js");
const binable_js_1 = require("../../bindings/lib/binable.js");
let { signable } = (0, provable_generic_js_1.createDerivers)();
exports.signable = signable;
function SignableBigint(check) {
    return {
        toInput(x) {
            return { fields: [x], packed: [] };
        },
        toJSON(x) {
            return x.toString();
        },
        fromJSON(json) {
            if (isNaN(json) || isNaN(parseFloat(json))) {
                throw Error(`fromJSON: expected a numeric string, got "${json}"`);
            }
            let x = BigInt(json);
            check(x);
            return x;
        },
        empty() {
            return 0n;
        },
    };
}
exports.SignableBigint = SignableBigint;
function BinableBigint(sizeInBits, check) {
    let sizeInBytes = Math.ceil(sizeInBits / 8);
    return (0, binable_js_1.withBits)((0, binable_js_1.defineBinable)({
        toBytes(x) {
            return (0, bigint_helpers_js_1.bigIntToBytes)(x, sizeInBytes);
        },
        readBytes(bytes, start) {
            let x = 0n;
            let bitPosition = 0n;
            let end = Math.min(start + sizeInBytes, bytes.length);
            for (let i = start; i < end; i++) {
                x += BigInt(bytes[i]) << bitPosition;
                bitPosition += 8n;
            }
            check(x);
            return [x, end];
        },
    }), sizeInBits);
}
exports.BinableBigint = BinableBigint;
function BinableBool(check) {
    return (0, binable_js_1.withBits)((0, binable_js_1.defineBinable)({
        toBytes(x) {
            return [x ? 1 : 0];
        },
        readBytes(bytes, start) {
            let byte = bytes[start];
            check(byte);
            return [byte === 1, start + 1];
        },
    }), 1);
}
exports.BinableBool = BinableBool;
