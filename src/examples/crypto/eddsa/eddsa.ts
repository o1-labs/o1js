import {
  ZkProgram,
  Crypto,
  createEddsa,
  createForeignTwisted,
  Bool,
  Bytes,
} from 'o1js';

export { eddsa, Edwards25519, Eddsa, Bytes32 };

class Edwards25519 extends createForeignTwisted(
  Crypto.TwistedCurveParams.Edwards25519
) {}
class Scalar extends Edwards25519.Scalar {}
class Eddsa extends createEddsa(Edwards25519) {}
class Bytes32 extends Bytes(32) {}

const eddsa = ZkProgram({
  name: 'eddsa',
  publicInput: Bytes32,
  publicOutput: Bool,

  methods: {
    verifyEddsa: {
      privateInputs: [Eddsa, Edwards25519],
      async method(
        message: Bytes32,
        signature: Eddsa,
        publicKey: Edwards25519
      ) {
        return {
          publicOutput: signature.verify(message, publicKey),
        };
      },
    },
  },
});
