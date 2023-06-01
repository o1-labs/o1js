import { Scalar as Fq } from '../provable/curve-bigint.js';
import { Field, FieldVar } from './field.js';
import { Scalar, shift, unshift } from './scalar.js';
import { Provable } from './provable.js';
import { Bool, MlArray } from '../snarky.js';
import assert from 'assert';

Scalar satisfies Provable<Scalar>;

let x = Field.random().toBigInt();

let h0 = new Field(unshift(x));
let bits = h0.toBits();
let bitsRaw = [
  0,
  ...bits.map((x) => x.toField().value),
] satisfies MlArray<FieldVar>;

let h1 = new (Scalar as any)(bitsRaw);
let h2 = Scalar.fromFields(Scalar.toFields(h1));
let h3 = Scalar.from(x);

assert(h1.toBigInt() === x);
assert(h2.toBigInt() === x);
assert(h3.toBigInt() === x);

let bits_ = Fq.toBits(unshift(x)).map((b) => Bool(b));
let s = Scalar.fromBits(bits_);
assert(x === s.toBigInt());
