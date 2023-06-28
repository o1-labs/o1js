import { createForeignCurve } from './foreign-curve.js';
import { Fp, Fq } from '../bindings/crypto/finite_field.js';
import { Vesta as VestaBigint } from '../bindings/crypto/elliptic_curve.js';
import { Provable } from './provable.js';

class Vesta extends createForeignCurve({
  modulus: Fq.modulus,
  order: Fp.modulus,
  a: 0n,
  b: VestaBigint.b,
  gen: VestaBigint.one,
}) {}

let g = { x: Fq.negate(1n), y: 2n, infinity: false };
let gPlusOne = VestaBigint.toAffine(
  VestaBigint.add(VestaBigint.fromAffine(g), VestaBigint.one)
);

// Provable.runAndCheck(() => {
//   let g0 = Provable.witness(Vesta, () => new Vesta(g));
// });
