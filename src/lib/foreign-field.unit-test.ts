import { ProvablePure } from '../snarky.js';
import { FieldVar } from './field.js';
import { ForeignField, createForeignField, limbBits } from './foreign-field.js';
import { Scalar as Fq } from '../provable/curve-bigint.js';
import { Scalar } from './scalar.js';
import { expect } from 'expect';
import { createEquivalenceTesters, throwError } from './testing/equivalent.js';
import { Random } from './testing/random.js';

let ForeignScalar = createForeignField(Scalar.ORDER);

// types
ForeignScalar satisfies ProvablePure<ForeignField>;

// basic constructor / IO
let s0 = 1n + ((1n + (1n << limbBits)) << limbBits);
let scalar = new ForeignScalar(s0);

expect(scalar.value).toEqual([0, FieldVar[1], FieldVar[1], FieldVar[1]]);
expect(scalar.toBigInt()).toEqual(s0);

let { equivalent1, equivalent2, equivalentVoid1, equivalentVoid2 } =
  createEquivalenceTesters(ForeignScalar, (x) => new ForeignScalar(x));

equivalent2((x, y) => x.add(y), Fq.add, Random.scalar);
equivalent1((x) => x.neg(), Fq.negate, Random.scalar);
equivalent2((x, y) => x.sub(y), Fq.sub, Random.scalar);
equivalent2((x, y) => x.mul(y), Fq.mul, Random.scalar);
equivalent1(
  (x) => x.inv(),
  (x) => Fq.inverse(x) ?? throwError('division by 0'),
  Random.scalar
);

// equivalent2(
//   (x, y) => x.equals(y).toField(),
//   (x, y) => BigInt(x === y)
// );
// equivalentVoid2(
//   (x, y) => x.assertEquals(y),
//   (x, y) => x === y || throwError('not equal')
// );
