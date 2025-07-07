import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend, Void } from './dist/node/index.js';

console.log('Testing zkProgram with ZERO public inputs...\n');

// Create a zkProgram with no public inputs or outputs
const ZeroPublicInputProgram = ZkProgram({
  name: 'ZeroPublicInputProgram',
  publicInput: Void,  // No public input
  publicOutput: Void, // No public output
  methods: {
    simpleCompute: {
      privateInputs: [Field],
      async method(privateField) {
        // When publicInput is Void, the method doesn't receive it as parameter
        // Simple computation with only private variables
        const squared = privateField.square();
        const plusOne = squared.add(1);
        
        // Add some constraints
        plusOne.assertGreaterThan(privateField);
        
        // No public output (return nothing or undefined for Void)
      }
    }
  }
});

async function testBackend(backendName) {
  console.log(`\n=== Testing with ${backendName} backend ===`);
  
  await switchBackend(backendName);
  console.log(`Switched to ${backendName}`);
  
  try {
    console.log('Compiling zkProgram...');
    const start = Date.now();
    const { verificationKey } = await ZeroPublicInputProgram.compile();
    const compileTime = Date.now() - start;
    
    console.log(`✅ Compilation successful in ${compileTime}ms`);
    console.log(`Verification key hash: ${verificationKey.hash.toString()}`);
    console.log(`Verification key data length: ${verificationKey.data.length}`);
    
    // Try to create and verify a proof
    console.log('\nCreating proof...');
    const proofStart = Date.now();
    const proof = await ZeroPublicInputProgram.simpleCompute(Field(42));
    const proofTime = Date.now() - proofStart;
    
    console.log(`✅ Proof created in ${proofTime}ms`);
    
    // Verify the proof
    console.log('Verifying proof...');
    const verifyStart = Date.now();
    const isValid = await ZeroPublicInputProgram.verify(proof);
    const verifyTime = Date.now() - verifyStart;
    
    console.log(`✅ Proof verification: ${isValid} (${verifyTime}ms)`);
    
    return {
      backend: backendName,
      success: true,
      vkHash: verificationKey.hash.toString(),
      vkDataLength: verificationKey.data.length,
      compileTime,
      proofTime,
      verifyTime,
      proofValid: isValid
    };
  } catch (error) {
    console.error(`❌ Error with ${backendName}:`, error.message);
    return {
      backend: backendName,
      success: false,
      error: error.message
    };
  }
}

// Test both backends
async function main() {
  const results = [];
  
  // Test Snarky first
  results.push(await testBackend('snarky'));
  
  // Test Sparky
  results.push(await testBackend('sparky'));
  
  // Compare results
  console.log('\n=== COMPARISON ===');
  console.log('Results:', JSON.stringify(results, null, 2));
  
  const snarkyResult = results.find(r => r.backend === 'snarky');
  const sparkyResult = results.find(r => r.backend === 'sparky');
  
  if (snarkyResult.success && sparkyResult.success) {
    const vkMatch = snarkyResult.vkHash === sparkyResult.vkHash;
    console.log(`\nVerification keys match: ${vkMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!vkMatch) {
      console.log(`Snarky VK hash: ${snarkyResult.vkHash}`);
      console.log(`Sparky VK hash: ${sparkyResult.vkHash}`);
      console.log('\nThis indicates the issue is NOT just about public input size!');
    } else {
      console.log('\nVerification keys match! Public input handling may not be the issue.');
    }
  } else {
    console.log('\nOne or both backends failed - check error messages above');
  }
}

main().catch(console.error);