import { Field } from '../field.js';
import { Gates, foreignFieldAdd } from '../gates.js';
import { Tuple } from '../util/types.js';
import { assert, exists } from './common.js';
import { L, lMask, multiRangeCheck, twoL, twoLMask } from './range-check.js';

export { ForeignField };

type Field3 = [Field, Field, Field];
type bigint3 = [bigint, bigint, bigint];
type Sign = -1n | 1n;

const ForeignField = {
  add(x: Field3, y: Field3, f: bigint) {
    return sumChain([x, y], [1n], f);
  },
  sub(x: Field3, y: Field3, f: bigint) {
    return sumChain([x, y], [-1n], f);
  },
  sumChain,
};

/**
 * computes x[0] + sign[0] * x[1] + ... + sign[n-1] * x[n] modulo f
 *
 * assumes that inputs are range checked, does range check on the result.
 */
function sumChain(x: Field3[], sign: Sign[], f: bigint) {
  assert(x.length === sign.length + 1, 'inputs and operators match');

  let result = x[0];
  for (let i = 0; i < sign.length; i++) {
    ({ result } = singleAdd(result, x[i + 1], sign[i], f));
  }
  // final zero row to hold result
  Gates.zero(...result);

  // range check result
  multiRangeCheck(...result);
}

/**
 * core building block for non-native addition
 *
 * **warning**: this just adds the `foreignFieldAdd` row;
 * it _must_ be chained with a second row that holds the result in its first 3 cells.
 *
 * the second row could, for example, be `zero`, `foreignFieldMul`, or another `foreignFieldAdd`.
 */
function singleAdd(x: Field3, y: Field3, sign: Sign, f: bigint) {
  let f_ = split(f);

  let [r0, r1, r2, overflow, carry] = exists(5, () => {
    let x_ = bigint3(x);
    let y_ = bigint3(y);

    // figure out if there's overflow
    let r = collapse(x_) + sign * collapse(y_);
    let overflow = 0n;
    if (sign === 1n && r > f) overflow = 1n;
    if (sign === -1n && r < 0n) overflow = -1n;
    if (f === 0n) overflow = 0n; // special case where overflow doesn't change anything

    // do the add with carry
    // note: this "just works" with negative r01
    let r01 = collapse2(x_) + sign * collapse2(y_) - overflow * collapse2(f_);
    let carry = r01 >> twoL;
    r01 &= twoLMask;
    let [r0, r1] = split2(r01);
    let r2 = x_[2] + sign * y_[2] - overflow * f_[2] + carry;

    return [r0, r1, r2, overflow, carry];
  });

  foreignFieldAdd({ left: x, right: y, overflow, carry, modulus: f_, sign });

  return { result: [r0, r1, r2] satisfies Field3, overflow };
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
