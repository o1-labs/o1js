import type { FiniteField } from '../../bindings/crypto/finite_field.js';
import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import {
  Spec,
  array,
  equivalentAsync,
  equivalentProvable,
  fromRandom,
  record,
} from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { ForeignField, Field3, Sign } from './foreign-field.js';
import { ZkProgram } from '../proof_system.js';
import { Provable } from '../provable.js';
import { Field } from '../field.js';
import { ProvableExtended, provable, provablePure } from '../circuit_value.js';
import { TupleN } from '../util/types.js';
import { assert } from './common.js';

const Field3_ = provablePure([Field, Field, Field] as TupleN<typeof Field, 3>);
const Sign = provable(BigInt) as ProvableExtended<Sign, string>;

function foreignField(F: FiniteField): Spec<bigint, Field3> {
  let rng = Random.otherField(F);
  return {
    rng,
    there: ForeignField.from,
    back: ForeignField.toBigint,
    provable: Field3_,
  };
}
let sign = fromRandom(Random.oneOf(1n as const, -1n as const));

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

// tests for witness generation

for (let F of fields) {
  let f = foreignField(F);
  let eq2 = equivalentProvable({ from: [f, f], to: f });

  eq2(F.add, (x, y) => ForeignField.add(x, y, F.modulus), 'add');
  eq2(F.sub, (x, y) => ForeignField.sub(x, y, F.modulus), 'sub');

  // sumchain of 5
  equivalentProvable({ from: [array(f, 5), array(sign, 4)], to: f })(
    (xs, signs) => sumchain(xs, signs, F),
    (xs, signs) => ForeignField.sumChain(xs, signs, F.modulus)
  );

  // sumchain up to 100
  let operands = array(record({ x: f, sign }), Random.nat(100));

  equivalentProvable({ from: [f, operands], to: f })(
    (x0, ts) => {
      let xs = [x0, ...ts.map((t) => t.x)];
      let signs = ts.map((t) => t.sign);
      return sumchain(xs, signs, F);
    },
    (x0, ts) => {
      let xs = [x0, ...ts.map((t) => t.x)];
      let signs = ts.map((t) => t.sign);
      return ForeignField.sumChain(xs, signs, F.modulus);
    },
    'sumchain'
  );
}

// tests with proving

let F = exampleFields.secp256k1;
let f = foreignField(F);

let ffProgram = ZkProgram({
  name: 'foreign-field',
  publicOutput: Field3_,
  methods: {
    add: {
      privateInputs: [Field3_, Field3_],
      method(x, y) {
        return ForeignField.add(x, y, F.modulus);
      },
    },

    // // sumchain of length 5
    // sumchain: {
    //   privateInputs: [Provable.Array(Field3_, 5), Provable.Array(Sign, 4)],
    //   method(xs, signs) {
    //     return ForeignField.sumChain(xs, signs, F.modulus);
    //   },
    // },
  },
});

await ffProgram.compile();

let [{ gates }] = ffProgram.analyzeMethods();

console.log(gates);

await equivalentAsync({ from: [f, f], to: f }, { runs: 5 })(
  F.add,
  async (x, y) => {
    let proof = await ffProgram.add(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove add'
);

// await equivalentAsync(
//   { from: [array(f, 5), array(sign, 4)], to: f },
//   { runs: 5 }
// )(
//   (xs, signs) => sumchain(xs, signs, F),
//   async (xs, signs) => {
//     let proof = await ffProgram.sumchain(xs, signs);
//     assert(await ffProgram.verify(proof), 'verifies');
//     return proof.publicOutput;
//   },
//   'prove chain'
// );

// helper

function sumchain(xs: bigint[], signs: (1n | -1n)[], F: FiniteField) {
  let sum = xs[0];
  for (let i = 0; i < signs.length; i++) {
    sum = signs[i] === 1n ? F.add(sum, xs[i + 1]) : F.sub(sum, xs[i + 1]);
  }
  return sum;
}
