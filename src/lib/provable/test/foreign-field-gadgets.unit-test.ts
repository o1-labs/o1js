import type { FiniteField } from '../../../bindings/crypto/finite-field.js';
import { exampleFields } from '../../../bindings/crypto/finite-field-examples.js';
import {
  array,
  equivalent,
  equivalentAsync,
  equivalentProvable,
  fromRandom,
  record,
  unit,
} from '../../testing/equivalent.js';
import { Random } from '../../testing/random.js';
import { Field3, Gadgets } from '../gadgets/gadgets.js';
import { ZkProgram } from '../../proof-system/zkprogram.js';
import { Provable } from '../provable.js';
import { assert } from '../gadgets/common.js';
import {
  allConstant,
  and,
  constraintSystem,
  contains,
  equals,
  ifNotAllConstant,
  not,
  or,
  repeat,
  withoutGenerics,
} from '../../testing/constraint-system.js';
import { GateType } from '../../../snarky.js';
import { AnyTuple } from '../../util/types.js';
import { foreignField, throwError, unreducedForeignField } from './test-utils.js';
import { l2 } from '../gadgets/range-check.js';

const { ForeignField } = Gadgets;

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
  equivalentProvable({ from: [f, f], to: unit })(
    (x, y) => assertMulExampleNaive(Field3.from(x), Field3.from(y), F.modulus),
    (x, y) => assertMulExample(x, y, F.modulus),
    'assertMul'
  );
  // test for assertMul which mostly tests the negative case because for random inputs, we expect
  // (x - y) * z != a + b
  equivalentProvable({ from: [f, f, f, f, f], to: unit })(
    (x, y, z, a, b) => assert(F.mul(F.sub(x, y), z) === F.add(a, b)),
    (x, y, z, a, b) =>
      ForeignField.assertMul(ForeignField.Sum(x).sub(y), z, ForeignField.Sum(a).add(b), F.modulus),
    'assertMul negative'
  );

  // tests with inputs that aren't reduced mod f
  let big264 = unreducedForeignField(264, F); // this is the max size supported by our range checks / ffadd
  let big258 = unreducedForeignField(258, F); // rough max size supported by ffmul

  // toCanonical always succeeds
  equivalentProvable({ from: [big264], to: f })(
    F.mod,
    (x) => ForeignField.toCanonical(x, F.modulus),
    'to canonical'
  );

  // addition can fail on two unreduced inputs because we can get x + y - f > 2^264
  equivalentProvable({ from: [big264, f], to: big264 })(
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

  equivalent({ from: [big264], to: unit })(
    (x) => assertWeakBound(x, F.modulus),
    (x) => ForeignField.assertAlmostReduced([x], F.modulus)
  );

  equivalentProvable({ from: [big264, big264], to: unit })(
    (x, y) => assert(x < y, 'not less than'),
    (x, y) => ForeignField.assertLessThan(x, y)
  );

  equivalentProvable({ from: [big264, big264], to: unit })(
    (x, y) => assert(x <= y, 'not less than or equal'),
    (x, y) => ForeignField.assertLessThanOrEqual(x, y)
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
let big264 = unreducedForeignField(264, F);
let chainLength = 5;
let signs = [1n, -1n, -1n, 1n] satisfies (-1n | 1n)[];

let ffProgram = ZkProgram({
  name: 'foreign-field',
  publicOutput: Field3,
  methods: {
    sumchain: {
      privateInputs: [Provable.Array(Field3, chainLength)],
      async method(xs) {
        return {
          publicOutput: ForeignField.sum(xs, signs, F.modulus),
        };
      },
    },
    mulWithBoundsCheck: {
      privateInputs: [Field3, Field3],
      async method(x, y) {
        ForeignField.assertAlmostReduced([x, y], F.modulus);
        return { publicOutput: ForeignField.mul(x, y, F.modulus) };
      },
    },
    mul: {
      privateInputs: [Field3, Field3],
      async method(x, y) {
        return { publicOutput: ForeignField.mul(x, y, F.modulus) };
      },
    },
    inv: {
      privateInputs: [Field3],
      async method(x) {
        return { publicOutput: ForeignField.inv(x, F.modulus) };
      },
    },
    div: {
      privateInputs: [Field3, Field3],
      async method(x, y) {
        return { publicOutput: ForeignField.div(x, y, F.modulus) };
      },
    },
    assertLessThan: {
      privateInputs: [Field3, Field3],
      async method(x, y) {
        ForeignField.assertLessThan(x, y);
        return { publicOutput: x };
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
    let { proof } = await ffProgram.sumchain(xs);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove chain'
);

await equivalentAsync({ from: [big264, big264], to: f }, { runs })(
  (x, y) => {
    assertWeakBound(x, F.modulus);
    assertWeakBound(y, F.modulus);
    return F.mul(x, y);
  },
  async (x, y) => {
    let { proof } = await ffProgram.mulWithBoundsCheck(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove mul'
);

await equivalentAsync({ from: [f, f], to: f }, { runs })(
  (x, y) => F.div(x, y) ?? throwError('no inverse'),
  async (x, y) => {
    let { proof } = await ffProgram.div(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
    return proof.publicOutput;
  },
  'prove div'
);

await equivalentAsync({ from: [f, f], to: unit }, { runs })(
  (x, y) => assert(x < y, 'not less than'),
  async (x, y) => {
    let { proof } = await ffProgram.assertLessThan(x, y);
    assert(await ffProgram.verify(proof), 'verifies');
  },
  'prove less than'
);

// assert mul example
// (x - y) * (x + y) = x^2 - y^2

function assertMulExample(x: Field3, y: Field3, f: bigint) {
  // witness x^2, y^2
  let x2 = Provable.witness(Field3, () => ForeignField.mul(x, x, f));
  let y2 = Provable.witness(Field3, () => ForeignField.mul(y, y, f));

  // assert (x - y) * (x + y) = x^2 - y^2
  let xMinusY = ForeignField.Sum(x).sub(y);
  let xPlusY = ForeignField.Sum(x).add(y);
  let x2MinusY2 = ForeignField.Sum(x2).sub(y2);
  ForeignField.assertMul(xMinusY, xPlusY, x2MinusY2, f);
}

function assertMulExampleNaive(x: Field3, y: Field3, f: bigint) {
  // witness x^2, y^2
  let x2 = Provable.witness(Field3, () => ForeignField.mul(x, x, f));
  let y2 = Provable.witness(Field3, () => ForeignField.mul(y, y, f));

  // assert (x - y) * (x + y) = x^2 - y^2
  let lhs = ForeignField.mul(ForeignField.sub(x, y, f), ForeignField.add(x, y, f), f);
  let rhs = ForeignField.sub(x2, y2, f);
  Provable.assertEqual(Field3, lhs, rhs);
}

let from2 = { from: [f, f] satisfies AnyTuple };
let gates = constraintSystem.size(from2, (x, y) => assertMulExample(x, y, F.modulus));
let gatesNaive = constraintSystem.size(from2, (x, y) => assertMulExampleNaive(x, y, F.modulus));
// the assertMul() version should save 11.5 rows:
// -2*1.5 rows by replacing input MRCs with low-limb ffadd
// -2*4 rows for avoiding the MRC on both mul() and sub() outputs
// -1 row for chaining one ffadd into ffmul
// +0.5 rows for having to combine the two lower result limbs before wiring to ffmul remainder
assert(gates + 11 <= gatesNaive, 'assertMul() saves at least 11 constraints');

let addChainedIntoMul: GateType[] = ['ForeignFieldAdd', ...mulChain];

constraintSystem(
  'assert mul',
  from2,
  (x, y) => assertMulExample(x, y, F.modulus),
  or(
    and(
      contains([addChain(2), addChain(2), addChainedIntoMul]),
      // assertMul() doesn't use any range checks besides on internal values and the quotient
      containsNTimes(2, mrc)
    ),
    allConstant
  )
);

// helper

function containsNTimes(n: number, pattern: readonly GateType[]) {
  return and(contains(repeat(n, pattern)), not(contains(repeat(n + 1, pattern))));
}

function sum(xs: bigint[], signs: (1n | -1n)[], F: FiniteField) {
  let sum = xs[0];
  for (let i = 0; i < signs.length; i++) {
    sum = signs[i] === 1n ? F.add(sum, xs[i + 1]) : F.sub(sum, xs[i + 1]);
  }
  return sum;
}

function assertWeakBound(x: bigint, f: bigint) {
  assert(x >= 0n && x >> l2 <= f >> l2, 'weak bound');
}
