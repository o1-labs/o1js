import { Crypto, Provable, createForeignField } from 'o1js';

class ForeignScalar extends createForeignField(Crypto.CurveParams.Secp256k1.modulus) {}

function main() {
  let s = Provable.witness(ForeignScalar.Canonical, ForeignScalar.random);
  let t = Provable.witness(ForeignScalar.Canonical, ForeignScalar.random);
  s.mul(t);
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
