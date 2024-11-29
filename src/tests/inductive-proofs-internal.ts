import { Field, ZkProgram, assert, Provable, Proof } from 'o1js';
import { tic, toc } from '../examples/utils/tic-toc.js';

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
      privateInputs: [Field],

      async method(x: Field) {
        pushLog('baseCase');
        x = x.add(7);
        return { publicOutput: x };
      },
    },

    mergeOne: {
      privateInputs: [],

      async method() {
        pushLog('mergeOne');
        let z = Provable.witness(Field, () => 0);
        let x: Field = await MaxProofsVerifiedTwo.proveRecursively.baseCase(z);
        return { publicOutput: x.add(1) };
      },
    },

    mergeTwo: {
      privateInputs: [],

      async method() {
        pushLog('mergeTwo');
        let z = Provable.witness(Field, () => 0);
        let x: Field = await MaxProofsVerifiedTwo.proveRecursively.baseCase(z);
        let y: Field = await MaxProofsVerifiedTwo.proveRecursively.mergeOne();
        return { publicOutput: x.add(y) };
      },
    },
  },
});

let Wrapper = ZkProgram({
  name: 'wraps-recursive-2',

  methods: {
    wrap: {
      privateInputs: [MaxProofsVerifiedTwo.Proof],

      async method(proof: Proof<undefined, Field>) {
        proof.verify();
        let x = proof.publicOutput;
        x.assertLessThan(30);
      },
    },
  },
});

tic('compiling');
await MaxProofsVerifiedTwo.compile();
await Wrapper.compile();
toc();

tic('executing 4 proofs');
let { proof } = await MaxProofsVerifiedTwo.mergeTwo();
toc();

assert(await MaxProofsVerifiedTwo.verify(proof), 'Proof is not valid');

proof.publicOutput.assertEquals(15);

assert(log.length === 4, 'log.length === 4');
assert(log[0] === 'mergeTwo', 'log[0] === "mergeTwo"');
assert(log[1] === 'baseCase', 'log[1] === "baseCase"');
assert(log[2] === 'mergeOne', 'log[2] === "mergeOne"');
assert(log[3] === 'baseCase', 'log[3] === "baseCase"');

tic('execute wrapper proof');
let { proof: wrapperProof } = await Wrapper.wrap(proof);
toc();
assert(await Wrapper.verify(wrapperProof), 'Wrapper proof is not valid');
