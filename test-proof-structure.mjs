import { Field, ZkProgram, switchBackend, Void } from './dist/node/index.js';

console.log('Testing proof structure...\n');

const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Void,
  publicOutput: Void,
  methods: {
    test: {
      privateInputs: [],
      async method() {
        // No constraints
      }
    }
  }
});

async function testBackend(backend) {
  console.log(`\n=== Testing ${backend} ===`);
  await switchBackend(backend);
  
  try {
    const { verificationKey } = await TestProgram.compile();
    console.log('Compiled successfully');
    
    const proof = await TestProgram.test();
    console.log('Proof created');
    console.log('Proof type:', typeof proof);
    console.log('Proof constructor:', proof.constructor.name);
    console.log('Proof keys:', Object.keys(proof));
    
    // Try to inspect the proof structure
    if (proof.proof) {
      console.log('proof.proof type:', typeof proof.proof);
      console.log('proof.proof is array:', Array.isArray(proof.proof));
      if (Array.isArray(proof.proof)) {
        console.log('proof.proof length:', proof.proof.length);
        console.log('proof.proof[0]:', proof.proof[0]);
        console.log('proof.proof[1]:', proof.proof[1]);
        console.log('proof.proof[2]:', proof.proof[2]); // This might be where it fails
      }
    }
    
    // Now try to verify
    console.log('\nAttempting verification...');
    const isValid = await TestProgram.verify(proof);
    console.log('Verification result:', isValid);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack?.split('\n')[0]);
  }
}

async function main() {
  await testBackend('snarky');
  await testBackend('sparky');
}

main().catch(console.error);