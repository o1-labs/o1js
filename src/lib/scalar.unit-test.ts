import { Scalar as Fq } from '../provable/curve-bigint.js';
import { Field, FieldVar } from './field.js';
import { Scalar, ScalarConst, shift } from './scalar.js';
import { Provable } from './provable.js';
import { MlArray, Scalar as ScalarSnarky } from '../snarky.js';

let scalarShift = Fq(1n + 2n ** 255n);
let oneHalf = Fq.inverse(2n)!;

// types
Scalar satisfies Provable<Scalar>;

// let s0 = Fq.random();
// let bits = Fq.toBits(shift(s0)).map((b) => FieldVar.constant(BigInt(b)));

// let s = new Scalar(bits);

// console.log(s0 === s.toBigInt());
// console.log(s.bits);

let h0 = new Field(
  14402037339225697224364383372940415733563435755837035364105242770332943848092n
);
let bits = h0.toBits();
let bitsRaw = [
  0,
  ...bits.map((x) => x.toField().value),
] satisfies MlArray<FieldVar>;
console.log(bits.length);
let h1 = new Scalar(bitsRaw);
let h2 = new ScalarSnarky(bitsRaw);
console.log(ScalarConst.toBigint(h1.constantValue!));
console.log(ScalarConst.toBigint(h2.constantValue!));

let h3 = Scalar.fromFields(Scalar.toFields(h1));
console.log(ScalarConst.toBigint(h3.constantValue!));

function printBits([, ...bits]: [0, ...[0, Uint8Array][]]) {
  console.log(bits.map((b) => b[1][0]).join(' '));
}
