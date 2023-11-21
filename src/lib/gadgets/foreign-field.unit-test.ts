import type { FiniteField } from '../../bindings/crypto/finite_field.js';
import { exampleFields } from '../../bindings/crypto/finite-field-examples.js';
import {
  ProvableSpec,
  array,
  equivalentAsync,
  equivalentProvable,
  fromRandom,
  record,
  unit,
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
import { AnyTuple } from '../util/types.js';

const { ForeignField, Field3 } = Gadgets;

function foreignField(F: FiniteField): ProvableSpec<bigint, Gadgets.Field3> {
  return {
    rng: Random.otherField(F),
    there: Field3.from,
    back: Field3.toBigint,
    provable: Field3.provable,
  };
}

// for testing with inputs > f
function unreducedForeignField(
  maxBits: number,
  F: FiniteField
): ProvableSpec<bigint, Gadgets.Field3> {
  return {
    rng: Random.bignat(1n << BigInt(maxBits)),
    there: Field3.from,
    back: Field3.toBigint,
    provable: Field3.provable,
    assertEqual(x, y, message) {
      // need weak equality here because, while ffadd works on bigints larger than the modulus,
      // it can't fully reduce them
      assert(F.equal(x, y), message);
    },
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
  eq2(F.mul, (x, y) => ForeignField.mul(x, y, F.modulus), 'mul');
  equivalentProvable({ from: [f], to: f })(
    (x) => F.inverse(x) ?? throwError('no inverse'),
    (x) => ForeignField.inv(x, F.modulus),
    'inv'
  );
  eq2(
    (x, y) => F.div(x, y) ?? throwError('no inverse'),
    (x, y) => ForeignField.div(x, y, F.modulus),
    'div'
  );

  // assert mul
  equivalentProvable({ from: [f, f], to: unit })(
    (x, y) => assertMulExampleNaive(Field3.from(x), Field3.from(y), F.modulus),
    (x, y) => assertMulExample(x, y, F.modulus),
    'assertMul'
  );

  // tests with inputs that aren't reduced mod f
  let big264 = unreducedForeignField(264, F); // this is the max size supported by our range checks / ffadd
  let big258 = unreducedForeignField(258, F); // rough max size supported by ffmul

  equivalentProvable({ from: [big264, big264], to: big264 })(
    F.add,
    (x, y) => ForeignField.add(x, y, F.modulus),
    'add unreduced'
  );
  // subtraction doesn't work with unreduced y because the range check on the result prevents x-y < -f
  equivalentProvable({ from: [big264, f], to: big264 })(
    F.sub,
    (x, y) => ForeignField.sub(x, y, F.modulus),
    'sub unreduced'
  );
  equivalentProvable({ from: [big258, big258], to: f })(
    F.mul,
    (x, y) => ForeignField.mul(x, y, F.modulus),
    'mul unreduced'
  );
  equivalentProvable({ from: [big258], to: f })(
    (x) => F.inverse(x) ?? throwError('no inverse'),
    (x) => ForeignField.inv(x, F.modulus),
    'inv unreduced'
  );
  // the div() gadget doesn't work with unreduced x because the backwards check (x/y)*y === x fails
  // and it's not valid with unreduced y because we only assert y != 0, y != f but it can be 2f, 3f, etc.
  // the combination of inv() and mul() is more flexible (but much more expensive, ~40 vs ~30 constraints)
  equivalentProvable({ from: [big258, big258], to: f })(
    (x, y) => F.div(x, y) ?? throwError('no inverse'),
    (x, y) => ForeignField.mul(x, ForeignField.inv(y, F.modulus), F.modulus),
    'div unreduced'
  );

  // sumchain of 5
  equivalentProvable({ from: [array(f, 5), array(sign, 4)], to: f })(
    (xs, signs) => sum(xs, signs, F),
    (xs, signs) => ForeignField.sum(xs, signs, F.modulus),
    'sumchain 5'
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
    'sumchain long'
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
        return ForeignField.mul(x, y, F.modulus);
      },
    },
    inv: {
      privateInputs: [Field3.provable],
      method(x) {
        return ForeignField.inv(x, F.modulus);
      },
    },
    div: {
      privateInputs: [Field3.provable, Field3.provable],
      method(x, y) {
        return ForeignField.div(x, y, F.modulus);
      },
    },
  },
});

// tests for constraint system

function addChain(length: number) {
  return repeat(length - 1, 'ForeignFieldAdd').concat('Zero');
}
let mrc: GateType[] = ['RangeCheck0', 'RangeCheck0', 'RangeCheck1', 'Zero'];

constraintSystem.fromZkProgram(
  ffProgram,
  'sumchain',
  ifNotAllConstant(
    and(
      contains([addChain(chainLength), mrc]),
      withoutGenerics(equals([...addChain(chainLength), ...mrc]))
    )
  )
);

let mulChain: GateType[] = ['ForeignFieldMul', 'Zero'];
let mulLayout = ifNotAllConstant(
  and(
    contains([mulChain, mrc, mrc, mrc]),
    withoutGenerics(equals([...mulChain, ...repeat(3, mrc)]))
  )
);
let invLayout = ifNotAllConstant(
  and(
    contains([mrc, mulChain, mrc, mrc, mrc]),
    withoutGenerics(equals([...mrc, ...mulChain, ...repeat(3, mrc)]))
  )
);

constraintSystem.fromZkProgram(ffProgram, 'mul', mulLayout);
constraintSystem.fromZkProgram(ffProgram, 'inv', invLayout);
constraintSystem.fromZkProgram(ffProgram, 'div', invLayout);

// tests with proving

const runs = 2;

await ffProgram.compile();

await equivalentAsync({ from: [array(f, chainLength)], to: f }, { runs })(
  (xs) => sum(xs, signs, F),
  async (xs) => {
    let proof = await ffProgram.sumchain(xs);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove chain'
);

await equivalentAsync({ from: [f, f], to: f }, { runs })(
  F.mul,
  async (x, y) => {
    let proof = await ffProgram.mul(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove mul'
);

await equivalentAsync({ from: [f, f], to: f }, { runs })(
  (x, y) => F.div(x, y) ?? throwError('no inverse'),
  async (x, y) => {
    let proof = await ffProgram.div(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove div'
);

// assert mul example
// (x - y) * (x + y) = x^2 - y^2

function assertMulExample(x: Gadgets.Field3, y: Gadgets.Field3, f: bigint) {
  // witness x^2, y^2
  let x2 = Provable.witness(Field3.provable, () => ForeignField.mul(x, x, f));
  let y2 = Provable.witness(Field3.provable, () => ForeignField.mul(y, y, f));

  // assert (x - y) * (x + y) = x^2 - y^2
  let xMinusY = ForeignField.Sum(x).sub(y);
  let xPlusY = ForeignField.Sum(x).add(y);
  let x2MinusY2 = ForeignField.Sum(x2).sub(y2);
  ForeignField.assertMul(xMinusY, xPlusY, x2MinusY2, f);
}

function assertMulExampleNaive(
  x: Gadgets.Field3,
  y: Gadgets.Field3,
  f: bigint
) {
  // witness x^2, y^2
  let x2 = Provable.witness(Field3.provable, () => ForeignField.mul(x, x, f));
  let y2 = Provable.witness(Field3.provable, () => ForeignField.mul(y, y, f));

  // assert (x - y) * (x + y) = x^2 - y^2
  let lhs = ForeignField.mul(
    ForeignField.sub(x, y, f),
    ForeignField.add(x, y, f),
    f
  );
  let rhs = ForeignField.sub(x2, y2, f);
  Provable.assertEqual(Field3.provable, lhs, rhs);
}

let from2 = { from: [f, f] satisfies AnyTuple };
let gates = constraintSystem.size(from2, (x, y) =>
  assertMulExample(x, y, F.modulus)
);
let gatesNaive = constraintSystem.size(from2, (x, y) =>
  assertMulExampleNaive(x, y, F.modulus)
);
assert(gates + 10 < gatesNaive, 'assertMul() saves at least 10 constraints');

let addChainedIntoMul: GateType[] = ['ForeignFieldAdd', ...mulChain];

constraintSystem(
  'assert mul',
  from2,
  (x, y) => assertMulExample(x, y, F.modulus),
  contains([addChain(1), addChain(1), addChainedIntoMul, mrc, mrc])
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
