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

console.log('compile...');
const { verificationKey } = await main.compile();

const preimage = Field(1);
const hash = Poseidon.hash([preimage]);

console.log('prove...');
const pi = await main.prove(hash, preimage);

console.log('verify...');
let isValid = await main.verify(pi, verificationKey);
console.log('isValid?', isValid);

if (!isValid) throw Error('verification failed!');
