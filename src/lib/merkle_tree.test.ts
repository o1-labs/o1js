import { Field, Poseidon, isReady, shutdown } from '../../dist/server';
import { MerkleTree } from './merkle_tree';

describe('Merkle Tree', () => {
  beforeAll(async () => {
    await isReady;
  });
  afterAll(async () => {
    setTimeout(shutdown, 0);
  });
});
