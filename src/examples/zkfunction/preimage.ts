import { Experimental, Field, Poseidon } from 'o1js';
const { ZkFunction } = Experimental;

/**
 * Public input: a hash value h
 *
 * Prove:
 *   I know a value x such that hash(x) = h
 */
const main = ZkFunction({
  name: 'Main',
  publicInputType: Field,
  privateInputTypes: [Field],
  main: (hash: Field, preimage: Field) => {
    Poseidon.hash([preimage]).assertEquals(hash);
  },
});

await main.compile();
console.log('analyze');
let res = await main.analyzeMethod();
console.log('done');
console.log(res);
