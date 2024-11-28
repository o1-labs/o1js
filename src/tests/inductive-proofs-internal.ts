import { Field, ZkProgram, assert, Provable } from 'o1js';
import { tic, toc } from '../examples/utils/tic-toc.js';
import { expect } from 'expect';

let log: string[] = [];

function pushLog(s: string) {
  Provable.asProver(() => {
    console.log(s);
    log.push(s);
  });
}

let MaxProofsVerifiedTwo = ZkProgram({
  name: 'recursive-2',
  publicOutput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      async method() {
        pushLog('baseCase');
        return { publicOutput: Field(7) };
      },
    },

    mergeOne: {
      privateInputs: [],

      async method() {
        pushLog('mergeOne');
        let x: Field = await MaxProofsVerifiedTwo.proveRecursively.baseCase();
        return { publicOutput: x.add(1) };
      },
    },

    mergeTwo: {
      privateInputs: [],

      async method() {
        pushLog('mergeTwo');
        let x: Field = await MaxProofsVerifiedTwo.proveRecursively.baseCase();
        let y: Field = await MaxProofsVerifiedTwo.proveRecursively.mergeOne();
        return { publicOutput: x.add(y) };
      },
    },
  },
});
tic('compiling');
await MaxProofsVerifiedTwo.compile();
toc();

tic('executing 4 proofs');
let { proof } = await MaxProofsVerifiedTwo.mergeTwo();
toc();

assert(await MaxProofsVerifiedTwo.verify(proof), 'Proof is not valid');

proof.publicOutput.assertEquals(15);

expect(log).toEqual(['mergeTwo', 'baseCase', 'mergeOne', 'baseCase']);
