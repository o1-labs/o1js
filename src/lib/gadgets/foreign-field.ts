import { Field } from '../field.js';
import { foreignFieldAdd } from '../gates.js';
import { Tuple } from '../util/types.js';
import { assert, exists } from './common.js';
import { L, lMask, twoL, twoLMask } from './range-check.js';

type Field3 = [Field, Field, Field];
type bigint3 = [bigint, bigint, bigint];
type Sign = -1n | 1n;

function sumchain(xs: Field3[], signs: Sign[], f: bigint) {
  assert(xs.length === signs.length + 1, 'inputs and operators match');

  // TODO
}

function singleAdd(x: Field3, y: Field3, sign: Sign, f: bigint): Field3 {
  let f_ = split(f);

  let [r0, r1, r2, overflow, carry] = exists(5, () => {
    let x_ = bigint3(x);
    let y_ = bigint3(y);

    // figure out if there's overflow
    let r = collapse(x_) + sign * collapse(y_);
    let overflow = 0n;
    if (sign === 1n && r > f) overflow = 1n;
    if (sign === -1n && r < 0n) overflow = -1n;

    // do the carry
    let r01 = collapse2(x_) + sign * collapse2(y_) - overflow * collapse2(f_);
    let carry = r01 >> twoL;
    r01 &= twoLMask;
    let [r0, r1] = split2(r01);
    let r2 = x_[2] + sign * y_[2] - overflow * f_[2] + carry;

    return [r0, r1, r2, overflow, carry];
  });

  foreignFieldAdd({
    left: x,
    right: y,
    overflow,
    carry,
    modulus: f_,
    sign,
  });

  return [r0, r1, r2];
}

function Field3(x: bigint3): Field3 {
  return Tuple.map(x, (x) => new Field(x));
}
function bigint3(x: Field3): bigint3 {
  return Tuple.map(x, (x) => x.toBigInt());
}

function collapse([x0, x1, x2]: bigint3) {
  return x0 + (x1 << L) + (x2 << twoL);
}
function split(x: bigint): bigint3 {
  return [x & lMask, (x >> L) & lMask, x >> twoL];
}

function collapse2([x0, x1]: bigint3 | [bigint, bigint]) {
  return x0 + (x1 << L);
}
function split2(x: bigint): [bigint, bigint] {
  return [x & lMask, x >> L];
}
