import { ProvablePure } from '../snarky.js';
import { ForeignField, createForeignField } from './foreign-field.js';
import { Scalar } from './scalar.js';
import { expect } from 'expect';

let ForeignScalar = createForeignField(Scalar.ORDER);

// types
ForeignScalar satisfies ProvablePure<ForeignField>;

// basic constructor / IO
let scalar = new ForeignScalar(1n << 88n);

console.dir(scalar, { depth: Infinity });
console.dir(ForeignScalar.modulus, { depth: Infinity });

expect(scalar.toBigInt()).toEqual(1n << 88n);
