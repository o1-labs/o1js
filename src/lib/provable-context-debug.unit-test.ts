import { Field } from './core.js';
import { Gadgets } from './gadgets/gadgets.js';
import { runCircuit } from './provable-context-debug.js';
import { Provable } from './provable.js';

let cs = runCircuit(
  () => {
    let x = Provable.witness(Field, () => Field(5));
    let y = x.mul(x);
    Gadgets.rangeCheck16(y);
    Gadgets.rangeCheck64(y);
  },
  { withWitness: false }
);

console.log(cs);
