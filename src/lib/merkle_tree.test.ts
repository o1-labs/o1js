import {
  isReady,
  shutdown,
  Poseidon,
  Field,
  Experimental,
} from '../../dist/server';

describe('Merkle Tree', () => {
  beforeAll(async () => {
    await isReady;
  });
  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('root of empty tree of size 1', () => {
    const tree = new Experimental.MerkleTree(1);
    expect(tree.getRoot().toString()).toEqual(Field(0).toString());
  });

  it('root is correct', () => {
    const tree = new Experimental.MerkleTree(2);
    tree.setLeaf(0n, Field(1));
    tree.setLeaf(1n, Field(2));
    expect(tree.getRoot().toString()).toEqual(
      Poseidon.hash([Field(1), Field(2)]).toString()
    );
  });

  it('builds correct tree', () => {
    const tree = new Experimental.MerkleTree(4);
    tree.setLeaf(0n, Field(1));
    tree.setLeaf(1n, Field(2));
    tree.setLeaf(2n, Field(3));
    expect(tree.validate(0n)).toBe(true);
    expect(tree.validate(1n)).toBe(true);
    expect(tree.validate(2n)).toBe(true);
    expect(tree.validate(3n)).toBe(true);
  });

  it('tree of height 128', () => {
    const tree = new Experimental.MerkleTree(128);

    const index = 2n ** 64n;
    expect(tree.validate(index)).toBe(true);

    tree.setLeaf(index, Field(1));
    expect(tree.validate(index)).toBe(true);
  });

  it('tree of height 256', () => {
    const tree = new Experimental.MerkleTree(256);

    const index = 2n ** 128n;
    expect(tree.validate(index)).toBe(true);

    tree.setLeaf(index, Field(1));
    expect(tree.validate(index)).toBe(true);
  });
});
