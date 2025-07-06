"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nullifier = void 0;
const struct_js_1 = require("../types/struct.js");
const wrapped_js_1 = require("../wrapped.js");
const poseidon_js_1 = require("./poseidon.js");
const signature_js_1 = require("./signature.js");
const provable_js_1 = require("../provable.js");
/**
 *
 * Nullifiers are used as a public commitment to a specific anonymous account,
 * to forbid actions like double spending, or allow a consistent identity between anonymous actions.
 *
 * RFC: https://github.com/o1-labs/o1js/issues/756
 *
 * Paper: https://eprint.iacr.org/2022/1255.pdf
 */
class Nullifier extends (0, struct_js_1.Struct)({
    publicKey: wrapped_js_1.Group,
    public: {
        nullifier: wrapped_js_1.Group,
        s: wrapped_js_1.Scalar,
    },
    private: {
        c: wrapped_js_1.Field,
        g_r: wrapped_js_1.Group,
        h_m_pk_r: wrapped_js_1.Group,
    },
}) {
    static fromJSON(json) {
        return super.fromJSON(json);
    }
    /**
     * Verifies that the Nullifier belongs to a specific message. Throws an error if the Nullifier is incorrect.
     *
     * @example
     *
     * ```ts
     * let nullifierMessage = [voteId, ...otherData];
     * // throws an error if the nullifier is invalid or doesn't belong to this specific message
     * nullifier.verify(nullifierMessage);
     * ```
     */
    verify(message) {
        let { publicKey, public: { nullifier, s }, private: { c }, } = this;
        // generator
        let G = wrapped_js_1.Group.generator;
        // serialize public key into fields once
        let pk_fields = wrapped_js_1.Group.toFields(publicKey);
        // x and y of hash(msg, pk), it doesn't return a Group because y is split into x0 and x1, both two roots of a field element
        let h_m_pk = poseidon_js_1.Poseidon.hashToGroup([...message, ...pk_fields]);
        // pk^c
        let pk_c = this.publicKey.scale(c);
        // g^r = g^s / pk^c
        let g_r = G.scale(s).sub(pk_c);
        // h(m, pk)^s
        let h_m_pk_s = h_m_pk.scale(s);
        // h_m_pk_r =  h(m,pk)^s / nullifier^c
        let h_m_pk_s_div_nullifier_s = h_m_pk_s.sub(nullifier.scale(c));
        // this is supposed to match the entries generated on "the other side" of the nullifier (mina-signer, in an wallet enclave)
        poseidon_js_1.Poseidon.hash([
            ...wrapped_js_1.Group.toFields(G),
            ...pk_fields,
            ...wrapped_js_1.Group.toFields(h_m_pk),
            ...wrapped_js_1.Group.toFields(nullifier),
            ...wrapped_js_1.Group.toFields(g_r),
            ...wrapped_js_1.Group.toFields(h_m_pk_s_div_nullifier_s),
        ]).assertEquals(c, 'Nullifier does not match private input!');
    }
    /**
     * The key of the nullifier, which belongs to a unique message and a public key.
     * Used as an index in Merkle trees.
     *
     * @example
     * ```ts
     * // returns the key of the nullifier which can be used as index in a Merkle tree/map
     * let key = nullifier.key();
     * ```
     */
    key() {
        return poseidon_js_1.Poseidon.hash(wrapped_js_1.Group.toFields(this.public.nullifier));
    }
    /**
     * Returns the state of the Nullifier.
     *
     * @example
     * ```ts
     * // returns a Bool based on whether or not the nullifier has been used before
     * let isUnused = nullifier.isUnused();
     * ```
     */
    isUnused(witness, root) {
        let [newRoot, key] = witness.computeRootAndKey((0, wrapped_js_1.Field)(0));
        key.assertEquals(this.key());
        let isUnused = newRoot.equals(root);
        let isUsed = witness.computeRootAndKey((0, wrapped_js_1.Field)(1))[0].equals(root);
        // prove that our Merkle witness is correct
        isUsed.or(isUnused).assertTrue();
        return isUnused; // if this is false, `isUsed` is true because of the check before
    }
    /**
     * Checks if the Nullifier has been used before.
     *
     * @example
     * ```ts
     * // asserts that the nullifier has not been used before, throws an error otherwise
     * nullifier.assertUnused();
     * ```
     */
    assertUnused(witness, root) {
        let [impliedRoot, key] = witness.computeRootAndKey((0, wrapped_js_1.Field)(0));
        this.key().assertEquals(key);
        impliedRoot.assertEquals(root);
    }
    /**
     * Sets the Nullifier, returns the new Merkle root.
     *
     * @example
     * ```ts
     * // calculates the new root of the Merkle tree in which the nullifier is set to used
     * let newRoot = nullifier.setUsed(witness);
     * ```
     */
    setUsed(witness) {
        let [newRoot, key] = witness.computeRootAndKey((0, wrapped_js_1.Field)(1));
        key.assertEquals(this.key());
        return newRoot;
    }
    /**
     * Returns the {@link PublicKey} that is associated with this Nullifier.
     *
     * @example
     * ```ts
     * let pk = nullifier.getPublicKey();
     * ```
     */
    getPublicKey() {
        return signature_js_1.PublicKey.fromGroup(this.publicKey);
    }
    /**
     *
     * _Note_: This is *not* the recommended way to create a Nullifier in production. Please use mina-signer to create Nullifiers.
     * Also, this function cannot be run within provable code to avoid unintended creations of Nullifiers - a Nullifier should never be created inside proveable code (e.g. a smart contract) directly, but rather created inside the users wallet (or other secure enclaves, so the private key never leaves that enclave).
     *
     * PLUME: An ECDSA Nullifier Scheme for Unique
     * Pseudonymity within Zero Knowledge Proofs
     * https://eprint.iacr.org/2022/1255.pdf chapter 3 page 14
     */
    static createTestNullifier(message, sk) {
        if (provable_js_1.Provable.inCheckedComputation()) {
            throw Error('This function cannot not be run within provable code. If you want to create a Nullifier, run this method outside provable code or use mina-signer to do so.');
        }
        const Hash2 = poseidon_js_1.Poseidon.hash;
        const Hash = poseidon_js_1.Poseidon.hashToGroup;
        const pk = sk.toPublicKey().toGroup();
        const G = wrapped_js_1.Group.generator;
        const r = wrapped_js_1.Scalar.random();
        const h_m_pk = Hash([...message, ...wrapped_js_1.Group.toFields(pk)]);
        const nullifier = h_m_pk.scale(sk.toBigInt());
        const h_m_pk_r = h_m_pk.scale(r.toBigInt());
        const g_r = G.scale(r.toBigInt());
        const c = Hash2([
            ...wrapped_js_1.Group.toFields(G),
            ...wrapped_js_1.Group.toFields(pk),
            ...wrapped_js_1.Group.toFields(h_m_pk),
            ...wrapped_js_1.Group.toFields(nullifier),
            ...wrapped_js_1.Group.toFields(g_r),
            ...wrapped_js_1.Group.toFields(h_m_pk_r),
        ]);
        // operations on scalars (r) should be in Fq, rather than Fp
        // while c is in Fp (due to Poseidon.hash), c needs to be handled as an element from Fq
        const s = r.add(sk.s.mul(wrapped_js_1.Scalar.from(c.toBigInt())));
        return {
            publicKey: pk.toJSON(),
            private: {
                c: c.toString(),
                g_r: g_r.toJSON(),
                h_m_pk_r: h_m_pk_r.toJSON(),
            },
            public: {
                nullifier: nullifier.toJSON(),
                s: s.toJSON(),
            },
        };
    }
}
exports.Nullifier = Nullifier;
