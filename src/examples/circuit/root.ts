import { Field, ZkFunction, Gadgets } from 'o1js';

/**
 * Public input: a field element x
 *
 * Prove:
 *   I know a value y < 2^64 that is a cube root of x.
 */
const main = ZkFunction({
  name: 'Main',
  publicInputType: Field,
  privateInputTypes: [Field],
  main: (x: Field, y: Field) => {
    Gadgets.rangeCheck64(y);
    let y3 = y.square().mul(y);
    y3.assertEquals(x);
  },
});

console.time('generating keypair...');
const kp = await main.generateKeypair();
console.timeEnd('generating keypair...');

console.time('prove...');
const x = Field(8);
const y = Field(2);
const proof = await main.prove([y], x, kp);
console.timeEnd('prove...');

console.time('verify...');
let vk = kp.verificationKey();
let ok = await main.verify(x, vk, proof);
console.timeEnd('verify...');

console.log('ok?', ok);
