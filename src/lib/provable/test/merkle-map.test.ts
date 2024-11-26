import { Field, MerkleMap } from 'o1js';

describe('Merkle Map', () => {
  it('set and get a value from a key', () => {
    const map = new MerkleMap();

    const key = Field.random();
    const value = Field.random();

    map.set(key, value);

    expect(map.get(key).equals(value).toBoolean());
  });

  it('check merkle map witness computes the correct root and key', () => {
    const map = new MerkleMap();

    const key = Field.random();
    const value = Field.random();

    map.set(key, value);

    const witness = map.getWitness(key);

    const emptyMap = new MerkleMap();

    const [emptyLeafWitnessRoot, witnessKey] = witness.computeRootAndKey(
      Field(0)
    );
    const [witnessRoot, _] = witness.computeRootAndKey(value);

    expect(
      emptyLeafWitnessRoot.equals(emptyMap.getRoot()).toBoolean() &&
        witnessKey.equals(key).toBoolean() &&
        witnessRoot.equals(map.getRoot()).toBoolean()
    );
  });
});
