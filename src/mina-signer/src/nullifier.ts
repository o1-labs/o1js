import { groupMapToGroup } from 'src/js_crypto/elliptic_curve.js';
import { Fp } from 'src/js_crypto/finite_field.js';
import { Poseidon } from 'src/js_crypto/poseidon.js';
import { Group, PublicKey } from 'src/provable/curve-bigint.js';
import { PrivateKey } from 'src/provable/curve-bigint.js';
import { Field } from 'src/provable/field-bigint.js';
import { Nullifier } from './TSTypes.js';

export { createNullifier };
/*
PLUME: An ECDSA Nullifier Scheme for Unique
Pseudonymity within Zero Knowledge Proofs
https://eprint.iacr.org/2022/1255.pdf chapter 3 page 14
*/
function createNullifier(message: Field[], sk: PrivateKey): Nullifier {
  const Hash2 = Poseidon.hash;
  const Hash = Poseidon.hashToGroup;

  const pk = PrivateKey.toPublicKey(sk);

  const G = Group.generatorMina;

  const r = Field.random();

  const h = Hash([...message, pk.x, pk.isOdd ? 1n : 0n]);
  if (!h) throw Error('hashToGroup: Point is undefined');
  const h_m_pk = groupMapToGroup(h);

  const nullifier = Group.scale(h_m_pk, sk);
  const h_m_pk_r = Group.scale(h_m_pk, r);

  const c = Hash2([
    ...Group.toFields(G),
    ...PublicKey.toFields(pk),
    ...Group.toFields(h_m_pk),
    ...Group.toFields(nullifier),
    ...Group.toFields(Group.scale(G, r)),
    ...Group.toFields(h_m_pk_r),
  ]);

  const s = Fp.add(r, Fp.mul(sk, c));

  return {
    private: {
      c,
      g_r: Group.scale(G, r),
      h_m_pk_r,
    },
    public: {
      nullifier,
      s,
    },
  };
}
