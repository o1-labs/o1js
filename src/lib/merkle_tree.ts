import { Poseidon } from './hash';
import { Field } from './core'

export type Witness = {
  isLeft: boolean;
  sibling: Field;
}

export class MerkleTree {
  private nodes: Record<number, Record<string, Field>> = {};
  private zeroes: Field[];

  constructor(public readonly height: number) {
    this.zeroes = [Field(0)];
    for (let i = 1; i < height; i++) {
      this.zeroes.push(Poseidon.hash([this.zeroes[i - 1], this.zeroes[i - 1]]));
    }
  }

}
