import { ProvablePure } from '../snarky.js';
import { FieldVar } from './field.js';
import { ForeignField, createForeignField, limbBits } from './foreign-field.js';
import { Scalar as Fq } from '../provable/curve-bigint.js';
import { expect } from 'expect';
import { createEquivalenceTesters, throwError } from './testing/equivalent.js';
import { test, Random } from './testing/property.js';
import { Provable } from './provable.js';
import { ZkProgram } from './proof_system.js';

let ForeignScalar = createForeignField(Fq.modulus);

// types
ForeignScalar satisfies ProvablePure<ForeignField>;

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

// shift

let scalarShift = Fq(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

function shift(s: Fq): Fq {
  return Fq.add(Fq.add(s, s), scalarShift);
}

let scalar = Fq.random();
let scalarShifted = shift(scalar);

function main() {
  // perform a "scalar shift" in foreign field arithmetic
  let x = Provable.witness(ForeignScalar, () => new ForeignScalar(scalar));
  let x2 = x.add(x);
  let shifted = x2.add(scalarShift);
  shifted.assertEquals(scalarShifted);
}
Provable.runAndCheck(main);
let { rows, digest, gates, publicInputSize } = Provable.constraintSystem(main);

let Program = ZkProgram({
  methods: {
    test: {
      privateInputs: [],
      method() {
        main();
      },
    },
  },
});

// console.log(JSON.stringify(gates));
console.log({ rows, digest, publicInputSize });

console.log('compiling');
await Program.compile();

console.log('proving');
let proof = await Program.test();

let ok = await Program.verify(proof);
console.log('verifies?', ok);
