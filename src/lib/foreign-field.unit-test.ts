import { ProvablePure } from '../snarky.js';
import { Field, Group } from './core.js';
import {
  AlmostForeignField,
  ForeignField,
  UnreducedForeignField,
  createForeignField,
} from './foreign-field.js';
import { Scalar as Fq, Group as G } from '../provable/curve-bigint.js';
import { expect } from 'expect';
import {
  bool,
  equivalentProvable as equivalent,
  equivalent as equivalentNonProvable,
  first,
  spec,
  throwError,
  unit,
} from './testing/equivalent.js';
import { test, Random } from './testing/property.js';
import { Provable } from './provable.js';
import { Circuit, circuitMain } from './circuit.js';
import { Scalar } from './scalar.js';
import { l } from './gadgets/range-check.js';
import { assert } from './gadgets/common.js';

// toy example - F_17

class SmallField extends createForeignField(17n) {}

let x = SmallField.from(16);
x.assertEquals(-1); // 16 = -1 (mod 17)
x.mul(x).assertEquals(1); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)

// invalid example - modulus too large

expect(() => createForeignField(1n << 260n)).toThrow(
  'modulus exceeds the max supported size'
);

// real example - foreign field arithmetic in the Pallas scalar field

class ForeignScalar extends createForeignField(Fq.modulus) {}

// types
ForeignScalar.provable satisfies ProvablePure<ForeignScalar>;

// basic constructor / IO
{
  let s0 = 1n + ((1n + (1n << l)) << l);
  let scalar = new ForeignScalar(s0);

  expect(scalar.value).toEqual([Field(1), Field(1), Field(1)]);
  expect(scalar.toBigInt()).toEqual(s0);
}

test(Random.scalar, (x0, assert) => {
  let x = new ForeignScalar(x0);
  assert(x.toBigInt() === x0);
  assert(x.isConstant());
});

// test equivalence of in-SNARK and out-of-SNARK operations

let f = spec({
  rng: Random.scalar,
  there: ForeignScalar.from,
  back: (x) => x.toBigInt(),
  provable: ForeignScalar.AlmostReduced.provable,
});
let u264 = spec({
  rng: Random.bignat(1n << 264n),
  there: ForeignScalar.from,
  back: (x) => x.toBigInt(),
  provable: ForeignScalar.Unreduced.provable,
});

// arithmetic
equivalent({ from: [f, f], to: u264 })(Fq.add, (x, y) => x.add(y));
equivalent({ from: [f, f], to: u264 })(Fq.sub, (x, y) => x.sub(y));
equivalent({ from: [f], to: u264 })(Fq.negate, (x) => x.neg());
equivalent({ from: [f, f], to: u264 })(Fq.mul, (x, y) => x.mul(y));
equivalent({ from: [f], to: f })(
  (x) => Fq.inverse(x) ?? throwError('division by 0'),
  (x) => x.inv()
);
equivalent({ from: [f, f], to: f })(
  (x, y) => Fq.div(x, y) ?? throwError('division by 0'),
  (x, y) => x.div(y)
);

// equality
equivalent({ from: [f, f], to: bool })(
  (x, y) => x === y,
  (x, y) => x.equals(y)
);
equivalent({ from: [f, f], to: unit })(
  (x, y) => x === y || throwError('not equal'),
  (x, y) => x.assertEquals(y)
);
// doesn't fail in provable mode just because the range check is not checked by runAndCheck
// TODO check all gates
equivalentNonProvable({ from: [f, first(u264)], to: unit })(
  (x, y) => x < y || throwError('not less than'),
  (x, y) => x.assertLessThan(y)
);

// toBits / fromBits
equivalent({ from: [f], to: f })(
  (x) => x,
  (x) => {
    let bits = x.toBits();
    expect(bits.length).toEqual(255);
    return ForeignScalar.fromBits(bits);
  }
);

// scalar shift in foreign field arithmetic vs in the exponent

let scalarShift = Fq(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

function unshift(s: ForeignField) {
  return s.sub(scalarShift).assertAlmostReduced().mul(oneHalf);
}
function scaleShifted(point: Group, shiftedScalar: Scalar) {
  let oneHalfGroup = point.scale(oneHalf);
  let shiftGroup = oneHalfGroup.scale(scalarShift);
  return oneHalfGroup.scale(shiftedScalar).sub(shiftGroup);
}

let scalarBigint = Fq.random();
let pointBigint = G.scale(G.generatorMina, scalarBigint);

// perform a "scalar unshift" in foreign field arithmetic,
// then convert to scalar from bits (which shifts it back) and scale a point by the scalar
function main0() {
  let ffScalar = Provable.witness(
    ForeignScalar.provable,
    () => new ForeignScalar(scalarBigint)
  );
  let bitsUnshifted = unshift(ffScalar).toBits();
  let scalar = Scalar.fromBits(bitsUnshifted);

  let generator = Provable.witness(Group, () => Group.generator);
  let point = generator.scale(scalar);
  point.assertEquals(Group(pointBigint));
}

// go directly from foreign scalar to scalar and perform a shifted scale
// = same end result as main0
function main1() {
  let ffScalar = Provable.witness(
    ForeignScalar.provable,
    () => new ForeignScalar(scalarBigint)
  );
  let bits = ffScalar.toBits();
  let scalarShifted = Scalar.fromBits(bits);

  let generator = Provable.witness(Group, () => Group.generator);
  let point = scaleShifted(generator, scalarShifted);
  point.assertEquals(Group(pointBigint));
}

// check provable and non-provable versions are correct
main0();
main1();
Provable.runAndCheck(main0);
Provable.runAndCheck(main1);

// using foreign field arithmetic should result in much fewer constraints
let { rows: rows0 } = Provable.constraintSystem(main0);
let { rows: rows1 } = Provable.constraintSystem(main1);
expect(rows0 + 100).toBeLessThan(rows1);

// test with proving

class Main extends Circuit {
  @circuitMain
  static main() {
    main0();
  }
}

let kp = await Main.generateKeypair();

let cs = kp.constraintSystem();
assert(
  cs.length === 1 << 13,
  `should have ${cs.length} = 2^13 rows, the smallest supported number`
);

let proof = await Main.prove([], [], kp);

let ok = await Main.verify([], kp.verificationKey(), proof);
assert(ok, 'proof should verify');
