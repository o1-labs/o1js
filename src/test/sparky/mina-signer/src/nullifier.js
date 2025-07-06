"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNullifier = void 0;
const finite_field_js_1 = require("../../bindings/crypto/finite-field.js");
const poseidon_js_1 = require("../../bindings/crypto/poseidon.js");
const curve_bigint_js_1 = require("./curve-bigint.js");
/**
 * PLUME: An ECDSA Nullifier Scheme for Unique
 * Pseudonymity within Zero Knowledge Proofs
 * https://eprint.iacr.org/2022/1255.pdf chapter 3 page 14
 */
function createNullifier(message, sk) {
    const Hash2 = poseidon_js_1.Poseidon.hash;
    const Hash = poseidon_js_1.Poseidon.hashToGroup;
    const pk = curve_bigint_js_1.PublicKey.toGroup(curve_bigint_js_1.PrivateKey.toPublicKey(sk));
    const G = curve_bigint_js_1.Group.generatorMina;
    const r = curve_bigint_js_1.Scalar.random();
    const h_m_pk = Hash([...message, ...curve_bigint_js_1.Group.toFields(pk)]);
    if (!h_m_pk)
        throw Error('hashToGroup: Point is undefined');
    const nullifier = curve_bigint_js_1.Group.scale(h_m_pk, sk);
    const h_m_pk_r = curve_bigint_js_1.Group.scale(h_m_pk, r);
    const g_r = curve_bigint_js_1.Group.scale(G, r);
    const c = Hash2([
        ...curve_bigint_js_1.Group.toFields(G),
        ...curve_bigint_js_1.Group.toFields(pk),
        ...curve_bigint_js_1.Group.toFields(h_m_pk),
        ...curve_bigint_js_1.Group.toFields(nullifier),
        ...curve_bigint_js_1.Group.toFields(g_r),
        ...curve_bigint_js_1.Group.toFields(h_m_pk_r),
    ]);
    // operations on scalars (r) should be in Fq, rather than Fp
    // while c is in Fp (due to Poseidon.hash), c needs to be handled as an element from Fq
    const s = finite_field_js_1.Fq.add(r, finite_field_js_1.Fq.mul(sk, c));
    return {
        publicKey: toString(pk),
        private: {
            c: c.toString(),
            g_r: toString(g_r),
            h_m_pk_r: toString(h_m_pk_r),
        },
        public: {
            nullifier: toString(nullifier),
            s: s.toString(),
        },
    };
}
exports.createNullifier = createNullifier;
function toString({ x, y }) {
    return { x: x.toString(), y: y.toString() };
}
