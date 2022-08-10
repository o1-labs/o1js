import { Field, Poseidon, isReady, shutdown } from '../../dist/server';
import { MerkleTree } from './merkle_tree';

describe('Merkle Tree', () => {
  beforeAll(async () => {
    await isReady;
  });
  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('root of empty tree of size 1', () => {
    const tree = new MerkleTree(1);
    expect(tree.getRoot().toString()).toEqual(Field(0).toString());
  });

  it('root is correct', () => {
    const tree = new MerkleTree(2);
    tree.setLeaf(0n, Field(1));
    tree.setLeaf(1n, Field(2));
    expect(tree.getRoot().toString()).toEqual(
      Poseidon.hash([Field(1), Field(2)]).toString()
    );
  });
});
