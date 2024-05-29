import { Bool, Field } from '../wrapped.js';
import { conditionalSwap } from '../merkle-tree.js';
import { Random, test } from '../../testing/property.js';
import { expect } from 'expect';
import { MerkleMap } from '../merkle-map.js';
import { IndexedMerkleMap } from '../merkle-tree-indexed.js';

console.log('new map');
let map = new (IndexedMerkleMap(3))();

console.log('insert 2 and 1');
map.insert(2n, 14n);
map.insert(1n, 13n);
// console.dir(map.findLeaf(2n), { depth: null });

expect(map.get(1n).assertSome().toBigInt()).toEqual(13n);
expect(map.get(2n).assertSome().toBigInt()).toEqual(14n);

console.log('update 2 and 0');
map.update(2n, 15n);
map.update(0n, 12n);
// TODO get() doesn't work on 0n because the low node checks fail
// expect(map.get(0n).assertSome().toBigInt()).toEqual(12n);
expect(map.get(2n).assertSome().toBigInt()).toEqual(15n);

console.dir(map.data.get().sortedLeaves, { depth: null });

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
