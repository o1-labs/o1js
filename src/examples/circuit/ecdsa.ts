import { ZkFunction, Crypto, createForeignCurve, Bytes, assert, createEcdsa } from 'o1js';

export { Secp256k1, Ecdsa, Bytes32, reserves };

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Ecdsa extends createEcdsa(Secp256k1) {}
class Bytes32 extends Bytes(32) {}

const reserves = ZkFunction({
  name: 'Reserves',
  publicInputType: Bytes32.provable,
  privateInputTypes: [Ecdsa.provable, Secp256k1.provable],
  main: (message: Bytes32, signature: Ecdsa, publicKey: Secp256k1) => {
    assert(signature.verify(message, publicKey));
  },
});

console.time('generateKeypair');
let kp = await reserves.generateKeypair();
console.timeEnd('generateKeypair');

let message = Bytes32.random();
let privateKey = Secp256k1.Scalar.random();
let publicKey = Secp256k1.generator.scale(privateKey);
let signature = Ecdsa.sign(message.toBytes(), privateKey.toBigInt());

console.time('prove');
let proof = await reserves.prove([signature, publicKey], message, kp);
console.timeEnd('prove');

console.time('verify');
let isValid = await reserves.verify(message, kp.verificationKey(), proof);
assert(isValid, 'verifies');
console.timeEnd('verify');
