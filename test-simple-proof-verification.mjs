import { Field, ZkProgram, switchBackend, Proof } from './dist/node/index.js';

console.log('Testing simple proof verification to debug array access...\n');

// Simple program with one public input
const TestProgram = ZkProgram({
  name: 'TestProgram',
  publicInput: Field,
  methods: {
    test: {
      privateInputs: [],
      async method(x) {
        x.assertEquals(Field(0));
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
    
    const { proof } = await TestProgram.test(Field(0));
    console.log('Proof created');
    
    // Try to access proof structure directly
    console.log('\nDEBUGGING PROOF STRUCTURE:');
    console.log('proof type:', typeof proof);
    console.log('proof is Proof instance:', proof instanceof Proof);
    console.log('proof constructor:', proof.constructor.name);
    
    // Try to convert to JSON to see structure
    try {
      const jsonProof = proof.toJSON();
      console.log('JSON proof type:', typeof jsonProof);
      console.log('JSON proof keys:', Object.keys(jsonProof));
      console.log('JSON proof.proof type:', typeof jsonProof.proof);
      
      if (typeof jsonProof.proof === 'string') {
        console.log('proof is base64 string, length:', jsonProof.proof.length);
      } else if (Array.isArray(jsonProof.proof)) {
        console.log('proof is array, length:', jsonProof.proof.length);
        if (jsonProof.proof.length >= 3) {
          console.log('proof[0] type:', typeof jsonProof.proof[0]);
          console.log('proof[1] type:', typeof jsonProof.proof[1]);
          console.log('proof[2] type:', typeof jsonProof.proof[2]);
        }
      }
    } catch (e) {
      console.error('Error converting to JSON:', e.message);
    }
    
    // Now try verification
    console.log('\nAttempting verification...');
    const isValid = await TestProgram.verify(proof);
    console.log('Verification result:', isValid);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack trace:');
    console.error(error.stack);
  }
}

async function main() {
  await testBackend('snarky');
  await testBackend('sparky');
}

main().catch(console.error);