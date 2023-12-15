import {
  Poseidon,
  Field,
  Circuit,
  circuitMain,
  public_,
  isReady,
} from 'o1js';

await isReady;

/* Exercise 1:

Public input: a hash value h
Prove:
  I know a value x < 2^32 such that hash(x) = h 
*/

class Main extends Circuit {
  @circuitMain
  static main(preimage: Field, @public_ hash: Field) {
    preimage.toBits(32);
    Poseidon.hash([preimage]).assertEquals(hash);
  }
}

const kp = await Main.generateKeypair();

const preimage = Field.fromBits(Field.random().toBits().slice(0, 32));
const hash = Poseidon.hash([preimage]);
const pi = await Main.prove([preimage], [hash], kp);
console.log('proof', pi);
