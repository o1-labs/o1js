import { Scalar, Crypto, Provable, createForeignField } from 'o1js';

class ForeignScalar extends createForeignField(
  Crypto.CurveParams.Secp256k1.modulus
).AlmostReduced {}

// TODO ForeignField.random()
function random() {
  return new ForeignScalar(Scalar.random().toBigInt());
}

function main() {
  let s = Provable.witness(ForeignScalar.provable, random);
  let t = Provable.witness(ForeignScalar.provable, random);
  s.mul(t);
}

console.time('running constant version');
main();
console.timeEnd('running constant version');

console.time('running witness generation & checks');
Provable.runAndCheck(main);
console.timeEnd('running witness generation & checks');

console.time('creating constraint system');
let cs = Provable.constraintSystem(main);
console.timeEnd('creating constraint system');

console.log(cs.summary());
