import {
  Poseidon,
  PublicKey,
  Field,
  Group,
  Struct,
  MerkleMapWitness,
  Scalar,
} from 'snarkyjs';
import type { Nullifier as JsonNullifier } from '../mina-signer/src/TSTypes.js';
import { scaleShifted } from './signature.js';

export { Nullifier };

/**
 * RFC: https://github.com/o1-labs/snarkyjs/issues/756
 *
 * Paper: https://eprint.iacr.org/2022/1255.pdf
 */
class Nullifier extends Struct({
  publicKey: Group,
  public: {
    nullifier: Group,
    s: Scalar,
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
   * Verifies that the Nullifier belongs to a specific message. Throws an error if the Nullifier is incorrect.
   */
  verify(message: Field[]) {
    let {
      publicKey,
      public: { nullifier, s },
      private: { c },
    } = this;

    // generator
    let G = Group.generator;

    // serialize public key into fields once
    let pk_fields = Group.toFields(publicKey);

    // x and y of hash(msg, pk), it doesn't return a Group because y is split into x0 and x1, both two roots of a field element
    let {
      x,
      y: { x0 },
    } = Poseidon.hashToGroup([...message, ...pk_fields]);
    let h_m_pk = Group.fromFields([x, x0]);

    // shifted scalar see https://github.com/o1-labs/snarkyjs/blob/5333817a62890c43ac1b9cb345748984df271b62/src/lib/signature.ts#L220
    // pk^c
    let pk_c = scaleShifted(this.publicKey, Scalar.fromBits(c.toBits()));

    // g^r = g^s / pk^c
    let g_r = G.scale(s).sub(pk_c);

    // h(m, pk)^s
    let h_m_pk_s = Group.scale(h_m_pk, s);

    // h_m_pk_r =  h(m,pk)^s / nullifier^c
    let h_m_pk_s_div_nullifier_s = h_m_pk_s.sub(
      scaleShifted(nullifier, Scalar.fromBits(c.toBits()))
    );

    // this is supposed to match the entries generated on "the other side" of the nullifier (mina-signer, in an wallet enclave)
    Poseidon.hash([
      ...Group.toFields(G),
      ...pk_fields,
      x,
      x0,
      ...Group.toFields(nullifier),
      ...Group.toFields(g_r),
      ...Group.toFields(h_m_pk_s_div_nullifier_s),
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
    let isUnused = witness.computeRootAndKey(Field(0))[0].equals(root);
    let isUsed = witness.computeRootAndKey(Field(1))[0].equals(root);
    // prove that our Merkle witness is correct
    isUsed.or(isUnused).assertTrue();
    return isUnused; // if this is false, `isUsed` is true because of the check before
  }

  assertUnused(witness: MerkleMapWitness, root: Field) {
    let [impliedRoot, key] = witness.computeRootAndKey(Field(0));
    this.key().assertEquals(key);
    impliedRoot.assertEquals(root);
  }

  /**
   * Sets the Nullifier, returns the new Merkle root.
   */
  setUsed(witness: MerkleMapWitness) {
    let [newRoot, key] = witness.computeRootAndKey(Field(1));
    key.assertEquals(this.key());
    return newRoot;
  }

  /**
   * Returns the {@link PublicKey} that is associated with this Nullifier.
   */
  getPublicKey() {
    return PublicKey.fromGroup(this.publicKey);
  }
}
