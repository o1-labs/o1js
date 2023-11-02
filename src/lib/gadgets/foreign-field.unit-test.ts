import type { FiniteField } from '../../bindings/crypto/finite_field.js';
import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import { Spec, equivalentProvable } from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { ForeignField, Field3 } from './foreign-field.js';

function foreignField(F: FiniteField): Spec<bigint, Field3> {
  let rng = Random.otherField(F);
  return { rng, there: ForeignField.from, back: ForeignField.toBigint };
}

let fields = [
  exampleFields.small,
  exampleFields.babybear,
  exampleFields.f25519,
  exampleFields.secp256k1,
  exampleFields.secq256k1,
  exampleFields.bls12_381_scalar,
  exampleFields.Fq,
  exampleFields.Fp,
];

for (let F of fields) {
  let f = foreignField(F);
  let eq2 = equivalentProvable({ from: [f, f], to: f });

  eq2(F.add, (x, y) => ForeignField.add(x, y, F.modulus));
  eq2(F.sub, (x, y) => ForeignField.sub(x, y, F.modulus));
}
