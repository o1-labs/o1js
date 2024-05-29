import { Bool, Field } from '../wrapped.js';
import { MerkleTree, conditionalSwap } from '../merkle-tree.js';
import { Random, test } from '../../testing/property.js';
import { expect } from 'expect';
import { MerkleMap } from '../merkle-map.js';
import { IndexedMerkleMap, Leaf } from '../merkle-tree-indexed.js';

// some manual tests for IndexedMerkleMap
{
  let map = new (IndexedMerkleMap(3))();

  map.insert(2n, 14n);
  map.insert(1n, 13n);

  // -1 (the max value) can't be inserted, because there's always a value pointing to it,
  // and yet it's not included as a leaf
  expect(() => map.insert(-1n, 11n)).toThrow('Key already exists');
  expect(() => map.set(-1n, 12n)).toThrow('Invalid leaf');

  expect(map.get(1n).assertSome().toBigInt()).toEqual(13n);
  expect(map.get(2n).assertSome().toBigInt()).toEqual(14n);
  expect(map.get(3n).isSome.toBoolean()).toEqual(false);

  map.update(2n, 15n);
  map.update(0n, 12n);
  expect(map.get(2n).assertSome().toBigInt()).toEqual(15n);

  // TODO get() doesn't work on 0n because the low node checks fail
  // expect(map.get(0n).assertSome().toBigInt()).toEqual(12n);

  // can't insert the same key twice
  expect(() => map.insert(1n, 17n)).toThrow('Key already exists');

  map.set(4n, 16n);
  map.set(1n, 17n);
  expect(map.get(4n).assertSome().toBigInt()).toEqual(16n);
  expect(map.get(1n).assertSome().toBigInt()).toEqual(17n);
  expect(map.get(5n).isSome.toBoolean()).toEqual(false);

  // can't insert more than 2^(height - 1) = 2^2 = 4 keys
  expect(() => map.insert(8n, 19n)).toThrow('4 does not fit in 2 bits');
  expect(() => map.set(8n, 19n)).toThrow('4 does not fit in 2 bits');

  // check that internal nodes exactly match `MerkleTree` implementation
  let keys = [0n, 2n, 1n, 4n]; // insertion order
  let leafNodes = keys.map((key) => Leaf.hashNode(map._findLeaf(key).self));
  let tree = new MerkleTree(3);
  tree.fill(leafNodes);
  let nodes = map.data.get().nodes;

  for (let level = 0; level < 3; level++) {
    for (let i = 0; i < 2 ** (2 - level); i++) {
      expect(nodes[level][i]).toEqual(tree.nodes[level][i].toBigInt());
    }
  }

  // check that internal `sortedLeaves` are as expected

  // data sorted by key:
  let sorted = [
    { key: 0n, value: 12n, index: 0n },
    { key: 1n, value: 17n, index: 2n },
    { key: 2n, value: 15n, index: 1n },
    { key: 4n, value: 16n, index: 3n },
  ];
  let sortedLeaves = map.data.get().sortedLeaves;

  for (let i = 0; i < 4; i++) {
    expect(sortedLeaves[i]).toEqual({
      key: sorted[i].key,
      value: sorted[i].value,
      nextKey: sorted[i + 1]?.key ?? Field.ORDER - 1n,
      index: sorted[i].index,
      nextIndex: sorted[i + 1]?.index ?? 0n,
    });
  }
}

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
