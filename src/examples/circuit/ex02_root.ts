import { Field, Circuit, circuitMain, public_, UInt64, Gadgets } from 'o1js';

/* Exercise 2:

Public input: a field element x
Prove:
  I know a value y that is a cube root of x.
*/

class Main extends Circuit {
  @circuitMain
  static main(@public_ y: Field, x: UInt64) {
    Gadgets.rangeCheck64(x.value);
    let y3 = y.square().mul(y);
    y3.assertEquals(x.value);
  }
}

console.log('generating keypair...');
console.time('generating keypair...');
const kp = await Main.generateKeypair();
console.timeEnd('generating keypair...');

console.log('prove...');
console.time('prove...');
const x = UInt64.from(8);
const y = new Field(2);
const proof = await Main.prove([x], [y], kp);
console.timeEnd('prove...');

console.log('verify...');
console.time('verify...');
let vk = kp.verificationKey();
let ok = await Main.verify([y], vk, proof);
console.timeEnd('verify...');

console.log('ok?', ok);
