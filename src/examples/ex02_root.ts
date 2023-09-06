import { Field, Circuit, circuitMain, public_, isReady } from 'o1js';

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
console.time('generating keypair...');
const kp = await Main.generateKeypair();
console.timeEnd('generating keypair...');

console.log('prove...');
console.time('prove...');
const x = new Field(8);
const y = new Field(2);
const proof = await Main.prove([y], [x], kp);
console.timeEnd('prove...');

console.log('verify...');
console.time('verify...');
let vk = kp.verificationKey();
let ok = await Main.verify([x], vk, proof);
console.timeEnd('verify...');

console.log('ok?', ok);
