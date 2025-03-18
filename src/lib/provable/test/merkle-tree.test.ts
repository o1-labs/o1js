import { Poseidon, Field, MerkleTree, MerkleWitness } from 'o1js';

describe('Merkle Tree', () => {
  it('root of empty tree of size 1', () => {
    const tree = new MerkleTree(1);
    expect(tree.getRoot().toString()).toEqual(Field(0).toString());
  });

  it('root is correct', () => {
    const tree = new MerkleTree(2);
    tree.setLeaf(0n, Field(1));
    tree.setLeaf(1n, Field(2));
    expect(tree.getRoot().toString()).toEqual(Poseidon.hash([Field(1), Field(2)]).toString());
  });

  it('builds correct tree', () => {
    const tree = new MerkleTree(4);
    tree.setLeaf(0n, Field(1));
    tree.setLeaf(1n, Field(2));
    tree.setLeaf(2n, Field(3));
    expect(tree.validate(0n)).toBe(true);
    expect(tree.validate(1n)).toBe(true);
    expect(tree.validate(2n)).toBe(true);
    expect(tree.validate(3n)).toBe(true);
  });

  it('tree of height 128', () => {
    const tree = new MerkleTree(128);

    const index = 2n ** 64n;
    expect(tree.validate(index)).toBe(true);

    tree.setLeaf(index, Field(1));
    expect(tree.validate(index)).toBe(true);
  });

  it('tree of height 256', () => {
    const tree = new MerkleTree(256);

    const index = 2n ** 128n;
    expect(tree.validate(index)).toBe(true);

    tree.setLeaf(index, Field(1));
    expect(tree.validate(index)).toBe(true);
  });

  it('works with MerkleWitness', () => {
    // tree with height 3 (4 leaves)
    const HEIGHT = 3;
    let tree = new MerkleTree(HEIGHT);
    class MyMerkleWitness extends MerkleWitness(HEIGHT) {}

    // tree with the leaves [15, 16, 17, 18]
    tree.fill([15, 16, 17, 18].map(Field));

    // witness for the leaf '17', at index 2
    let witness = new MyMerkleWitness(tree.getWitness(2n));

    // calculate index
    expect(witness.calculateIndex().toString()).toEqual('2');

    // calculate root
    let root = witness.calculateRoot(Field(17));
    expect(tree.getRoot()).toEqual(root);

    root = witness.calculateRoot(Field(16));
    expect(tree.getRoot()).not.toEqual(root);

    // construct and check path manually
    let leftHalfHash = Poseidon.hash([Field(15), Field(16)]).toString();
    let expectedWitness = {
      path: ['18', leftHalfHash],
      isLeft: [true, false],
    };
    expect(witness.toJSON()).toEqual(expectedWitness);
  });
});
