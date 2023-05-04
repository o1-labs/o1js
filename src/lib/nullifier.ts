import { Poseidon, PublicKey } from 'snarkyjs';
import { Struct } from 'snarkyjs';
import { Field, Group } from 'snarkyjs';
import { Nullifier as JsonNullifier } from '../mina-signer/src/TSTypes.js';
export { Nullifier };

class Nullifier extends Struct({
  message: Field,
  publicKey: PublicKey,
  nullifier: {
    public: {
      nullifier: Group,
      s: Field,
    },
    private: {
      c: Field,
      g_r: Group,
      h_m_pk_r: Group,
    },
  },
}) {
  static fromJSON({
    message,
    publicKey,
    private: { c, g_r, h_m_pk_r },
    public: { nullifier, s },
  }: JsonNullifier) {
    return new Nullifier({
      message: Field(message),
      nullifier: {
        private: {
          c: Field(c),
          g_r: new Group({
            x: Field(g_r.x),
            y: Field(g_r.y),
          }),
          h_m_pk_r: new Group({
            x: Field(h_m_pk_r.x),
            y: Field(h_m_pk_r.y),
          }),
        },
        public: {
          nullifier: new Group({
            x: Field(nullifier.x),
            y: Field(nullifier.y),
          }),
          s: Field(s),
        },
      },
      publicKey: PublicKey.fromBase58(publicKey),
    });
  }
  verify() {
    let {
      message,
      publicKey,
      nullifier: {
        public: { nullifier },
        private: { g_r, h_m_pk_r, c },
      },
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
