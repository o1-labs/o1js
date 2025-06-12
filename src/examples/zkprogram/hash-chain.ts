/**
 * This shows how to prove an arbitrarily long chain of hashes using ZkProgram, i.e.
 * `hash^n(x) = y`.
 *
 * We implement this as a self-recursive ZkProgram, using `proveRecursivelyIf()`
 */
import {
  assert,
  Bool,
  Bytes,
  Cache,
  Experimental,
  FeatureFlags,
  Field,
  Gadgets,
  Poseidon,
  Provable,
  Struct,
  ZkProgram,
} from 'o1js';

class Bytes32 extends Bytes(32) {}

const hashChain = ZkProgram({
  name: 'hash-chain',
  publicOutput: Field,
  publicInput: Field,
  methods: {
    chain: {
      privateInputs: [],
      async method(b: Field) {
        /*       let a = Provable.witness(Bytes32, () => Bytes32.fromString('0x1234'));
        let res = Gadgets.SHA2.hash(256, a); */

        Gadgets.rangeCheck64(b);

        let res2: Field = await hashChainRecursive.chain.if(Bool(false), b);
        res2.assertGreaterThanOrEqual(0);
        return {
          publicOutput: b,
        };
      },
    },
  },
});
let hashChainRecursive = Experimental.Recursive(hashChain);

console.log((await hashChain.analyzeMethods()).chain.summary());
console.time('compile');
await hashChain.compile();
console.timeEnd('compile');
let { proof } = await hashChain.chain(Field(1));
