import { Cache, Field, ZkProgram, Crypto, Provable, Poseidon, createEcdsa, createForeignCurve, Bytes, Bool  } from 'o1js';

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Ecdsa extends createEcdsa(Secp256k1) {}
class Bytes32 extends Bytes(32) {}

let privateKey = Secp256k1.Scalar.random();
let publicKey = Secp256k1.generator.scale(privateKey);

let message = Bytes32.fromString("benching");

let signature = Ecdsa.sign(message.toBytes(), privateKey.toBigInt());

let MyProgram = ZkProgram({
  name: 'bench-regression-long',
  publicInput: Bytes32,  
  publicOutput: Bool,
  methods: {
    verifyEcdsa: {
      privateInputs: [Ecdsa, Secp256k1],
      async method(message: Bytes32, signature: Ecdsa, publicKey: Secp256k1) {
        let a = Provable.witness(Field, () => 1);
        let b = Provable.witness(Field, () => 1);
        for (let index = 0; index < 1 << 10; index++) {
          b = Poseidon.hash([b, a]);
        }
        return {
          publicOutput: signature.verify(message, publicKey),
        };
      },
    },
  },
});

console.time('compile (no cache)');
await MyProgram.compile({
  cache: Cache.None,
  forceRecompile: true,
});
console.timeEnd('compile (no cache)');
console.log((await MyProgram.analyzeMethods()).verifyEcdsa.rows);
console.time('proving');
await MyProgram.verifyEcdsa(message, signature, publicKey);
console.timeEnd('proving');
