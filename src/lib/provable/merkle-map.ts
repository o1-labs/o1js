import { arrayProp, CircuitValue } from './types/circuit-value.js';
import { Field, Bool } from './wrapped.js';
import { Poseidon } from './crypto/poseidon.js';
import { MerkleTree, MerkleWitness } from './merkle-tree.js';
import { Provable } from './provable.js';
import { BinableFp } from '../../mina-signer/src/field-bigint.js';

export { MerkleMap, MerkleMapWitness };

class MerkleMap {
  tree: MerkleTree;

  /**
   * Creates a new, empty Merkle Map.
   * @returns A new MerkleMap
   * @example
   * ```ts
   * const merkleMap = new MerkleMap();
   * ```
   */
  constructor() {
    this.tree = new MerkleTree(256);
  }

  _keyToIndex(key: Field) {
    // the bit map is reversed to make reconstructing the key during proving more convenient
    let bits = BinableFp.toBits(key.toBigInt()).reverse();

    // Make sure that the key fits in 254 bits, in order to avoid collisions since the Pasta field modulus is smaller than 2^255
    if (bits[0]) {
      throw Error(
        'Key must be less than 2^254, to avoid collisions in the field modulus. Please use a smaller key.'
      );
    }

    let n = 0n;
    for (let i = bits.length - 1; i >= 0; i--) {
      n = (n << 1n) | BigInt(bits[i]);
    }

    return n;
  }

  /**
   * Sets a key of the merkle map to a given value.
   * @param key The key to set in the map.
   * @param value The value to set.
   * @example
   * ```ts
   * const key = Field(5);
   * const value = Field(10);
   * merkleMap.set(key, value);
   * ```
   */
  set(key: Field, value: Field) {
    const index = this._keyToIndex(key);
    this.tree.setLeaf(index, value);
  }

  /**
   * Returns a value given a key. Values are by default Field(0).
   * @param key The key to get the value from.
   * @returns The value stored at the key.
   * @example
   * ```ts
   * const key = Field(5);
   * const value = merkleMap.get(key);
   * console.log(value); // Output: the value at key 5 or Field(0) if key does not exist
   * ```
   */
  get(key: Field) {
    const index = this._keyToIndex(key);
    return this.tree.getNode(0, index);
  }

  /**
   * Returns the root of the Merkle Map.
   * @returns The root of the Merkle Map.
   * @example
   * ```ts
   * const root = merkleMap.getRoot();
   * ```
   */
  getRoot() {
    return this.tree.getRoot();
  }

  /**
   * Returns a circuit-compatible witness (also known as [Merkle Proof or Merkle Witness](https://computersciencewiki.org/index.php/Merkle_proof)) for the given key.
   * @param key The key to make a witness for.
   * @returns A MerkleMapWitness, which can be used to assert changes to the MerkleMap, and the witness's key.
   * @example
   * ```ts
   * const key = Field(5);
   * const witness = merkleMap.getWitness(key);
   * ```
   */
  getWitness(key: Field) {
    const index = this._keyToIndex(key);
    class MyMerkleWitness extends MerkleWitness(256) {}
    const witness = new MyMerkleWitness(this.tree.getWitness(index));
    return new MerkleMapWitness(witness.isLeft, witness.path);
  }
}

class MerkleMapWitness extends CircuitValue {
  @arrayProp(Bool, 255) isLefts: Bool[];
  @arrayProp(Field, 255) siblings: Field[];

  constructor(isLefts: Bool[], siblings: Field[]) {
    super();
    this.isLefts = isLefts;
    this.siblings = siblings;
  }

  /**
   * Computes the merkle tree root for a given value and the key for this witness
   * @param value The value to compute the root for.
   * @returns A tuple of the computed merkle root, and the key that is connected to the path updated by this witness.
   */
  computeRootAndKey(value: Field) {
    // Check that the computed key is less than 2^254, in order to avoid collisions since the Pasta field modulus is smaller than 2^255
    this.isLefts[0].assertTrue();

    let hash = value;

    const isLeft = this.isLefts;
    const siblings = this.siblings;

    let key = Field(0);

    for (let i = 0; i < 255; i++) {
      const left = Provable.if(isLeft[i], hash, siblings[i]);
      const right = Provable.if(isLeft[i], siblings[i], hash);
      hash = Poseidon.hash([left, right]);

      const bit = Provable.if(isLeft[i], Field(0), Field(1));

      key = key.mul(2).add(bit);
    }

    return [hash, key];
  }
}
