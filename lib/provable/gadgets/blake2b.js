"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLAKE2B = void 0;
// https://datatracker.ietf.org/doc/html/rfc7693.html
const int_js_1 = require("../int.js");
const wrapped_classes_js_1 = require("../wrapped-classes.js");
const gadgets_js_1 = require("./gadgets.js");
const errors_js_1 = require("../../util/errors.js");
const bit_slices_js_1 = require("./bit-slices.js");
const BLAKE2BConstants = {
    IV: [
        int_js_1.UInt64.from(0x6a09e667f3bcc908n),
        int_js_1.UInt64.from(0xbb67ae8584caa73bn),
        int_js_1.UInt64.from(0x3c6ef372fe94f82bn),
        int_js_1.UInt64.from(0xa54ff53a5f1d36f1n),
        int_js_1.UInt64.from(0x510e527fade682d1n),
        int_js_1.UInt64.from(0x9b05688c2b3e6c1fn),
        int_js_1.UInt64.from(0x1f83d9abfb41bd6bn),
        int_js_1.UInt64.from(0x5be0cd19137e2179n),
    ],
    SIGMA: [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
        [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
        [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
        [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
        [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
        [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
        [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
        [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
        [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
    ],
};
const BLAKE2B = {
    hash(data, digestLength = 64) {
        (0, errors_js_1.assert)(digestLength >= 1 && digestLength <= 64, `digestLength must be in the range [1, 64], got ${digestLength}`);
        (0, errors_js_1.assert)(data.length >= 0 && data.length < 2 ** 128, `data byte length must be in the range [0, 2**128), got ${data.length}`);
        const state = initialize(digestLength);
        const updatedState = update(state, wrapped_classes_js_1.Bytes.from(data).bytes);
        const out = final(updatedState);
        return wrapped_classes_js_1.Bytes.from(out);
    },
    get IV() {
        return BLAKE2BConstants.IV;
    },
};
exports.BLAKE2B = BLAKE2B;
function G(v, a, b, c, d, x, y) {
    v[a] = int_js_1.UInt64.Unsafe.fromField(gadgets_js_1.Gadgets.divMod64(v[a].value.add(v[b].value.add(x.value)), 128).remainder);
    v[d] = v[d].xor(v[a]).rotate(32, 'right');
    v[c] = int_js_1.UInt64.Unsafe.fromField(gadgets_js_1.Gadgets.divMod64(v[c].value.add(v[d].value), 128).remainder);
    v[b] = v[b].xor(v[c]).rotate(24, 'right');
    v[a] = int_js_1.UInt64.Unsafe.fromField(gadgets_js_1.Gadgets.divMod64(v[a].value.add(v[b].value.add(y.value)), 128).remainder);
    v[d] = v[d].xor(v[a]).rotate(16, 'right');
    v[c] = int_js_1.UInt64.Unsafe.fromField(gadgets_js_1.Gadgets.divMod64(v[c].value.add(v[d].value), 128).remainder);
    v[b] = v[b].xor(v[c]).rotate(63, 'right');
}
/**
 * Compression function. "last" flag indicates last block.
 * @param {State} state
 * @param {boolean} last
 */
function compress(state, last) {
    const { h, t, buf } = state;
    const v = h.concat(BLAKE2B.IV); // initialize local work vector. First half from state and second half from IV.
    v[12] = v[12].xor(int_js_1.UInt64.from(t[0])); // low word of the offset
    v[13] = v[13].xor(int_js_1.UInt64.from(t[1])); // high word of the offset
    if (last) {
        // last block flag set ?
        v[14] = v[14].not();
    }
    const m = [];
    for (let i = 0; i < 16; i++) {
        // get little-endian words
        m.push(int_js_1.UInt64.Unsafe.fromField(buf[i * 8].value
            .add(buf[i * 8 + 1].value.mul(1n << 8n))
            .add(buf[i * 8 + 2].value.mul(1n << 16n))
            .add(buf[i * 8 + 3].value.mul(1n << 24n))
            .add(buf[i * 8 + 4].value.mul(1n << 32n))
            .add(buf[i * 8 + 5].value.mul(1n << 40n))
            .add(buf[i * 8 + 6].value.mul(1n << 48n))
            .add(buf[i * 8 + 7].value.mul(1n << 56n))
            .seal()));
    }
    for (let i = 0; i < 12; i++) {
        // twelve rounds
        const s = BLAKE2BConstants.SIGMA[i % 10];
        G(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
        G(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
        G(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
        G(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
        G(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
        G(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
        G(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
        G(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
    }
    for (let i = 0; i < 8; i++) {
        // XOR the two halves
        h[i] = v[i].xor(v[i + 8]).xor(h[i]);
    }
    return state;
}
/**
 * Initializes the state with the given digest length.
 *
 * @param {number} outlen - Digest length in bits
 * @returns {State}
 */
function initialize(outlen) {
    const h = BLAKE2B.IV.slice(); // shallow copy IV to h
    h[0] = int_js_1.UInt64.from(0x01010000).xor(int_js_1.UInt64.from(outlen)).xor(h[0]); // state "param block"
    return {
        h,
        t: [0n, 0n],
        buf: [],
        buflen: 0,
        outlen,
    };
}
/**
 * Updates hash state
 * @param {State} state
 * @param {UInt8[]} input
 * @returns {State} updated state
 */
function update(state, input) {
    for (let i = 0; i < input.length; i++) {
        if (state.buflen === 128) {
            // buffer full ?
            state.t[0] = int_js_1.UInt64.from(state.t[0]).addMod64(int_js_1.UInt64.from(state.buflen)).toBigInt(); // add counters
            if (state.t[0] < state.buflen) {
                // carry overflow ?
                state.t[1] = int_js_1.UInt64.from(state.t[1]).addMod64(int_js_1.UInt64.one).toBigInt(); // high word
            }
            state = compress(state, false); // compress (not last)
            state.buflen = 0; // counter to zero
        }
        state.buf[state.buflen++] = input[i];
    }
    return state;
}
/**
 * Finalizes the hash state and returns digest
 * @param {State} state
 * @returns {UInt8[]} digest
 */
function final(state) {
    state.t[0] = int_js_1.UInt64.from(state.t[0]).addMod64(int_js_1.UInt64.from(state.buflen)).toBigInt(); // add counters
    if (state.t[0] < state.buflen) {
        // carry overflow ?
        state.t[1] = int_js_1.UInt64.from(state.t[1]).addMod64(int_js_1.UInt64.one).toBigInt(); // high word
    }
    while (state.buflen < 128) {
        state.buf[state.buflen++] = int_js_1.UInt8.from(0); // fill up with zeroes
    }
    compress(state, true);
    // little endian convert and store
    const out = state.h.slice(0, state.outlen / 8).flatMap((x) => (0, bit_slices_js_1.wordToBytes)(x.value));
    return out;
}
