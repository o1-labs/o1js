/**
 * benchmark witness generation for an all-mul circuit
 */
import { Field, Provable, Poseidon } from 'o1js';
import { tic, toc } from '../utils/tic-toc.js';

// parameters
let nPermutations = 1 << 12; // 2^12 x 11 rows < 2^16 rows, should just fit in a circuit

// the circuit: hash a number n times
let xConst = Field.random();

function main(nMuls: number) {
  let x = Provable.witness(Field, () => xConst);
  let z = x;
  for (let i = 0; i < nMuls; i++) {
    z = Poseidon.hash([z, x]);
  }
}

tic('run and check');
await Provable.runAndCheck(() => main(nPermutations));
toc();
