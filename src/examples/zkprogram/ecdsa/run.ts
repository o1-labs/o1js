import { Gadgets } from 'o1js';
import { Point, Secp256k1, ecdsaProgram } from './ecdsa.js';
import assert from 'assert';

// create an example ecdsa signature
let privateKey = Secp256k1.Scalar.random();
let publicKey = Secp256k1.scale(Secp256k1.one, privateKey);

// TODO use an actual keccak hash
let messageHash = Secp256k1.Scalar.random();

let signature = Gadgets.Ecdsa.sign(Secp256k1, messageHash, privateKey);

console.time('ecdsa verify (build constraint system)');
let cs = ecdsaProgram.analyzeMethods().verifyEcdsa;
console.timeEnd('ecdsa verify (build constraint system)');

let gateTypes: Record<string, number> = {};
gateTypes['Total rows'] = cs.rows;
for (let gate of cs.gates) {
  gateTypes[gate.type] ??= 0;
  gateTypes[gate.type]++;
}
console.log(gateTypes);

console.time('ecdsa verify (compile)');
await ecdsaProgram.compile();
console.timeEnd('ecdsa verify (compile)');

console.time('ecdsa verify (prove)');
let proof = await ecdsaProgram.verifyEcdsa(
  Point.from(publicKey),
  Gadgets.Ecdsa.Signature.from(signature),
  Gadgets.Field3.from(messageHash)
);
console.timeEnd('ecdsa verify (prove)');

assert(await ecdsaProgram.verify(proof), 'proof verifies');
