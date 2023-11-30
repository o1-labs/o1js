import { createForeignCurve } from './foreign-curve.js';
import { Fq } from '../bindings/crypto/finite_field.js';
import { Vesta as V } from '../bindings/crypto/elliptic_curve.js';
import { Provable } from './provable.js';
import { Field } from './field.js';
import { Crypto } from './crypto.js';

class Vesta extends createForeignCurve(Crypto.CurveParams.Vesta) {}
class Fp extends Vesta.Scalar {}

let g = { x: Fq.negate(1n), y: 2n, infinity: false };
let h = V.toAffine(V.negate(V.double(V.add(V.fromAffine(g), V.one))));
let scalar = Field.random().toBigInt();
let p = V.toAffine(V.scale(V.fromAffine(h), scalar));

function main() {
  let g0 = Provable.witness(Vesta, () => new Vesta(g));
  let one = Provable.witness(Vesta, () => Vesta.generator);
  let h0 = g0.add(one).double().negate();
  Provable.assertEqual(Vesta, h0, new Vesta(h));

  h0.assertOnCurve();
  // TODO super slow
  // h0.assertInSubgroup();

  let scalar0 = Provable.witness(Fp.provable, () => new Fp(scalar));
  // TODO super slow
  let p0 = h0.scale(scalar0);
  Provable.assertEqual(Vesta, p0, new Vesta(p));
}

console.time('running constant version');
main();
console.timeEnd('running constant version');

console.time('running witness generation & checks');
Provable.runAndCheck(main);
console.timeEnd('running witness generation & checks');

console.time('creating constraint system');
let { gates } = Provable.constraintSystem(main);
console.timeEnd('creating constraint system');

let gateTypes: Record<string, number> = {};
for (let gate of gates) {
  gateTypes[gate.type] ??= 0;
  gateTypes[gate.type]++;
}

console.log(gateTypes);
