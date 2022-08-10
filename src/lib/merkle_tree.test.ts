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
});
