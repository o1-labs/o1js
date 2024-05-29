import { Bool, Field } from '../wrapped.js';
import { conditionalSwap } from '../merkle-tree.js';
import { Random, test } from '../../testing/property.js';
import { expect } from 'expect';
import { MerkleMap } from '../merkle-map.js';
import { IndexedMerkleMap } from '../merkle-tree-indexed.js';
import { Provable } from '../provable.js';

let map = new IndexedMerkleMap(32);
let x = map.get(0n);
Provable.log('value at 0', x);

test(Random.bool, Random.field, Random.field, (b, x, y) => {
  let [x0, y0] = conditionalSwap(Bool(!!b), Field(x), Field(y));

  // if the boolean is true, it shouldn't swap the fields; otherwise, it should
  if (b) {
    expect(x0.toBigInt()).toEqual(x);
    expect(y0.toBigInt()).toEqual(y);
  } else {
    expect(x0.toBigInt()).toEqual(y);
    expect(y0.toBigInt()).toEqual(x);
  }
});

test(Random.field, (key) => {
  let map = new MerkleMap();
  let witness = map.getWitness(Field(key));
  let [, calculatedKey] = witness.computeRootAndKey(Field(0));
  expect(calculatedKey.toBigInt()).toEqual(key);
});
