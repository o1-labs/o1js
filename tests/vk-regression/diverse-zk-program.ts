import {
  ZkProgram,
  Crypto,
  createEcdsa,
  createForeignCurve,
  Bytes,
  assert,
  Provable,
  Field,
  Hash,
  MerkleWitness,
  PublicKey,
  PrivateKey,
  Signature,
  AccountUpdate,
  SelfProof,
} from 'o1js';

export { diverse, Bytes128 };

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Secp256k1Scalar extends Secp256k1.Scalar {}
class Secp256k1Signature extends createEcdsa(Secp256k1) {}

class Bytes128 extends Bytes(128) {}

class MerkleWitness30 extends MerkleWitness(30) {}

const diverse = ZkProgram({
  name: 'diverse',

  methods: {
    // foreign field / curve ops, multi-range checks
    ecdsa: {
      privateInputs: [Secp256k1Scalar, Secp256k1Signature, Secp256k1],
      async method(
        message: Secp256k1Scalar,
        signature: Secp256k1Signature,
        publicKey: Secp256k1
      ) {
        assert(signature.verifySignedHash(message, publicKey));
      },
    },

    // bitwise gadgets
    sha3: {
      privateInputs: [Bytes128],
      async method(xs: Bytes128) {
        Hash.SHA3_256.hash(xs);
      },
    },

    // poseidon
    poseidon: {
      privateInputs: [AccountUpdate, MerkleWitness30],
      async method(accountUpdate: AccountUpdate, witness: MerkleWitness30) {
        let leaf = accountUpdate.hash();
        let root = witness.calculateRoot(leaf);
        let index = witness.calculateIndex();
        index.assertNotEquals(root);
      },
    },

    // native EC ops
    pallas: {
      privateInputs: [PublicKey, PrivateKey, Signature],
      async method(pk: PublicKey, sk: PrivateKey, sig: Signature) {
        let pk2 = sk.toPublicKey();
        pk.assertEquals(pk2);

        sig.verify(pk, [Field(1), Field(2)]).assertTrue();
      },
    },

    // only generic gates
    generic: {
      privateInputs: [Field, Field],
      async method(x: Field, y: Field) {
        x.square().equals(5).assertFalse();
        let z = Provable.if(y.equals(0), x, y);
        z.assertEquals(x);
      },
    },

    // recursive proof
    recursive: {
      privateInputs: [SelfProof],
      async method(proof: SelfProof<undefined, void>) {
        proof.verify();
      },
    },
  },
});
