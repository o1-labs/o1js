import { Field } from './field.js';
import { Option } from './option.js';
import { Struct } from './types/struct.js';

type IndexedMerkleMapBase = {
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
