import { createForeignCurve, vestaParams, Provable, Field } from 'snarkyjs';

class Vesta extends createForeignCurve(vestaParams) {}

let g = new Vesta({ x: -1n, y: 2n });
let scalar = Field.random();
let h = g.add(Vesta.generator).double().negate();
let p = h.scale(scalar.toBits());

function main() {
  Vesta.initialize();
  let g0 = Provable.witness(Vesta, () => g);
  let one = Provable.witness(Vesta, () => Vesta.generator);
  let h0 = g0.add(one).double().negate();
  Provable.assertEqual(Vesta, h0, new Vesta(h));

  h0.assertOnCurve();
  // TODO super slow
  // h0.assertInSubgroup();

  let scalar0 = Provable.witness(Field, () => scalar).toBits();
  // TODO super slow
  let p0 = h0.scale(scalar0);
  Provable.assertEqual(Vesta, p0, p);
}

console.time('running constant version');
main();
console.timeEnd('running constant version');

// half of this time is spent in `field_to_bignum_bigint`, which is mostly addition of zarith bigints -.-
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
