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

function main() {
  Vesta.initialize();
  let g0 = new Vesta(g);
  g0.add(new Vesta(VestaBigint.one));
  // let g0 = Provable.witness(Vesta, () => new Vesta(g));
}

Provable.runAndCheck(main);
let { gates, rows } = Provable.constraintSystem(main);

let types: Record<string, number> = {};

for (let gate of gates) {
  types[gate.type] ??= 0;
  types[gate.type]++;
}

console.log(types);
