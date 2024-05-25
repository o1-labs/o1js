import { Poseidon as PoseidonBigint } from '../../bindings/crypto/poseidon.js';
import { Field } from './wrapped.js';
import { Option } from './option.js';
import { Struct } from './types/struct.js';
import { InferValue } from 'src/bindings/lib/provable-generic.js';
import { assert } from './gadgets/common.js';

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
}) {}

class IndexedMerkleMap implements IndexedMerkleMapBase {
  // data defining the provable interface of a tree
  root: Field;
  readonly height: number;

  // the raw data stored in the tree
  readonly leaves: InferValue<typeof Leaf>[] = [];

  // helpers structures
  length: number; // length of the leaves array
  readonly nodes: Field[][] = []; // for every level, an array of hashes

  /**
   * Creates a new, empty Indexed Merkle Map, given its height.
   */
  constructor(height: number) {
    this.root = Field(zero(height - 1));
  }

  insert(key: Field, value: Field) {
    assert(false, 'not implemented');
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
}

// cache of zero hashes
const zeroes = [0n];
function zero(level: number) {
  for (let i = zeroes.length; i <= level; i++) {
    let zero = zeroes[i - 1];
    zeroes[i] = PoseidonBigint.hash([zero, zero]);
  }
  return zeroes[level];
}
