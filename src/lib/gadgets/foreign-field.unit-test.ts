import type { FiniteField } from '../../bindings/crypto/finite_field.js';
import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import {
  ProvableSpec,
  array,
  equivalentAsync,
  equivalentProvable,
  fromRandom,
  record,
} from '../testing/equivalent.js';
import { Random } from '../testing/random.js';
import { Gadgets } from './gadgets.js';
import { ZkProgram } from '../proof_system.js';
import { Provable } from '../provable.js';
import { assert } from './common.js';
import {
  and,
  constraintSystem,
  contains,
  equals,
  ifNotAllConstant,
  repeat,
  withoutGenerics,
} from '../testing/constraint-system.js';
import { GateType } from '../../snarky.js';
import { ForeignField as ForeignField_ } from './foreign-field.js';

const { ForeignField, Field3 } = Gadgets;

function foreignField(F: FiniteField): ProvableSpec<bigint, Gadgets.Field3> {
  let rng = Random.otherField(F);
  return {
    rng,
    there: Field3.from,
    back: Field3.toBigint,
    provable: Field3.provable,
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
  eq2(F.mul, (x, y) => ForeignField_.mul(x, y, F.modulus), 'mul');
  equivalentProvable({ from: [f], to: f })(
    (x) => F.inverse(x) ?? throwError('no inverse'),
    (x) => ForeignField_.inv(x, F.modulus)
  );
  eq2(
    (x, y) => F.div(x, y) ?? throwError('no inverse'),
    (x, y) => ForeignField_.div(x, y, F.modulus),
    'div'
  );

  // sumchain of 5
  equivalentProvable({ from: [array(f, 5), array(sign, 4)], to: f })(
    (xs, signs) => sum(xs, signs, F),
    (xs, signs) => ForeignField.sum(xs, signs, F.modulus)
  );

  // sumchain up to 100
  let operands = array(record({ x: f, sign }), Random.nat(100));

  equivalentProvable({ from: [f, operands], to: f })(
    (x0, ts) => {
      let xs = [x0, ...ts.map((t) => t.x)];
      let signs = ts.map((t) => t.sign);
      return sum(xs, signs, F);
    },
    (x0, ts) => {
      let xs = [x0, ...ts.map((t) => t.x)];
      let signs = ts.map((t) => t.sign);
      return ForeignField.sum(xs, signs, F.modulus);
    },
    'sumchain'
  );
}

// setup zk program tests

let F = exampleFields.secp256k1;
let f = foreignField(F);
let chainLength = 5;
let signs = [1n, -1n, -1n, 1n] satisfies (-1n | 1n)[];

let ffProgram = ZkProgram({
  name: 'foreign-field',
  publicOutput: Field3.provable,
  methods: {
    sumchain: {
      privateInputs: [Provable.Array(Field3.provable, chainLength)],
      method(xs) {
        return ForeignField.sum(xs, signs, F.modulus);
      },
    },

    mul: {
      privateInputs: [Field3.provable, Field3.provable],
      method(x, y) {
        return ForeignField_.mul(x, y, F.modulus);
      },
    },

    inv: {
      privateInputs: [Field3.provable],
      method(x) {
        return ForeignField_.inv(x, F.modulus);
      },
    },

    div: {
      privateInputs: [Field3.provable, Field3.provable],
      method(x, y) {
        return ForeignField_.div(x, y, F.modulus);
      },
    },
  },
});

// tests for constraint system

let addChain = repeat(chainLength - 1, 'ForeignFieldAdd').concat('Zero');
let mrc: GateType[] = ['RangeCheck0', 'RangeCheck0', 'RangeCheck1', 'Zero'];

constraintSystem.fromZkProgram(
  ffProgram,
  'sumchain',
  ifNotAllConstant(
    and(
      contains([addChain, mrc]),
      withoutGenerics(equals([...addChain, ...mrc]))
    )
  )
);

// tests with proving

await ffProgram.compile();

await equivalentAsync({ from: [array(f, chainLength)], to: f }, { runs: 3 })(
  (xs) => sum(xs, signs, F),
  async (xs) => {
    let proof = await ffProgram.sumchain(xs);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove chain'
);

await equivalentAsync({ from: [f, f], to: f }, { runs: 3 })(
  F.mul,
  async (x, y) => {
    let proof = await ffProgram.mul(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove mul'
);

await equivalentAsync({ from: [f, f], to: f }, { runs: 3 })(
  (x, y) => F.div(x, y) ?? throwError('no inverse'),
  async (x, y) => {
    let proof = await ffProgram.div(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove div'
);

// helper

function sum(xs: bigint[], signs: (1n | -1n)[], F: FiniteField) {
  let sum = xs[0];
  for (let i = 0; i < signs.length; i++) {
    sum = signs[i] === 1n ? F.add(sum, xs[i + 1]) : F.sub(sum, xs[i + 1]);
  }
  return sum;
}

function throwError<T>(message: string): T {
  throw Error(message);
}
