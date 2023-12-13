import {
  ZkProgram,
  Crypto,
  createEcdsa,
  createForeignCurve,
  Bool,
  Struct,
  Provable,
  Field,
  Keccak,
  Gadgets,
} from 'o1js';

export { keccakAndEcdsa, ecdsa, Secp256k1, Ecdsa, Message32 };

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Scalar extends Secp256k1.Scalar {}
class Ecdsa extends createEcdsa(Secp256k1) {}
class Message32 extends Message(32) {}

const keccakAndEcdsa = ZkProgram({
  name: 'ecdsa',
  publicInput: Message32,
  publicOutput: Bool,

  methods: {
    verifyEcdsa: {
      privateInputs: [Ecdsa.provable, Secp256k1.provable],
      method(message: Message32, signature: Ecdsa, publicKey: Secp256k1) {
        return signature.verify(message.array, publicKey);
      },
    },

    sha3: {
      privateInputs: [],
      method(message: Message32) {
        Keccak.nistSha3(256, message.array);
        return Bool(true);
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

// helper: class for a message of n bytes

function Message(lengthInBytes: number) {
  return class Message extends Struct({
    array: Provable.Array(Field, lengthInBytes),
  }) {
    static from(message: string | Uint8Array) {
      if (typeof message === 'string') {
        message = new TextEncoder().encode(message);
      }
      let padded = new Uint8Array(32);
      padded.set(message);
      return new this({ array: [...padded].map(Field) });
    }

    toBytes() {
      return Uint8Array.from(this.array.map((f) => Number(f)));
    }

    /**
     * Important: check that inputs are, in fact, bytes
     */
    static check(msg: { array: Field[] }) {
      msg.array.forEach(Gadgets.rangeCheck8);
    }
  };
}
