import { Bool, Field } from './core.js';
import { maybeSwap, maybeSwapBad } from './merkle_tree.js';
import { Random, test } from './testing/property.js';
import { expect } from 'expect';

test(Random.bool, Random.field, Random.field, (b, x, y) => {
  let [x0, y0] = maybeSwap(Bool(!!b), Field(x), Field(y));
  let [x1, y1] = maybeSwapBad(Bool(!!b), Field(x), Field(y));

  // both versions of `maybeSwap` should behave the same
  expect(x0).toEqual(x1);
  expect(y0).toEqual(y1);

  // if the boolean is true, it shouldn't swap the fields; otherwise, it should
  if (b) {
    expect(x0.toBigInt()).toEqual(x);
    expect(y0.toBigInt()).toEqual(y);
  } else {
    expect(x0.toBigInt()).toEqual(y);
    expect(y0.toBigInt()).toEqual(x);
  }
});
