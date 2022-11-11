import {
  Experimental,
  isReady,
  shutdown,
  Field,
  Bool,
  SelfProof,
  CircuitValue,
  arrayProp,
  Poseidon,
  prop,
  Circuit,
} from 'snarkyjs'

import assert from 'assert';

const bits = 255;

const printDebugs = false;

export class MerkleMap {
  tree: InstanceType<typeof Experimental.MerkleTree>;

  // ------------------------------------------------

  constructor() {
    assert(bits <= 255, 'bits must be <= 255')
    if (bits != 255) {
      console.warn('bits set to', bits + '. Should be set to 255 in production to avoid collisions');
    }
    this.tree = new Experimental.MerkleTree(bits+1);
  }

  // ------------------------------------------------

  _keyToIndex(key: Field) {
    // the bit map is reversed to make reconstructing the key during proving more convenient
    let keyBits = key.toBits().slice(0,bits).reverse().map((b) => b.toBoolean());

    var n = BigInt(0);
    for (var i = 0; i < keyBits.length; i++) {
      var b = keyBits[i] ? 1 : 0;
      n += BigInt(2)**BigInt(i) * BigInt(b);
    }

    return BigInt(n)
  }

  // ------------------------------------------------

  set(key: Field, value: Field) {
    const index = this._keyToIndex(key);
    this.tree.setLeaf(index, value);
  }

  // ------------------------------------------------

  get(key: Field) {
    const index = this._keyToIndex(key);
    return this.tree.getNode(0, index);
  }

  // ------------------------------------------------

  getRoot() {
    return this.tree.getRoot();
  }

  getWitness(key: Field) {
    const index = this._keyToIndex(key);
    const value = this.tree.getNode(0, index);
    const root = this.tree.getRoot();

    class MerkleWitness extends Experimental.MerkleWitness(bits + 1) {}

    const witness = new MerkleWitness(this.tree.getWitness(index));

    if (printDebugs) {
      // witness bits and key bits should be the reverse of each other, so
      // we can calculate the key during recursively traversing the path
      console.log('witness bits', witness.isLeft.map((l) => l.toBoolean() ? '0' : '1').join(', '));
      console.log('key bits', key.toBits().slice(0,bits).map((l) => l.toBoolean() ? '1' : '0').join(', '));
    }

    const mapWitness = new MerkleMapWitness(witness.isLeft, witness.path);

    return mapWitness;
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

  computeRootAndKey(value: Field) {
    let hash = value;

    const isLeft = this.isLefts;
    const siblings = this.siblings;

    let key = Field(0);

    for (let i = 1; i <= bits; ++i) {
      const left = Circuit.if(isLeft[i - 1], hash, siblings[i - 1]);
      const right = Circuit.if(isLeft[i - 1], siblings[i - 1], hash);
      hash = Poseidon.hash([left, right]);

      const bit = Circuit.if(isLeft[i - 1], Field(0), Field(1))

      key = key.mul(2).add(bit);
    }

    return [ hash, key ]
  }
}

// =======================================================

