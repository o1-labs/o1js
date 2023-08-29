/**
 * benchmark a circuit filled with generic gates
 */
import { Circuit, Field, Provable, circuitMain, Experimental } from 'o1js';
import { tic, toc } from '../zkapps/tictoc.js';
let { ZkProgram } = Experimental;

// parameters
let nMuls = (1 << 16) + (1 << 15); // not quite 2^17 generic gates = not quite 2^16 rows
let withPickles = true;

// the circuit: multiply a number with itself n times
let xConst = Field.random();

function main(nMuls: number) {
  let x = Provable.witness(Field, () => xConst);
  let z = x;
  for (let i = 0; i < nMuls; i++) {
    z = z.mul(x);
  }
}

function getRows(nMuls: number) {
  let { rows } = Provable.constraintSystem(() => main(nMuls));
  return rows;
}

function simpleKimchiCircuit(nMuls: number) {
  class MulChain extends Circuit {
    @circuitMain
    static run() {
      main(nMuls);
    }
  }
  return MulChain;
}

function picklesCircuit(nMuls: number) {
  return ZkProgram({
    methods: {
      run: {
        privateInputs: [],
        method() {
          main(nMuls);
        },
      },
    },
  });
}

console.log('circuit size (without pickles overhead)', getRows(nMuls));

if (withPickles) {
  let circuit = picklesCircuit(nMuls);
  tic('compile 1 (includes srs creation)');
  await circuit.compile();
  toc();

  tic('compile 2');
  await circuit.compile();
  toc();

  tic('prove');
  let p = await circuit.run();
  toc();

  tic('verify');
  let ok = await circuit.verify(p);
  toc();
  if (!ok) throw Error('invalid proof');
} else {
  let circuit = simpleKimchiCircuit(nMuls);

  tic('compile 1 (includes srs creation)');
  let kp = await circuit.generateKeypair();
  toc();

  tic('compile 2');
  kp = await circuit.generateKeypair();
  toc();

  tic('prove');
  let p = await circuit.prove([], [], kp);
  toc();

  tic('verify');
  let ok = await circuit.verify([], kp.verificationKey(), p);
  toc();
  if (!ok) throw Error('invalid proof');
}
