import { Poseidon } from './hash';
import { Field } from './core'

export type Witness = {
  isLeft: boolean;
  sibling: Field;
}

export class MerkleTree {
  private nodes: Record<number, Record<string, Field>> = {};
  
  private zeroes: Field[];


}
