import { Circuit, circuitMain } from './circuit_value.js';
import { isReady, shutdown } from '../snarky.js';
import { UInt64, UInt32 } from './int.js';
import { expect } from 'expect';

class Primitives extends Circuit {
  @circuitMain
  static main() {
    // division
    let x64 = Circuit.witness(UInt64, () => UInt64.from(10));
    x64.div(2).assertEquals(UInt64.from(5));
    let x32 = Circuit.witness(UInt32, () => UInt32.from(15));
    x32.div(4).assertEquals(UInt32.from(3));
  }
}

await isReady;
let keypair = Primitives.generateKeypair();
let proof = Primitives.prove([], [], keypair);
let ok = Primitives.verify([], keypair.verificationKey(), proof);
expect(ok).toEqual(true);
console.log('primitive operations in the circuit are working! 🎉');
shutdown();
