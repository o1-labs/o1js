import { Poseidon, Field, ZkFunction } from 'o1js';

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

console.log('generating keypair...');
const kp = await main.generateKeypair();

const preimage = Field(1);
const hash = Poseidon.hash([preimage]);

console.log('prove...');
const pi = await main.prove([preimage], hash, kp);

console.log('verify...');
let ok = await main.verify(hash, kp.verificationKey(), pi);
console.log('ok?', ok);

if (!ok) throw Error('verification failed');
