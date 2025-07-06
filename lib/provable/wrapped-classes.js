"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bytes = void 0;
const bytes_js_1 = require("./bytes.js");
/**
 * A provable type representing an array of bytes.
 *
 * ```ts
 * class Bytes32 extends Bytes(32) {}
 *
 * let bytes = Bytes32.fromHex('deadbeef');
 * ```
 */
function Bytes(size) {
    return (0, bytes_js_1.createBytes)(size);
}
exports.Bytes = Bytes;
Bytes.from = bytes_js_1.Bytes.from;
Bytes.fromHex = bytes_js_1.Bytes.fromHex;
Bytes.fromString = bytes_js_1.Bytes.fromString;
// expose base class so that we can detect Bytes with `instanceof`
Bytes.Base = bytes_js_1.Bytes;
