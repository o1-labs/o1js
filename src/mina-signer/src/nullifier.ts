import { Fq } from '../../bindings/crypto/finite-field.js';
import { Poseidon } from '../../bindings/crypto/poseidon.js';
import { Group, PublicKey, Scalar, PrivateKey } from './curve-bigint.js';
import { Field } from './field-bigint.js';
import { Nullifier } from './types.js';

export { createNullifier };

/**
 * PLUME: An ECDSA Nullifier Scheme for Unique
 * Pseudonymity within Zero Knowledge Proofs
 * https://eprint.iacr.org/2022/1255.pdf chapter 3 page 14
 */
function createNullifier(message: Field[], sk: PrivateKey): Nullifier {
  const Hash2 = Poseidon.hash;
  const Hash = Poseidon.hashToGroup;

  const pk = PublicKey.toGroup(PrivateKey.toPublicKey(sk));

  const G = Group.generatorMina;

  const r = Scalar.random();

  const h_m_pk = Hash([...message, ...Group.toFields(pk)]);
  if (!h_m_pk) throw Error('hashToGroup: Point is undefined');

  const nullifier = Group.scale(h_m_pk, sk);
  const h_m_pk_r = Group.scale(h_m_pk, r);

  const g_r = Group.scale(G, r);

  const c = Hash2([
    ...Group.toFields(G),
    ...Group.toFields(pk),
    ...Group.toFields(h_m_pk),
    ...Group.toFields(nullifier),
    ...Group.toFields(g_r),
    ...Group.toFields(h_m_pk_r),
  ]);

  // operations on scalars (r) should be in Fq, rather than Fp
  // while c is in Fp (due to Poseidon.hash), c needs to be handled as an element from Fq
  const s = Fq.add(r, Fq.mul(sk, c));

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

function toString({ x, y }: Group): { x: string; y: string } {
  return { x: x.toString(), y: y.toString() };
}
