import { Poseidon as PoseidonBigint } from '../../bindings/crypto/poseidon.js';
import { Bool, Field } from './wrapped.js';
import { Option } from './option.js';
import { Struct } from './types/struct.js';
import { InferValue } from 'src/bindings/lib/provable-generic.js';
import { assert } from './gadgets/common.js';
import { Unconstrained } from './types/unconstrained.js';
import { Provable } from './provable.js';
import { Poseidon } from './crypto/poseidon.js';
import { maybeSwap } from './merkle-tree.js';

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
  remove(key: Field): void;
};

class Leaf extends Struct({
  key: Field,
  value: Field,
  nextKey: Field,
  nextIndex: Field,

  index: Unconstrained.provableWithEmpty(0),
}) {}
type LeafValue = InferValue<typeof Leaf>;

class IndexedMerkleMap implements IndexedMerkleMapBase {
  // data defining the provable interface of a tree
  root: Field;
  length: Field; // length of the leaves array
  readonly height: number;

  // the raw data stored in the tree, plus helper structures
  readonly data: Unconstrained<{
    // leaves sorted by index
    readonly leaves: LeafValue[];

    // leaves sorted by key, with a circular linked list encoded by nextKey
    // we always have sortedLeaves[n-1].nextKey = 0 = sortedLeaves[0].key
    // for i=0,...n-2, sortedLeaves[i].nextKey = sortedLeaves[i+1].key
    readonly sortedLeaves: LeafValue[];

    // for every level, an array of hashes
    readonly nodes: (bigint | undefined)[][];
  }>;

  /**
   * Creates a new, empty Indexed Merkle Map, given its height.
   */
  constructor(height: number) {
    this.root = Field(empty(height - 1));

    let nodes: (bigint | undefined)[][] = Array(height);
    for (let level = 0; level < height; level++) {
      nodes[level] = [];
    }

    this.length = Field(0);
    let leaves: LeafValue[] = [];
    let sortedLeaves: LeafValue[] = [];
    this.data = Unconstrained.from({ leaves, sortedLeaves, nodes });
  }

  insert(key: Field, value: Field) {
    let lowNode = Provable.witness(Leaf, () => this.findNode(key).lowNode);

    // prove that the key doesn't exist yet and we have a valid low node
    lowNode.key.assertLessThan(key);
    key.assertLessThan(lowNode.nextKey);
    // TODO

    let newIndex = this.length;
  }

  update(key: Field, value: Field) {
    assert(false, 'not implemented');
  }

  set(key: Field, value: Field) {
    assert(false, 'not implemented');
  }

  get(key: Field): Option<Field> {
    assert(false, 'not implemented');
  }

  remove(key: Field) {
    assert(false, 'not implemented');
  }

  // helper methods

  proveInclusion(leaf: Leaf, message?: string) {
    let node = Poseidon.hashPacked(Leaf, leaf);
    let index = Unconstrained.witness(() => leaf.index.get());

    for (let level = 1; level < this.height; level++) {
      // in every iteration, we witness a sibling and hash it to get the parent node
      let isLeft = Provable.witness(Bool, () => index.get() % 2 === 0);
      let sibling = Provable.witness(Field, () => {
        let i = index.get();
        let isLeft = i % 2 === 0;
        return this.getNode(level - 1, isLeft ? i + 1 : i - 1, false);
      });
      let [left, right] = maybeSwap(isLeft, node, sibling);
      node = Poseidon.hash([left, right]);
      index.updateAsProver((i) => i >> 1);
    }

    // now, `node` is the root of the tree, and we can check it against the actual root
    node.assertEquals(this.root, message ?? 'Leaf is not included in the tree');
  }

  private findNode(key_: Field | bigint) {
    let key = typeof key_ === 'bigint' ? key_ : key_.toBigInt();
    assert(key >= 0n, 'key must be positive');
    let leaves = this.data.get().sortedLeaves;

    // this case is typically invalid, but we want to handle it gracefully here
    // and reject it using comparison constraints
    if (key === 0n)
      return { lowNode: leaves[leaves.length - 1], thisNode: leaves[0] };

    let { lowIndex, foundValue } = bisectUnique(
      key,
      (i) => leaves[i].key,
      leaves.length
    );
    let lowNode = foundValue ? leaves[lowIndex - 1] : leaves[lowIndex];
    let thisNode = foundValue ? leaves[lowIndex] : undefined;
    return { lowNode, thisNode };
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
