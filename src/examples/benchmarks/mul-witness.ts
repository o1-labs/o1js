/**
 * benchmark witness generation for an all-mul circuit
 */
import { Field, Provable } from 'o1js';
import { tic, toc } from '../utils/tic-toc.js';

// parameters
let nMuls = (1 << 16) + (1 << 15); // not quite 2^17 generic gates = not quite 2^16 rows

// the circuit: multiply a number with itself n times
let xConst = Field.random();

function main(nMuls: number) {
  let x = Provable.witness(Field, () => xConst);
  let z = x;
  for (let i = 0; i < nMuls; i++) {
    z = z.mul(x);
  }
}

tic('run and check');
await Provable.runAndCheck(() => main(nMuls));
toc();
