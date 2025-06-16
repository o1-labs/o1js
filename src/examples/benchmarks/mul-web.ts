/**
 * benchmark a circuit filled with generic gates
 */
import { Field, Provable, Undefined, ZkFunction, ZkProgram } from 'o1js';
import { tic, toc } from '../utils/tic-toc.js';

// parameters
let nMuls = (1 << 16) + (1 << 15); // not quite 2^17 generic gates = not quite 2^16 rows
// let nMuls = 1 << 5;
let withPickles = false;
// the circuit: multiply a number with itself n times
let xConst = Field.random();

function main(nMuls: number) {
  let x = Provable.witness(Field, () => xConst);
  let z = x;
  for (let i = 0; i < nMuls; i++) {
    z = z.mul(x);
  }
}

async function getRows(nMuls: number) {
  let { rows } = await Provable.constraintSystem(() => main(nMuls));
  return rows;
}

function simpleKimchiCircuit(nMuls: number) {
  return ZkFunction({
    name: 'mul-chain',
    publicInputType: Undefined,
    privateInputTypes: [],
    main: () => {
      main(nMuls);
    },
  });
}

function picklesCircuit(nMuls: number) {
  return ZkProgram({
    name: 'mul-chain',
    methods: {
      run: {
        privateInputs: [],
        async method() {
          main(nMuls);
        },
      },
    },
  });
}

// the script

console.log('circuit size (without pickles overhead)', await getRows(nMuls));

if (withPickles) {
  let circuit = picklesCircuit(nMuls);
  tic('compile 1 (includes srs creation)');
  await circuit.compile();
  toc();

  tic('compile 2');
  await circuit.compile();
  toc();

  tic('prove');
  let { proof: p } = await circuit.run();
  toc();

  tic('verify');
  let ok = await circuit.verify(p);
  toc();
  if (!ok) throw Error('invalid proof');
} else {
  let circuit = simpleKimchiCircuit(nMuls);

  tic('compile 1 (includes srs creation)');
  let vKey = await circuit.compile();
  toc();

  tic('compile 2');
  vKey = await circuit.compile();
  toc();

  tic('prove');
  let p = await circuit.prove(Undefined.empty());
  toc();

  tic('verify');
  let ok = await circuit.verify(Undefined.empty(), p, vKey);
  toc();
  if (!ok) throw Error('invalid proof');
}
