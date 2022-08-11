import { Circuit, CircuitValue, arrayProp } from './circuit_value';
import { Poseidon } from './hash';
import { Bool, Field } from './core';

// external API
export { Witness, MerkleTree, MerkleWitness };

type Witness = { isLeft: boolean; sibling: Field }[];

/**
 * Levels are indexed from leafs (level 0) to root (level N - 1).
 */
class MerkleTree {
  private nodes: Record<number, Record<string, Field>> = {};
  private zeroes: Field[];

  constructor(public readonly height: number) {
    this.zeroes = [Field(0)];
    for (let i = 1; i < height; i++) {
      this.zeroes.push(Poseidon.hash([this.zeroes[i - 1], this.zeroes[i - 1]]));
    }
  }

  getNode(level: number, index: bigint): Field {
    return this.nodes[level]?.[index.toString()] ?? this.zeroes[level];
  }

  getRoot(): Field {
    return this.getNode(this.height - 1, 0n);
  }

  // TODO: this allows to set a node at an index larger than the size. OK?
  private setNode(level: number, index: bigint, value: Field) {
    (this.nodes[level] ??= {})[index.toString()] = value;
  }

  // TODO: if this is passed an index bigger than the max, it will set a couple of out-of-bounds nodes but not affect the real Merkle root. OK?
  setLeaf(index: bigint, leaf: Field) {
    this.setNode(0, index, leaf);
    let currIndex = index;
    for (let level = 1; level < this.height; level++) {
      currIndex /= 2n;

      const left = this.getNode(level - 1, currIndex * 2n);
      const right = this.getNode(level - 1, currIndex * 2n + 1n);

      this.setNode(level, currIndex, Poseidon.hash([left, right]));
    }
  }

  getWitness(index: bigint): Witness {
    const witness = [];
    for (let level = 0; level < this.height - 1; level++) {
      const isLeft = index % 2n === 0n;
      const sibling = this.getNode(level, isLeft ? index + 1n : index - 1n);
      witness.push({ isLeft, sibling });
      index /= 2n;
    }
    return witness;
  }

  // TODO: this will always return true if the merkle tree was constructed normally; seems to be only useful for testing. remove?
  validate(index: bigint): boolean {
    const path = this.getWitness(index);
    let hash = this.getNode(0, index);
    for (const node of path) {
      hash = Poseidon.hash(
        node.isLeft ? [hash, node.sibling] : [node.sibling, hash]
      );
    }

    return hash.toString() === this.getRoot().toString();
  }

  // TODO: should this take an optional offset? should it fail if the array is too long?
  fill(leaves: Field[]) {
    leaves.forEach((value, index) => {
      this.setLeaf(BigInt(index), value);
    });
  }
}

class MerkleWitness extends CircuitValue {
  @arrayProp(Field, 255) path: Field[];
  @arrayProp(Bool, 255) isLeft: Bool[];

  constructor(witness: Witness) {
    super();
    this.path = witness.map((item) => item.sibling);
    this.isLeft = witness.map((item) => Bool(item.isLeft));
  }

  calculateRoot(leaf: Field): Field {
    let hash = leaf;

    for (let i = 1; i < 256; ++i) {
      const left = Circuit.if(this.isLeft[i - 1], hash, this.path[i - 1]);
      const right = Circuit.if(this.isLeft[i - 1], this.path[i - 1], hash);
      hash = Poseidon.hash([left, right]);
    }

    return hash;
  }

  calculateIndex(): Field {
    let powerOfTwo = Field(1);
    let index = Field(0);

    for (let i = 1; i < 256; ++i) {
      index = Circuit.if(this.isLeft[i - 1], index, index.add(powerOfTwo));
      powerOfTwo = powerOfTwo.mul(2);
    }

    return index;
  }
}
