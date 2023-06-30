import { createEcdsa } from './foreign-ecdsa.js';
import { secp256k1Params } from './foreign-curve-params.js';
import { createForeignCurve } from './foreign-curve.js';
import { Provable } from './provable.js';

class Secp256k1 extends createForeignCurve(secp256k1Params) {}

class EthSignature extends createEcdsa(Secp256k1) {}

let publicKey = Secp256k1.from({
  x: 49781623198970027997721070672560275063607048368575198229673025608762959476014n,
  y: 44999051047832679156664607491606359183507784636787036192076848057884504239143n,
});

let signature = EthSignature.fromHex(
  '0x82de9950cc5aac0dca7210cb4b77320ac9e844717d39b1781e9d941d920a12061da497b3c134f50b2fce514d66e20c5e43f9615f097395a5527041d14860a52f1b'
);

let msgHash =
  0x3e91cd8bd233b3df4e4762b329e2922381da770df1b31276ec77d0557be7fcefn;

console.time('ecdsa verify (witness gen / check)');
Provable.runAndCheck(() => {
  Secp256k1.initialize();
  let signature0 = Provable.witness(EthSignature, () => signature);

  signature0.verify(msgHash, publicKey);
});
console.timeEnd('ecdsa verify (witness gen / check)');

console.time('ecdsa verify (build constraint system)');
let cs = Provable.constraintSystem(() => {
  Secp256k1.initialize();
  let signature0 = Provable.witness(EthSignature, () => signature);

  signature0.verify(msgHash, publicKey);
});
console.timeEnd('ecdsa verify (build constraint system)');

let gateTypes: Record<string, number> = {};
gateTypes['Total rows'] = cs.rows;
for (let gate of cs.gates) {
  gateTypes[gate.type] ??= 0;
  gateTypes[gate.type]++;
}

console.log(gateTypes);
