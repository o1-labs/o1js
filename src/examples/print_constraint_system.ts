import {
  Poseidon,
  Field,
  Circuit,
  circuitMain,
  public_,
  isReady,
} from 'o1js';

class Main extends Circuit {
  @circuitMain
  static main(preimage: Field, @public_ hash: Field) {
    Poseidon.hash([preimage]).assertEquals(hash);
  }
}

await isReady;

console.log('generating keypair...');
let kp = await Main.generateKeypair();

let cs = kp.constraintSystem();
console.dir(cs, { depth: Infinity });
