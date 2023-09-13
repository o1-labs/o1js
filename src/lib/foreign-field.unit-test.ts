import { ProvablePure } from '../snarky.js';
import { Group } from './core.js';
import { Field, FieldVar } from './field.js';
import { ForeignField, createForeignField, limbBits } from './foreign-field.js';
import { Scalar as Fq, Group as G } from '../provable/curve-bigint.js';
import { expect } from 'expect';
import { createEquivalenceTesters, throwError } from './testing/equivalent.js';
import { test, Random } from './testing/property.js';
import { Provable } from './provable.js';
import { ZkProgram } from './proof_system.js';
import { Circuit, circuitMain } from './circuit.js';
import { Scalar } from './scalar.js';

// toy example - F_17

class SmallField extends createForeignField(17n) {}
let x = new SmallField(16);
x.assertEquals(-1); // 16 = -1 (mod 17)
x.mul(x).assertEquals(1); // 16 * 16 = 15 * 17 + 1 = 1 (mod 17)

// invalid example - modulus too large

expect(() => createForeignField(1n << 260n)).toThrow(
  'modulus exceeds the max supported size'
);

// real example - foreign field arithmetic in the Pallas scalar field

class ForeignScalar extends createForeignField(Fq.modulus) {}

// types
ForeignScalar satisfies ProvablePure<ForeignScalar>;

// basic constructor / IO
{
  let s0 = 1n + ((1n + (1n << limbBits)) << limbBits);
  let scalar = new ForeignScalar(s0);

  expect(scalar.value).toEqual([0, FieldVar[1], FieldVar[1], FieldVar[1]]);
  expect(scalar.toBigInt()).toEqual(s0);
}

test(Random.scalar, (x0, assert) => {
  let x = new ForeignScalar(x0);
  assert(x.toBigInt() === x0);
  assert(x.isConstant());
});

// test equivalence of in-SNARK and out-of-SNARK operations

let { equivalent1, equivalent2, equivalentBool2, equivalentVoid2 } =
  createEquivalenceTesters(ForeignScalar, (x) => new ForeignScalar(x));

// arithmetic
equivalent2((x, y) => x.add(y), Fq.add, Random.scalar);
equivalent1((x) => x.neg(), Fq.negate, Random.scalar);
equivalent2((x, y) => x.sub(y), Fq.sub, Random.scalar);
equivalent2((x, y) => x.mul(y), Fq.mul, Random.scalar);
equivalent1(
  (x) => x.inv(),
  (x) => Fq.inverse(x) ?? throwError('division by 0'),
  Random.scalar
);

// equality
equivalentBool2(
  (x, y) => x.equals(y),
  (x, y) => x === y,
  Random.scalar
);
equivalentVoid2(
  (x, y) => x.assertEquals(y),
  (x, y) => x === y || throwError('not equal'),
  Random.scalar
);

// toBits / fromBits
equivalent1(
  (x) => {
    let bits = x.toBits();
    expect(bits.length).toEqual(255);
    return ForeignScalar.fromBits(bits);
  },
  (x) => x,
  Random.scalar
);

// test random sum chains up to length 20

test(
  Random.array(
    Random.record({
      scalar: Random.scalar,
      operation: Random.oneOf<[1, -1]>(1, -1),
    }),
    Random.nat(20)
  ),
  (sumSpec) => {
    if (sumSpec.length === 0) return;

    let scalars = sumSpec.map((s) => s.scalar);
    let operations = sumSpec.slice(1).map((s) => s.operation);
    let functions = operations.map((op) => (op === 1 ? Fq.add : Fq.sub));

    // compute sum on bigints
    let sum = scalars.reduce(
      (sum, s, i) => (i === 0 ? s : functions[i - 1](sum, s)),
      0n
    );

    // check that the expected sum is computed in provable code

    function main() {
      let scalarVars = scalars.map((s) =>
        Provable.witness(ForeignScalar, () => new ForeignScalar(s))
      );
      let z = ForeignScalar.sum(scalarVars, operations);
      Provable.asProver(() => expect(z.toBigInt()).toEqual(sum));
    }

    Provable.runAndCheck(main);

    // check that the expected gates are created

    let expectedGateTypes: GateType[] = [];

    let boundsCheck: GateType[] = [
      'ForeignFieldAdd',
      'Zero',
      'RangeCheck0',
      'RangeCheck0',
      'RangeCheck1',
      'Zero',
    ];

    // for every witnessed scalar, add gates for the bounds check
    scalars.forEach(() => expectedGateTypes.push(...boundsCheck));

    // now, add as many ForeignFieldAdd gates as there are additions
    operations.forEach(() => expectedGateTypes.push('ForeignFieldAdd'));

    // add a final bound check for the result
    expectedGateTypes.push(...boundsCheck);

    // compute the actual gates
    let { gates } = Provable.constraintSystem(main);

    // split out all generic gates
    let generics = gates.filter((g) => g.type === 'Generic');
    gates = gates.filter((g) => g.type !== 'Generic');
    let gateTypes = gates.map((g) => g.type);

    // check that gates without generics are as expected
    // TODO: reenable after adapting to new gadget layout!
    // expect(gateTypes).toEqual(expectedGateTypes);

    // check that generic gates correspond to adding one of the constants 0, 1 and 2^88 (the limb size)
    let allowedConstants = new Set([0n, 1n, 1n << 88n]);
    let ok = generics.every(({ coeffs: [left, right, out, mul, constant] }) => {
      let isConstantGate =
        ((left === '0' && right === '1') || (left === '1' && right === '0')) &&
        out === '0' &&
        mul === '0';
      let constantValue = Field.ORDER - BigInt(constant);
      return isConstantGate && allowedConstants.has(constantValue);
    });
    expect(ok).toBe(true);
  }
);

// scalar shift in foreign field arithmetic vs in the exponent

let scalarShift = Fq(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

function unshift(s: ForeignField) {
  return s.sub(scalarShift).mul(oneHalf);
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
    ForeignScalar,
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
    ForeignScalar,
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

// tests with proving

function simpleMain() {
  let s = Provable.witness(
    ForeignScalar,
    () => new ForeignScalar(scalarBigint)
  );
  s.mul(oneHalf);
}

class Main extends Circuit {
  @circuitMain
  static main() {
    simpleMain();
  }
}

console.log('compiling');
let kp = await Main.generateKeypair();

let cs = kp.constraintSystem();
// console.log(JSON.stringify(cs.filter((g) => g.type !== 'Zero')));
console.log('# rows', cs.length);

console.log('proving');
let proof0 = await Main.prove([], [], kp);

console.log('verifying');
let ok = await Main.verify([], kp.verificationKey(), proof0);
console.log('verifies?', ok);

let Program = ZkProgram({
  methods: {
    test: {
      privateInputs: [],
      method() {
        simpleMain();
      },
    },
  },
});

console.log('compiling');
await Program.compile();

console.log('proving');
let proof = await Program.test();

console.log('verifying');
ok = await Program.verify(proof);
console.log('verifies?', ok);

type GateType =
  | 'Zero'
  | 'Generic'
  | 'RangeCheck0'
  | 'RangeCheck1'
  | 'ForeignFieldAdd';
