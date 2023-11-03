import { Poseidon, Field, Circuit, circuitMain, public_ } from 'o1js';

/**
 * Public input: a hash value h
 *
 * Prove:
 *   I know a value x such that hash(x) = h
 */
class Main extends Circuit {
  @circuitMain
  static main(preimage: Field, @public_ hash: Field) {
    Poseidon.hash([preimage]).assertEquals(hash);
  }
}

console.log('generating keypair...');
const kp = await Main.generateKeypair();

const preimage = Field(1);
const hash = Poseidon.hash([preimage]);

console.log('prove...');
const pi = await Main.prove([preimage], [hash], kp);

console.log('verify...');
let ok = await Main.verify([hash], kp.verificationKey(), pi);
console.log('ok?', ok);

if (!ok) throw Error('verification failed');
