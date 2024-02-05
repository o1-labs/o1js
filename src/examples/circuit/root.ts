import { Field, Circuit, circuitMain, public_, Gadgets } from 'o1js';

/**
 * Public input: a field element x
 *
 * Prove:
 *   I know a value y < 2^64 that is a cube root of x.
 */
class Main extends Circuit {
  @circuitMain
  static main(@public_ x: Field, y: Field) {
    Gadgets.rangeCheck64(y);
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
const x = Field(8);
const y = Field(2);
const proof = await Main.prove([y], [x], kp);
console.timeEnd('prove...');

console.log('verify...');
console.time('verify...');
let vk = kp.verificationKey();
let ok = await Main.verify([x], vk, proof);
console.timeEnd('verify...');

console.log('ok?', ok);
