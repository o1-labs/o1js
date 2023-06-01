import { Provable } from '../snarky.js';
import { Scalar as Fq } from '../provable/curve-bigint.js';
import { FieldVar } from './field.js';
import { Scalar, ScalarConst, shift, unshift } from './scalar.js';

// types
Scalar satisfies Provable<Scalar>;

let s0 = Fq.random();
let bits = Fq.toBits(shift(s0)).map((b) => FieldVar.constant(BigInt(b)));

let s = new Scalar(bits);

console.log(s0 === s.toBigInt());
// console.log(s.bits);
