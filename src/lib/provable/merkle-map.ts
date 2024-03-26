import { arrayProp, CircuitValue } from './types/circuit-value.js';
import { Field, Bool } from './core.js';
import { Poseidon } from './crypto/poseidon.js';
import { MerkleTree, MerkleWitness } from './merkle-tree.js';
import { Provable } from './provable.js';

const bits = 255;
const printDebugs = false;

export class MerkleMap {
  tree: InstanceType<typeof MerkleTree>;

  // ------------------------------------------------

  /**
   * Creates a new, empty Merkle Map.
   * @returns A new MerkleMap
   */
  constructor() {
    if (bits > 255) {
      throw Error('bits must be <= 255');
    }
    if (bits !== 255) {
      console.warn(
        'bits set to',
        bits + '. Should be set to 255 in production to avoid collisions'
      );
    }
    this.tree = new MerkleTree(bits + 1);
  }

  // ------------------------------------------------

  _keyToIndex(key: Field) {
    // the bit map is reversed to make reconstructing the key during proving more convenient
    let keyBits = key
      .toBits()
      .slice(0, bits)
      .reverse()
      .map((b) => b.toBoolean());

    let n = 0n;
    for (let i = 0; i < keyBits.length; i++) {
      const b = keyBits[i] ? 1 : 0;
      n += 2n ** BigInt(i) * BigInt(b);
    }

    return n;
  }

  // ------------------------------------------------

  /**
   * Sets a key of the merkle map to a given value.
   * @param key The key to set in the map.
   * @param value The value to set.
   */
  set(key: Field, value: Field) {
    const index = this._keyToIndex(key);
    this.tree.setLeaf(index, value);
  }

  // ------------------------------------------------

  /**
   * Returns a value given a key. Values are by default Field(0).
   * @param key The key to get the value from.
   * @returns The value stored at the key.
   */
  get(key: Field) {
    const index = this._keyToIndex(key);
    return this.tree.getNode(0, index);
  }

  // ------------------------------------------------

  /**
   * Returns the root of the Merkle Map.
   * @returns The root of the Merkle Map.
   */
  getRoot() {
    return this.tree.getRoot();
  }

  /**
   * Returns a circuit-compatible witness (also known as [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof)) for the given key.
   * @param key The key to make a witness for.
   * @returns A MerkleMapWitness, which can be used to assert changes to the MerkleMap, and the witness's key.
   */
  getWitness(key: Field) {
    const index = this._keyToIndex(key);
    class MyMerkleWitness extends MerkleWitness(bits + 1) {}
    const witness = new MyMerkleWitness(this.tree.getWitness(index));

    if (printDebugs) {
      // witness bits and key bits should be the reverse of each other, so
      // we can calculate the key during recursively traversing the path
      console.log(
        'witness bits',
        witness.isLeft.map((l) => (l.toBoolean() ? '0' : '1')).join(', ')
      );
      console.log(
        'key bits',
        key
          .toBits()
          .slice(0, bits)
          .map((l) => (l.toBoolean() ? '1' : '0'))
          .join(', ')
      );
    }
    return new MerkleMapWitness(witness.isLeft, witness.path);
  }
}

// =======================================================

export class MerkleMapWitness extends CircuitValue {
  @arrayProp(Bool, bits) isLefts: Bool[];
  @arrayProp(Field, bits) siblings: Field[];

  constructor(isLefts: Bool[], siblings: Field[]) {
    super();
    this.isLefts = isLefts;
    this.siblings = siblings;
  }

  /**
   * computes the merkle tree root for a given value and the key for this witness
   * @param value The value to compute the root for.
   * @returns A tuple of the computed merkle root, and the key that is connected to the path updated by this witness.
   */
  computeRootAndKey(value: Field) {
    let hash = value;

    const isLeft = this.isLefts;
    const siblings = this.siblings;

    let key = Field(0);

    for (let i = 0; i < bits; i++) {
      const left = Provable.if(isLeft[i], hash, siblings[i]);
      const right = Provable.if(isLeft[i], siblings[i], hash);
      hash = Poseidon.hash([left, right]);

      const bit = Provable.if(isLeft[i], Field(0), Field(1));

      key = key.mul(2).add(bit);
    }

    return [hash, key];
  }
}
