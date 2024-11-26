import { createForeignCurve } from '../crypto/foreign-curve.js';
import { Fq } from '../../../bindings/crypto/finite-field.js';
import { Vesta as V } from '../../../bindings/crypto/elliptic-curve.js';
import { Provable } from '../provable.js';
import { Field } from '../field.js';
import { Crypto } from '../crypto/crypto.js';

class Vesta extends createForeignCurve(Crypto.CurveParams.Vesta) {}
class Fp extends Vesta.Scalar {}

let g = { x: Fq.negate(1n), y: 2n, infinity: false };
let h = V.toAffine(V.negate(V.double(V.add(V.fromAffine(g), V.one))));
let scalar = Field.random().toBigInt();
let p = V.toAffine(V.scale(V.fromAffine(h), scalar));

function main() {
  let g0 = Provable.witness(Vesta, () => g);
  let one = Provable.witness(Vesta, () => Vesta.generator);
  let h0 = g0.add(one).double().negate();
  Provable.assertEqual(Vesta, h0, new Vesta(h));

  h0.assertOnCurve();
  h0.assertInSubgroup();

  let scalar0 = Provable.witness(Fp, () => scalar);
  let p0 = h0.scale(scalar0);
  Provable.assertEqual(Vesta, p0, new Vesta(p));
}

console.time('running constant version');
main();
console.timeEnd('running constant version');

console.time('running witness generation & checks');
await Provable.runAndCheck(main);
console.timeEnd('running witness generation & checks');

console.time('creating constraint system');
let cs = await Provable.constraintSystem(main);
console.timeEnd('creating constraint system');

console.log(cs.summary());
