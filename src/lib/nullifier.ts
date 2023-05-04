import { Poseidon, PublicKey, Field, Group, Struct } from 'snarkyjs';
import { Nullifier as JsonNullifier } from '../mina-signer/src/TSTypes.js';
export { Nullifier };

class Nullifier extends Struct({
  message: Field,
  publicKey: PublicKey,

  public: {
    nullifier: Group,
    s: Field,
  },
  private: {
    c: Field,
    g_r: Group,
    h_m_pk_r: Group,
  },
}) {
  verify() {
    let {
      message,
      publicKey,

      public: { nullifier },
      private: { g_r, h_m_pk_r, c },
    } = this;

    let G = Group.generator;

    let {
      x,
      y: { x0 },
    } = Poseidon.hashToGroup([message, ...publicKey.toFields()]);

    Poseidon.hash([
      ...Group.toFields(G),
      ...publicKey.toFields(),
      x,
      x0,
      ...Group.toFields(nullifier),
      ...Group.toFields(g_r),
      ...Group.toFields(h_m_pk_r),
    ]).assertEquals(c, 'Nullifier does not match private input!');
  }
}
