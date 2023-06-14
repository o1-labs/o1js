import { ProvablePure } from '../snarky.js';
import { FieldVar } from './field.js';
import { ForeignField, createForeignField, limbBits } from './foreign-field.js';
import { Scalar as Fq } from '../provable/curve-bigint.js';
import { expect } from 'expect';
import { createEquivalenceTesters, throwError } from './testing/equivalent.js';
import { Random } from './testing/random.js';

let ForeignScalar = createForeignField(Fq.modulus);

// types
ForeignScalar satisfies ProvablePure<ForeignField>;

// basic constructor / IO

let s0 = 1n + ((1n + (1n << limbBits)) << limbBits);
let scalar = new ForeignScalar(s0);

expect(scalar.value).toEqual([0, FieldVar[1], FieldVar[1], FieldVar[1]]);
expect(scalar.toBigInt()).toEqual(s0);

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
