import {
  Field,
  Circuit,
  circuitMain,
  public_,
  isReady,
} from '@o1labs/snarkyjs';

await isReady;

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

console.log('generating keypair...');
const kp = Main.generateKeypair();

const x = new Field(8);
const y = new Field(2);
console.log('prove...');
const pi = Main.prove([y], [x], kp);
// console.log('proof', pi);

console.log('verify...');
// let ok = Main.verify([x], kp.verificationKey(), pi);
let vk = kp.verificationKey();
console.log('verification key');
console.dir((vk as any).value);
let ok = vk.verify([x], pi);
console.log('ok?', ok);
