import {
  Poseidon,
  Field,
  Circuit,
  circuitMain,
  public_,
} from '@o1labs/snarkyjs';

/* Exercise 0:

Public input: a hash value h
Prove:
  I know a value x such that hash(x) = h 
*/

class Main extends Circuit {
  @circuitMain
  static main(preimage: Field, @public_ hash: Field) {
    Poseidon.hash([preimage]).assertEquals(hash);
  }
}

console.log('generating keypair...');
const kp = Main.generateKeypair();

const preimage = Field.random();
const hash = Poseidon.hash([preimage]);

console.log('prove...');
const pi = Main.prove([preimage], [hash], kp);
console.log('proof', pi);

console.log('verify...');
let ok = Main.verify([hash], kp.verificationKey(), pi);
console.log('ok?', ok);
