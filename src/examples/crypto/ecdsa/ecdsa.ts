import assert from 'assert';
import {
  ZkProgram,
  Crypto,
  createEcdsa,
  createForeignCurve,
  Bool,
  Struct,
  Provable,
  Field,
} from 'o1js';

export { keccakAndEcdsa, ecdsa, Secp256k1, Ecdsa, Message };

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Scalar extends Secp256k1.Scalar {}
class Ecdsa extends createEcdsa(Secp256k1) {}

// a message of 8 bytes
class Message extends Struct({ array: Provable.Array(Field, 8) }) {
  static from(message: Uint8Array) {
    assert(message.length === 8, 'message must be 8 bytes');
    return new Message({ array: [...message].map(Field) });
  }
}

const keccakAndEcdsa = ZkProgram({
  name: 'ecdsa',
  publicInput: Message,
  publicOutput: Bool,

  methods: {
    verify: {
      privateInputs: [Ecdsa.provable, Secp256k1.provable],
      method(message: Message, signature: Ecdsa, publicKey: Secp256k1) {
        return signature.verify(message.array, publicKey);
      },
    },
  },
});

const ecdsa = ZkProgram({
  name: 'ecdsa-only',
  publicInput: Scalar.provable,
  publicOutput: Bool,

  methods: {
    verifySignedHash: {
      privateInputs: [Ecdsa.provable, Secp256k1.provable],
      method(message: Scalar, signature: Ecdsa, publicKey: Secp256k1) {
        return signature.verifySignedHash(message, publicKey);
      },
    },
  },
});
