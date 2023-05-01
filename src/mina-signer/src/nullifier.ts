import { groupMapToGroup } from 'src/js_crypto/elliptic_curve.js';
import { Fp } from 'src/js_crypto/finite_field.js';
import { Poseidon } from 'src/js_crypto/poseidon.js';
import { Group, PublicKey } from 'src/provable/curve-bigint.js';
import { PrivateKey } from 'src/provable/curve-bigint.js';
import { Field } from 'src/provable/field-bigint.js';

type JsonNullifier = {
  public: {
    nullifier: Field;
    s: Field;
  };
  private: {
    c: Field;
    pk: Field;
    gr: Field;
    hmpk: Field;
  };
};

function createNullifier(message: Field[], sk: PrivateKey) {
  const Hash2 = Poseidon.hash;
  const Hash = Poseidon.hashToGroup;

  const pk = PrivateKey.toPublicKey(sk);

  const G = Group.generatorMina;

  const r = Field.random();

  const h_m_pk_gm = Hash([...message, pk.x, pk.isOdd ? 1n : 0n])!;
  const h_m_pk = groupMapToGroup(h_m_pk_gm);

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
    public: {
      c,
      pk,
      g_r: Group.scale(G, r),
      h_m_pk_r,
    },
    private: {
      nullifier,
      s,
    },
  };
}
