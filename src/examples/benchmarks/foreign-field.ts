import { Scalar, vestaParams, Provable, createForeignField } from 'snarkyjs';

class ForeignScalar extends createForeignField(vestaParams.modulus) {}

// TODO ForeignField.random()
function random() {
  return new ForeignScalar(Scalar.random().toBigInt());
}

function main() {
  let s = Provable.witness(ForeignScalar, random);
  let t = Provable.witness(ForeignScalar, random);
  s.mul(t);
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
