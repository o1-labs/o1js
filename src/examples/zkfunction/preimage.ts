import { Poseidon, Field, Experimental } from 'o1js';
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
let ok = await main.verify(pi, verificationKey);
console.log('ok?', ok);

if (!ok) throw Error('verification failed');
