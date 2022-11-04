import {
  Poseidon,
  Field,
  Circuit,
  circuitMain,
  public_,
  isReady,
  Ledger,
} from 'snarkyjs';

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

await isReady;

// console.log('generating keypair...');
const kp = Main.generateKeypair();

// console.dir((kp as any).value, { depth: 4 });

console.log(Ledger.keypairToJson((kp as any).value));
