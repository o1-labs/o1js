import { Scalar as Fq } from '../provable/curve-bigint.js';
import { FieldVar } from './field.js';
import { Scalar, ScalarConst, unshift } from './scalar.js';

let s0 = Fq.random();
let bits = Fq.toBits(s0).map((b) => FieldVar.constant(BigInt(b)));

let s = new Scalar(bits);

console.log(unshift(s0) === ScalarConst.toBigint(s.constantValue!));
// console.log(s.bits);
