import { Poseidon, Field, Circuit } from '../snarky';
import { circuitMain, public_ } from '../lib/circuit_value';

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
export default () => {
  console.log('Executing... Main.generateKeypair()');
  const kp = Main.generateKeypair();

  console.log('Executing... Field.random()');
  const preimage = Field.random();
  console.log('Executing... Poseidon.hash()');
  const hash = Poseidon.hash([preimage]);
  console.log('Executing... Main.prove()');
  const pi = Main.prove([preimage], [hash], kp);
  console.log('proof', pi);
};
