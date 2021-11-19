import { Field, Circuit, circuitMain, public_ } from '@o1labs/snarkyjs';

/* Exercise 2:

Public input: a field element x
Prove:
  I know a value y that is a cube root of x.
*/

class Main extends Circuit {
  @circuitMain
  static main(y: Field, @public_ x: Field) {
    let y3 = y.square().mul(y);
    y3.assertEquals(x);
  }
}

const kp = Main.generateKeypair();

const x = new Field(8);
const y = new Field(2);
const pi = Main.prove([y], [x], kp);
console.log('proof', pi);
