import {
  Poseidon,
  Field,
  Circuit,
  circuitMain,
  public_,
  isReady,
} from 'snarkyjs';

class Main extends Circuit {
  @circuitMain
  static main(preimage: Field, @public_ hash: Field) {
    Poseidon.hash([preimage]).assertEquals(hash);
  }
}

await isReady;

console.log('generating keypair...');
let kp = Main.generateKeypair();

let cs = Circuit.constraintSystemFromKeypair(kp);
console.dir(cs, { depth: Infinity });
