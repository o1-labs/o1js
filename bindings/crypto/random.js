"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomBytes = void 0;
const crypto_1 = require("crypto");
function randomBytes(n) {
    return new Uint8Array((0, crypto_1.randomBytes)(n));
}
exports.randomBytes = randomBytes;
