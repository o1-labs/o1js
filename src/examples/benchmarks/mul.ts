/**
 * benchmark a circuit filled with generic gates
 */
import { Experimental, Field, Provable, ZkProgram } from 'o1js';
import { tic, toc } from '../utils/tic-toc.node.js';

const { ZkFunction } = Experimental;

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

async function getRows(nMuls: number) {
  let { rows } = await Provable.constraintSystem(() => main(nMuls));
  return rows;
}

function simpleKimchiCircuit(nMuls: number) {
  return ZkFunction({
    name: 'mul-chain',
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
  let { verificationKey } = await circuit.compile();
  toc();

  tic('compile 2');
  ({ verificationKey } = await circuit.compile());
  toc();

  tic('prove');
  let p = await circuit.prove();
  toc();

  tic('verify');
  let ok = await circuit.verify(p, verificationKey);
  toc();
  if (!ok) throw Error('invalid proof');
}
