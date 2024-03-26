import { Circuit, circuitMain } from '../proof-system/circuit.js';
import { UInt64, UInt32 } from './int.js';
import { expect } from 'expect';
import { Provable } from './provable.js';

class Primitives extends Circuit {
  @circuitMain
  static main() {
    // division
    let x64 = Provable.witness(UInt64, () => UInt64.from(10));
    x64.div(2).assertEquals(UInt64.from(5));
    let x32 = Provable.witness(UInt32, () => UInt32.from(15));
    x32.div(4).assertEquals(UInt32.from(3));
  }
}

let keypair = await Primitives.generateKeypair();
let proof = await Primitives.prove([], [], keypair);
let ok = await Primitives.verify([], keypair.verificationKey(), proof);

expect(ok).toEqual(true);

console.log('primitive operations in the circuit are working! 🎉');
