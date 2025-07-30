import { Experimental, Crypto, createForeignCurve, Bytes, assert, createEcdsa } from 'o1js';
const { ZkFunction } = Experimental;

export { Secp256k1, Ecdsa, Bytes32, reserves };

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class Ecdsa extends createEcdsa(Secp256k1) {}
class Bytes32 extends Bytes(32) {}

const reserves = ZkFunction({
  name: 'Reserves',
  publicInputType: Bytes32,
  privateInputTypes: [Ecdsa, Secp256k1],
  main: (message: Bytes32, signature: Ecdsa, publicKey: Secp256k1) => {
    assert(signature.verify(message, publicKey));
  },
});

console.time('compile');
let { verificationKey } = await reserves.compile();
console.timeEnd('compile');

let message = Bytes32.random();
let privateKey = Secp256k1.Scalar.random();
let publicKey = Secp256k1.generator.scale(privateKey);
let signature = Ecdsa.sign(message.toBytes(), privateKey.toBigInt());

console.time('prove');
let proof = await reserves.prove(message, signature, publicKey);
console.timeEnd('prove');

console.time('verify');
let isValid = await reserves.verify(proof, verificationKey);
assert(isValid, 'verifies');
console.timeEnd('verify');
