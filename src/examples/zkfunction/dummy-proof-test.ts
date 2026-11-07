import { assert, Experimental, Field, Gadgets } from 'o1js';
const { ZkFunction } = Experimental;

/**
 * Test for dummy proofs functionality in ZkFunction.
 * This demonstrates how to test ZkFunction logic faster without generating real proofs.
 */
const main = ZkFunction({
  name: 'Main',
  publicInputType: Field,
  privateInputTypes: [Field],
  main: (x: Field, y: Field) => {
    Gadgets.rangeCheck64(y);
    let y3 = y.square().mul(y);
    y3.assertEquals(x);
  },
});

console.log('Testing ZkFunction with proofs enabled...');
console.time('compile with proofs...');
const { verificationKey: vkEnabled } = await main.compile({ proofsEnabled: true });
console.timeEnd('compile with proofs...');

const x = Field(8);
const y = Field(2);

console.time('prove with proofs...');
const proofEnabled = await main.prove(x, y);
console.timeEnd('prove with proofs...');

console.time('verify with proofs...');
let ok = await main.verify(proofEnabled, vkEnabled);
console.timeEnd('verify with proofs...');
assert(ok, 'proof should verify when proofs are enabled');

console.log('\nTesting ZkFunction with proofs disabled (dummy proofs)...');
console.time('compile without proofs...');
const { verificationKey: vkDisabled } = await main.compile({ proofsEnabled: false });
console.timeEnd('compile without proofs...');

console.time('prove without proofs (dummy)...');
const proofDisabled = await main.prove(x, y);
console.timeEnd('prove without proofs (dummy)...');

console.time('verify without proofs...');
ok = await main.verify(proofDisabled, vkDisabled);
console.timeEnd('verify without proofs...');
assert(ok, 'verification should always return true when proofs are disabled');

console.log('\nTesting KimchiProof.dummy() static method...');
const dummyProof = await Experimental.KimchiProof.dummy([Field(0), Field(1)]);
assert(dummyProof !== undefined, 'dummy proof should be created');
assert(
  dummyProof.publicInputFields.length === 2,
  'dummy proof should have correct public input fields'
);

console.log('\nAll tests passed! ✅');
console.log(
  'Dummy proofs allow faster testing of ZkFunction logic without waiting for proof generation.'
);
