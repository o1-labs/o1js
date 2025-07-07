import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Simple arithmetic program that was working earlier
const ArithmeticProgram = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    add: {
      privateInputs: [Field],
      async method(publicInput, privateInput) {
        return publicInput.add(privateInput);
      }
    }
  }
});

async function testBackend(backend) {
  console.log(`\n📊 Testing ${backend} backend...`);
  await switchBackend(backend);
  
  try {
    console.log('Starting compilation...');
    const result = await ArithmeticProgram.compile();
    console.log(`${backend} compilation succeeded`);
    console.log(`VK Hash: ${result.verificationKey.hash.toString()}`);
    
    // Create and verify a proof
    console.log('Creating proof...');
    const proof = await ArithmeticProgram.add(Field(3), Field(4));
    console.log(`${backend} proof creation succeeded`);
    
    // Verify the proof
    console.log('Verifying proof...');
    const isValid = await result.verify(proof);
    console.log(`${backend} proof verification: ${isValid ? 'VALID' : 'INVALID'}`);
    
    return { 
      success: true, 
      vkHash: result.verificationKey.hash.toString(),
      proofValid: isValid
    };
  } catch (error) {
    console.error(`${backend} failed:`, error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing Simple Arithmetic Program...\n');
  
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  console.log('\n=== Results ===');
  console.log('Snarky:', snarkyResult);
  console.log('Sparky:', sparkyResult);
  
  if (snarkyResult.success && sparkyResult.success) {
    const match = snarkyResult.vkHash === sparkyResult.vkHash;
    console.log(`\nVK Parity: ${match ? '✅ MATCH' : '❌ MISMATCH'}`);
    console.log(`Proof Verification: Snarky=${snarkyResult.proofValid ? '✅' : '❌'}, Sparky=${sparkyResult.proofValid ? '✅' : '❌'}`);
  }
}

main().catch(console.error);