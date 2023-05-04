import { Fp } from '../../bindings/crypto/finite_field.js';
import { Poseidon } from '../../bindings/crypto/poseidon.js';
import { Group, PublicKey } from '../../provable/curve-bigint.js';
import { PrivateKey } from '../../provable/curve-bigint.js';
import { Field } from '../../provable/field-bigint.js';
import { Nullifier } from './TSTypes.js';

export { createNullifier };
/*
PLUME: An ECDSA Nullifier Scheme for Unique
Pseudonymity within Zero Knowledge Proofs
https://eprint.iacr.org/2022/1255.pdf chapter 3 page 14
*/
function createNullifier(message: Field, sk: PrivateKey): Nullifier {
  const Hash2 = Poseidon.hash;
  const Hash = Poseidon.hashToGroup;

  const pk = PrivateKey.toPublicKey(sk);

  const G = Group.generatorMina;

  const r = Field.random();

  const gm = Hash([message, pk.x, pk.isOdd ? 1n : 0n]);
  if (!gm) throw Error('hashToGroup: Point is undefined');
  const h_m_pk = { x: gm.x, y: gm.y.x0 };

  const nullifier = Group.scale(h_m_pk, sk);
  const h_m_pk_r = Group.scale(h_m_pk, r);

  const g_r = Group.scale(G, r);

  const c = Hash2([
    ...Group.toFields(G),
    pk.x,
    pk.isOdd ? 1n : 0n,
    ...Group.toFields(h_m_pk),
    ...Group.toFields(nullifier),
    ...Group.toFields(g_r),
    ...Group.toFields(h_m_pk_r),
  ]);

  const s = Fp.add(r, Fp.mul(sk, c));

  return {
    publicKey: PublicKey.toBase58(pk),
    message,
    private: {
      c,
      g_r,
      h_m_pk_r,
    },
    public: {
      nullifier,
      s,
    },
  };
}
