import { ZkProgram, Crypto, createEcdsa, createForeignCurve, Bool } from 'o1js';

export { ecdsaProgram, Secp256k1, Ecdsa };

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Scalar extends Secp256k1.Scalar {}
class Ecdsa extends createEcdsa(Secp256k1) {}

const ecdsaProgram = ZkProgram({
  name: 'ecdsa',
  publicInput: Scalar.provable,
  publicOutput: Bool,

  methods: {
    verifyEcdsa: {
      privateInputs: [Ecdsa.provable, Secp256k1.provable],
      method(msgHash: Scalar, signature: Ecdsa, publicKey: Secp256k1) {
        return signature.verify(msgHash, publicKey);
      },
    },
  },
});
