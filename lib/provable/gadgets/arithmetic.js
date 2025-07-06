"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMod64 = exports.divMod64 = exports.addMod32 = exports.divMod32 = void 0;
const struct_js_1 = require("../types/struct.js");
const wrapped_js_1 = require("../wrapped.js");
const errors_js_1 = require("../../util/errors.js");
const provable_js_1 = require("../provable.js");
const range_check_js_1 = require("./range-check.js");
function divMod32(n, nBits = 64) {
    (0, errors_js_1.assert)(nBits >= 0 && nBits < 255, `nBits must be in the range [0, 255), got ${nBits}`);
    const quotientBits = Math.max(0, nBits - 32);
    if (n.isConstant()) {
        (0, errors_js_1.assert)(n.toBigInt() < 1n << BigInt(nBits), `n needs to fit into ${nBits} bits, but got ${n.toBigInt()}`);
        let nBigInt = n.toBigInt();
        let q = nBigInt >> 32n;
        let r = nBigInt - (q << 32n);
        return {
            remainder: new wrapped_js_1.Field(r),
            quotient: new wrapped_js_1.Field(q),
        };
    }
    let [quotient, remainder] = provable_js_1.Provable.witness((0, struct_js_1.provableTuple)([wrapped_js_1.Field, wrapped_js_1.Field]), () => {
        let nBigInt = n.toBigInt();
        let q = nBigInt >> 32n;
        let r = nBigInt - (q << 32n);
        // why do we have to do this?
        return [q, r];
    });
    if (quotientBits === 1) {
        quotient.assertBool();
    }
    else {
        (0, range_check_js_1.rangeCheckN)(quotientBits, quotient);
    }
    (0, range_check_js_1.rangeCheck32)(remainder);
    n.assertEquals(quotient.mul(1n << 32n).add(remainder));
    return {
        remainder,
        quotient,
    };
}
exports.divMod32 = divMod32;
function addMod32(x, y) {
    return divMod32(x.add(y), 33).remainder;
}
exports.addMod32 = addMod32;
function divMod64(n, nBits = 128) {
    (0, errors_js_1.assert)(nBits >= 0 && nBits < 255, `nBits must be in the range [0, 255), got ${nBits}`);
    // calculate the number of bits allowed for the quotient to avoid overflow
    const quotientBits = Math.max(0, nBits - 64);
    if (n.isConstant()) {
        (0, errors_js_1.assert)(n.toBigInt() < 1n << BigInt(nBits), `n needs to fit into ${nBits} bits, but got ${n.toBigInt()}`);
        let nBigInt = n.toBigInt();
        let q = nBigInt >> 64n;
        let r = nBigInt - (q << 64n);
        return {
            remainder: new wrapped_js_1.Field(r),
            quotient: new wrapped_js_1.Field(q),
        };
    }
    let [quotient, remainder] = provable_js_1.Provable.witness((0, struct_js_1.provableTuple)([wrapped_js_1.Field, wrapped_js_1.Field]), () => {
        let nBigInt = n.toBigInt();
        let q = nBigInt >> 64n;
        let r = nBigInt - (q << 64n);
        return [q, r];
    });
    if (quotientBits === 1) {
        quotient.assertBool();
    }
    else if (quotientBits === 64) {
        (0, range_check_js_1.rangeCheck64)(quotient);
    }
    else {
        (0, range_check_js_1.rangeCheckN)(quotientBits, quotient);
    }
    (0, range_check_js_1.rangeCheck64)(remainder);
    n.assertEquals(quotient.mul(1n << 64n).add(remainder));
    return {
        remainder,
        quotient,
    };
}
exports.divMod64 = divMod64;
function addMod64(x, y) {
    return divMod64(x.add(y), 65).remainder;
}
exports.addMod64 = addMod64;
