import { Poseidon as PoseidonBigint } from '../../bindings/crypto/poseidon.js';
import { Bool, Field } from './wrapped.js';
import { Option } from './option.js';
import { Struct } from './types/struct.js';
import { InferValue } from 'src/bindings/lib/provable-generic.js';
import { assert } from './gadgets/common.js';
import { Unconstrained } from './types/unconstrained.js';
import { Provable } from './provable.js';
import { Poseidon } from './crypto/poseidon.js';
import { conditionalSwap } from './merkle-tree.js';

export { IndexedMerkleMap };

type IndexedMerkleMapBase = {
  root: Field;

  // (lower-level) method to insert a new leaf `(key, value)`. proves that `key` doesn't exist yet
  insert(key: Field, value: Field): void;

  // (lower-level) method to update an existing leaf `(key, value)`. proves that the `key` exists.
  update(key: Field, value: Field): void;

  // method that performs _either_ an insertion or update, depending on whether the key exists
  set(key: Field, value: Field): void;

  // method to get a value from a key. returns an option to account for the key not existing
  // note: this has to prove that the option's `isSome` is correct
  get(key: Field): Option<Field>; // the optional `Field` here is the value

  // optional / nice-to-have: remove a key and its value from the tree; proves that the key is included.
  // (implementation: leave a wasted leaf in place but skip it in the linked list encoding)
  // remove(key: Field): void;
};

type BaseLeaf = {
  key: Field;
  value: Field;
  nextKey: Field;
  nextIndex: Field;
};

class Leaf extends Struct({
  value: Field,

  key: Field,
  nextKey: Field,

  index: Field,
  nextIndex: Field,

  sortedIndex: Unconstrained.provableWithEmpty(0),
}) {
  static hashNode({ key, value, nextKey, nextIndex }: BaseLeaf) {
    return Poseidon.hash([key, value, nextKey, nextIndex]);
  }
}
type LeafValue = InferValue<typeof Leaf>;

class OptionField extends Option(Field) {}
class LeafPair extends Struct({ low: Leaf, self: Leaf }) {}

class IndexedMerkleMap implements IndexedMerkleMapBase {
  // data defining the provable interface of a tree
  root: Field;
  length: Field; // length of the leaves array
  readonly height: number;

  // the raw data stored in the tree, plus helper structures
  readonly data: Unconstrained<{
    // for every level, an array of hashes
    readonly nodes: (bigint | undefined)[][];

    // leaves sorted by key, with a circular linked list encoded by nextKey
    // we always have
    // sortedLeaves[0].key = 0
    // sortedLeaves[n-1].nextKey = Field.ORDER - 1
    // for i=0,...n-2, sortedLeaves[i].nextKey = sortedLeaves[i+1].key
    readonly sortedLeaves: LeafValue[];
  }>;

  /**
   * Creates a new, empty Indexed Merkle Map, given its height.
   */
  constructor(height: number) {
    assert(height > 0, 'height must be positive');
    assert(
      height < 53,
      'height must be less than 53, so that we can use 64-bit floats to represent indices.'
    );

    let nodes: (bigint | undefined)[][] = Array(height);
    for (let level = 0; level < height; level++) {
      nodes[level] = [];
    }

    let firstLeaf = {
      key: 0n,
      value: 0n,
      // maximum, which is always greater than any key that is a hash
      nextKey: Field.ORDER - 1n,
      index: 0n,
      nextIndex: 0n, // TODO: ok?
      sortedIndex: Unconstrained.from(0),
    };
    let firstNode = Leaf.hashNode(Leaf.fromValue(firstLeaf));
    this.setLeafNode(0, firstNode.toBigInt());
    this.root = Field(this.getNode(height - 1, 0, true));

    this.length = Field(1);
    let leaves: LeafValue[] = [firstLeaf];
    let sortedLeaves: LeafValue[] = [firstLeaf];
    this.data = Unconstrained.from({ leaves, sortedLeaves, nodes });
  }

  insert(key: Field, value: Field) {
    // prove that the key doesn't exist yet by presenting a valid low node
    let low = Provable.witness(Leaf, () => this.findLeaf(key).low);
    this.proveInclusion(low, 'Invalid low node');
    low.key.assertLessThan(key, 'Invalid low node');

    // if the key does exist, we have lowNode.nextKey == key, and this line fails
    key.assertLessThan(low.nextKey, 'Key already exists in the tree');

    // update low node
    this.updateLeaf(low, { nextKey: key, nextIndex: this.length });

    // append new leaf
    this.appendLeaf(low, { key, value });
  }

  update(key: Field, value: Field) {
    // prove that the key exists by presenting a leaf that contains it
    let self = Provable.witness(Leaf, () => this.findLeaf(key).self);
    this.proveInclusion(self, 'Key does not exist in the tree');
    self.key.assertEquals(key, 'Invalid leaf');

    // update leaf
    this.updateLeaf(self, { value });
  }

  set(key: Field, value: Field) {
    // prove whether the key exists or not, by showing a valid low node
    let { low, self } = Provable.witness(LeafPair, () => this.findLeaf(key));
    this.proveInclusion(low, 'Invalid low node');
    low.key.assertLessThan(key, 'Invalid low node');
    key.assertLessThanOrEqual(low.nextKey, 'Invalid low node');

    // the key exists iff lowNode.nextKey == key
    let keyExists = low.nextKey.equals(key);

    // prove inclusion of this leaf if it exists
    this.proveInclusionIf(keyExists, self, 'Invalid leaf');
    assert(keyExists.implies(self.key.equals(key)), 'Invalid leaf');

    // the leaf's index depends on whether it exists
    let index = Provable.if(keyExists, low.nextIndex, this.length);

    // update low node, or leave it as is
    let newLow = { ...low, nextKey: key, nextIndex: index };
    this.root = this.computeRoot(low.index, Leaf.hashNode(newLow));
    this.setLeafUnconstrained(true, newLow);

    // update leaf, or append a new one
    let newLeaf = {
      key,
      value,
      nextKey: Provable.if(keyExists, self.nextKey, low.nextKey),
      nextIndex: Provable.if(keyExists, self.nextIndex, low.nextIndex),
      index,
      sortedIndex: Unconstrained.witness(() => low.sortedIndex.get() + 1),
    };
    this.root = this.computeRoot(index, Leaf.hashNode(newLeaf));
    this.length = Provable.if(keyExists, this.length, this.length.add(1));
    this.setLeafUnconstrained(keyExists, newLeaf);
  }

  get(key: Field): Option<Field> {
    // prove whether the key exists or not, by showing a valid low node
    let { low, self } = Provable.witness(LeafPair, () => this.findLeaf(key));
    this.proveInclusion(low, 'Invalid low node');
    low.key.assertLessThan(key, 'Invalid low node');
    key.assertLessThanOrEqual(low.nextKey, 'Invalid low node');

    // the key exists iff lowNode.nextKey == key
    let keyExists = low.nextKey.equals(key);

    // prove inclusion of this leaf if it exists
    this.proveInclusionIf(keyExists, self, 'Invalid leaf');
    assert(keyExists.implies(self.key.equals(key)), 'Invalid leaf');

    return new OptionField({ isSome: keyExists, value: self.value });
  }

  // helper methods

  proveInclusion(leaf: Leaf, message?: string) {
    // TODO: here, we don't actually care about the index, so we could add a mode where `computeRoot()` doesn't prove it
    let node = Leaf.hashNode(leaf);
    let root = this.computeRoot(leaf.index, node);
    root.assertEquals(this.root, message ?? 'Leaf is not included in the tree');
  }

  proveInclusionIf(condition: Bool, leaf: Leaf, message?: string) {
    let node = Leaf.hashNode(leaf);
    let root = this.computeRoot(leaf.index, node);
    assert(
      condition.implies(root.equals(this.root)),
      message ?? 'Leaf is not included in the tree'
    );
  }

  /**
   * Update existing leaf.
   *
   * Note: we never update the key or index of a leaf.
   */
  updateLeaf(leaf: Leaf, partialLeaf: Partial<BaseLeaf>) {
    // update root
    let newLeaf = { ...leaf, ...partialLeaf };
    let node = Leaf.hashNode(newLeaf);
    this.root = this.computeRoot(leaf.index, node);

    Provable.asProver(() => {
      // update internal hash nodes
      let i = Number(leaf.index.toBigInt());
      this.setLeafNode(i, node.toBigInt());

      // update leaf lists
      let { sortedLeaves } = this.data.get();
      let leafValue = Leaf.toValue(newLeaf);
      sortedLeaves[leaf.sortedIndex.get()] = leafValue;
    });
  }

  /**
   * Append a new leaf based on the pointers of the previous low node
   */
  appendLeaf(low: Leaf, { key, value }: { key: Field; value: Field }) {
    // update root and length
    let index = this.length;
    let leaf = { key, value, nextKey: low.nextKey, nextIndex: low.nextIndex };
    let node = Leaf.hashNode(leaf);
    this.root = this.computeRoot(index, node);
    this.length = this.length.add(1);

    Provable.asProver(() => {
      // update internal hash nodes
      let i = Number(index.toBigInt());
      this.setLeafNode(i, node.toBigInt());

      // update leaf lists
      let iSorted = low.sortedIndex.get() + 1;
      let leafValue = Leaf.toValue({
        ...leaf,
        index,
        sortedIndex: Unconstrained.from(iSorted),
      });

      let { sortedLeaves } = this.data.get();
      sortedLeaves.splice(iSorted, 0, leafValue);
    });
  }

  /**
   * Append a new leaf based on the pointers of the previous low node
   */
  private setLeafUnconstrained(leafExists: Bool | boolean, leaf: Leaf) {
    Provable.asProver(() => {
      // update internal hash nodes
      let i = Number(leaf.index.toBigInt());
      this.setLeafNode(i, Leaf.hashNode(leaf).toBigInt());

      // update leaf lists
      let leafValue = Leaf.toValue(leaf);
      let iSorted = leaf.sortedIndex.get();
      let { sortedLeaves } = this.data.get();

      if (Bool(leafExists).toBoolean()) {
        sortedLeaves[iSorted] = leafValue;
      } else {
        sortedLeaves.splice(iSorted, 0, leafValue);
      }
    });
  }

  /**
   * Compute the root given a leaf node and its index.
   */
  computeRoot(index: Field, node: Field) {
    let indexU = Unconstrained.from(Number(index.toBigInt()));
    let indexBits = index.toBits(this.height - 1);

    for (let level = 0; level < this.height - 1; level++) {
      // in every iteration, we witness a sibling and hash it to get the parent node
      let isRight = indexBits[level];
      let sibling = Provable.witness(Field, () => {
        let i = indexU.get();
        let isLeft = !isRight.toBoolean();
        return this.getNode(level, isLeft ? i + 1 : i - 1, false);
      });
      let [right, left] = conditionalSwap(isRight, node, sibling);
      node = Poseidon.hash([left, right]);
      indexU.updateAsProver((i) => i >> 1);
    }
    // now, `node` is the root of the tree
    return node;
  }

  /**
   * Given a key, returns both the low node and the node that contains the key.
   *
   * Assumes to run outside provable code.
   */
  private findLeaf(key_: Field | bigint) {
    let key = typeof key_ === 'bigint' ? key_ : key_.toBigInt();
    assert(key >= 0n, 'key must be positive');
    let leaves = this.data.get().sortedLeaves;

    // this case is typically invalid, but we want to handle it gracefully here
    // and reject it using comparison constraints
    if (key === 0n) return { low: leaves[leaves.length - 1], self: leaves[0] };

    let { lowIndex, foundValue } = bisectUnique(
      key,
      (i) => leaves[i].key,
      leaves.length
    );
    let low = foundValue ? leaves[lowIndex - 1] : leaves[lowIndex];
    let self = foundValue ? leaves[lowIndex] : Leaf.toValue(Leaf.empty());
    return { foundValue, low, self };
  }

  // invariant: for every node that is not undefined, its descendants are either empty or not undefined
  private setLeafNode(index: number, leaf: bigint) {
    let nodes = this.data.get().nodes;

    nodes[0][index] = leaf;
    let isLeft = index % 2 === 0;

    for (let level = 1; level < this.height; level++) {
      index = Math.floor(index / 2);

      let left = this.getNode(level - 1, index * 2, isLeft);
      let right = this.getNode(level - 1, index * 2 + 1, !isLeft);
      nodes[level][index] = PoseidonBigint.hash([left, right]);

      isLeft = index % 2 === 0;
    }
  }

  private getNode(level: number, index: number, nonEmpty: boolean) {
    let nodes = this.data.get().nodes;
    let node = nodes[level]?.[index];
    if (node === undefined) {
      if (nonEmpty)
        throw Error(
          `node at level=${level}, index=${index} was expected to be known, but isn't.`
        );
      node = empty(level);
    }
    return node;
  }
}

// cache of empty nodes (=: zero leaves and nodes with only empty nodes below them)
const emptyNodes = [0n];

function empty(level: number) {
  for (let i = emptyNodes.length; i <= level; i++) {
    let zero = emptyNodes[i - 1];
    emptyNodes[i] = PoseidonBigint.hash([zero, zero]);
  }
  return emptyNodes[level];
}

// helper

/**
 * Bisect indices in an array of unique values that is sorted in ascending order.
 *
 * `getValue()` returns the value at the given index.
 *
 * We return
 * `lowIndex` := max { i in [0, length) | getValue(i) <= target }
 * `foundValue` := whether `getValue(lowIndex) == target`
 */
function bisectUnique(
  target: bigint,
  getValue: (index: number) => bigint,
  length: number
): {
  lowIndex: number;
  foundValue: boolean;
} {
  let [iLow, iHigh] = [0, length - 1];
  // handle out of bounds
  if (getValue(iLow) > target) return { lowIndex: -1, foundValue: false };
  if (getValue(iHigh) < target) return { lowIndex: iHigh, foundValue: false };

  // invariant: 0 <= iLow <= lowIndex <= iHigh < length
  // since we are either returning or reducing (iHigh - iLow), we'll eventually terminate correctly
  while (true) {
    if (iHigh === iLow) {
      return { lowIndex: iLow, foundValue: getValue(iLow) === target };
    }
    // either iLow + 1 = iHigh = iMid, or iLow < iMid < iHigh
    // in both cases, the range gets strictly smaller
    let iMid = Math.ceil((iLow + iHigh) / 2);
    if (getValue(iMid) <= target) {
      // iMid is in the candidate set, and strictly larger than iLow
      // preserves iLow <= lowIndex
      iLow = iMid;
    } else {
      // iMid is no longer in the candidate set, so we can exclude it right away
      // preserves lowIndex <= iHigh
      iHigh = iMid - 1;
    }
  }
}
