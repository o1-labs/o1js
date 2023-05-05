import {
  Poseidon,
  PublicKey,
  Field,
  Group,
  Struct,
  MerkleMapWitness,
} from 'snarkyjs';
import type { Nullifier as JsonNullifier } from '../mina-signer/src/TSTypes.js';

export { Nullifier };

/**
 * RFC: https://github.com/o1-labs/snarkyjs/issues/756
 *
 * Paper: https://eprint.iacr.org/2022/1255.pdf
 */
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
  static fromJSON(json: JsonNullifier): Nullifier {
    return super.fromJSON(json as any) as Nullifier;
  }

  /**
   * Verifies the correctness of the Nullifier. Throws an error if the Nullifier is incorrect.
   */
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

  /**
   * The key of the nullifier, which belongs to a unique message and a public key.
   * Used as an index in Merkle trees.
   */
  key() {
    return Poseidon.hash(Group.toFields(this.public.nullifier));
  }

  /**
   * Checks if the Nullifier has been used before.
   */
  isUnused(witness: MerkleMapWitness, root: Field) {
    return witness.computeRootAndKey(Field(0))[0].equals(root);
  }

  /**
   * Sets the Nullifier, returns the new Merkle root.
   */
  setUsed(witness: MerkleMapWitness) {
    return witness.computeRootAndKey(Field(1))[0];
  }
}
