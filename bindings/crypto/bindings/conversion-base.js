"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.affineFromRust = exports.affineToRust = exports.maybeFieldToRust = exports.fieldsFromRustFlat = exports.fieldsToRustFlat = exports.fieldFromRust = exports.fieldToRust = void 0;
const bigint_helpers_js_1 = require("../bigint-helpers.js");
const curve_js_1 = require("./curve.js");
// TODO: Hardcoding this is a little brittle
// TODO read from field
const fieldSizeBytes = 32;
// field, field vectors
function fieldToRust([, x], dest = new Uint8Array(32)) {
    return (0, bigint_helpers_js_1.bigintToBytes32)(x, dest);
}
exports.fieldToRust = fieldToRust;
function fieldFromRust(x) {
    return [0, (0, bigint_helpers_js_1.bytesToBigint32)(x)];
}
exports.fieldFromRust = fieldFromRust;
function fieldsToRustFlat([, ...fields]) {
    let n = fields.length;
    let flatBytes = new Uint8Array(n * fieldSizeBytes);
    for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
        fieldToRust(fields[i], flatBytes.subarray(offset, offset + fieldSizeBytes));
    }
    return flatBytes;
}
exports.fieldsToRustFlat = fieldsToRustFlat;
function fieldsFromRustFlat(fieldBytes) {
    let n = fieldBytes.length / fieldSizeBytes;
    if (!Number.isInteger(n)) {
        throw Error('fieldsFromRustFlat: invalid bytes');
    }
    let fields = Array(n);
    for (let i = 0, offset = 0; i < n; i++, offset += fieldSizeBytes) {
        let fieldView = new Uint8Array(fieldBytes.buffer, offset, fieldSizeBytes);
        fields[i] = fieldFromRust(fieldView);
    }
    return [0, ...fields];
}
exports.fieldsFromRustFlat = fieldsFromRustFlat;
function maybeFieldToRust(x) {
    return x && fieldToRust(x);
}
exports.maybeFieldToRust = maybeFieldToRust;
function affineFromRust(pt) {
    if (pt.infinity) {
        pt.free();
        return 0;
    }
    else {
        let x = fieldFromRust(pt.x);
        let y = fieldFromRust(pt.y);
        pt.free();
        return [0, [0, x, y]];
    }
}
exports.affineFromRust = affineFromRust;
const tmpBytes = new Uint8Array(32);
function affineToRust(pt, makeAffine) {
    let res = makeAffine();
    if (pt === curve_js_1.Infinity) {
        res.infinity = true;
    }
    else {
        let [, [, x, y]] = pt;
        // we can use the same bytes here every time,
        // because x and y setters copy the bytes into wasm memory
        res.x = fieldToRust(x, tmpBytes);
        res.y = fieldToRust(y, tmpBytes);
    }
    return res;
}
exports.affineToRust = affineToRust;
