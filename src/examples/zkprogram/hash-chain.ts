/**
 * This shows how to prove a preimage of an arbitrarily long chain of hashes using ZkProgram, i.e.
 * "I know x such that hash^n(x) = y".
 *
 * We implement this as a self-recursive ZkProgram, using `proveRecursivelyIf()`
 */
import { assert, Bool, Field, Poseidon, Provable, ZkProgram } from 'o1js';

const HASHES_PER_PROOF = 30;

const hashChain = ZkProgram({
  name: 'hash-chain',
  publicInput: Field,
  publicOutput: Field,

  methods: {
    chain: {
      privateInputs: [Field],

      async method(x: Field, n: Field) {
        Provable.log('hashChain (start method)', n);
        let y = x;
        let k = Field(0);
        let reachedN = Bool(false);

        for (let i = 0; i < HASHES_PER_PROOF; i++) {
          reachedN = k.equals(n);
          y = Provable.if(reachedN, y, Poseidon.hash([y]));
          k = Provable.if(reachedN, n, k.add(1));
        }

        // we have y = hash^k(x)
        // now do z = hash^(n-k)(y) = hash^n(x) by calling this method recursively
        // except if we have k = n, then ignore the output and use y
        let z: Field = await hashChain.proveRecursivelyIf.chain(
          reachedN.not(),
          y,
          n.sub(k)
        );
        z = Provable.if(reachedN, y, z);
        Provable.log('hashChain (start proving)', n);
        return { publicOutput: z };
      },
    },
  },
});

await hashChain.compile();

let n = 100;
let x = Field.random();

let { proof } = await hashChain.chain(x, Field(n));

assert(await hashChain.verify(proof), 'Proof invalid');

// check that the output is correct
let z = Array.from({ length: n }, () => 0).reduce((y) => Poseidon.hash([y]), x);
proof.publicOutput.assertEquals(z, 'Output is incorrect');

console.log('Finished hash chain proof');
