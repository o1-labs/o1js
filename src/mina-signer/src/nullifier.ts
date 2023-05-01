import { Fp } from 'src/js_crypto/finite_field.js';
import { Poseidon } from 'src/js_crypto/poseidon.js';
import { Group } from 'src/provable/curve-bigint.js';
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
  const hash2 = Poseidon.hash;
  const hash = Poseidon.hashToGroup;

  let pk = PrivateKey.toPublicKey(sk);

  let g = Group.generatorMina;

  let r = Field.random();

  let h = hash([...message, ...[pk.x, pk.isOdd ? 1n : 0n]])!;

  let hash_m_pk = [h.x, h.y.x0];

  let nullifier = Fp.power(hash_m_pk, sk);

  let c_ = hash2([
    g.y,
    Fp.power(g.y, sk),
    hash_m_pk,
    nullifier,
    Fp.power(g.y, r),
    Fp.power(hash_m_pk, r),
  ]);

  if (!c_) throw Error('123123');

  let c = {
    x: c_.x,
    y: c_.y.x0,
  } as Group;

  let s = Group.scale(c, sk);
}
