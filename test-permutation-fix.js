import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

// Test program that was failing with permutation error
const SimpleArithmetic = ZkProgram({
  name: 'SimpleArithmetic',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    normalValues: {
      privateInputs: [Field, Field],
      async method(publicInput, a, b) {
        // Simple arithmetic: result = publicInput + a * b
        const ab = a.mul(b);
        const result = publicInput.add(ab);
        return result;
      }
    }
  }
});

async function testBackend(backend) {
  console.log(`\n=== Testing with ${backend} backend ===`);
  await switchBackend(backend);
  
  try {
    console.log(`🔧 Compiling ZkProgram...`);
    const vk = await SimpleArithmetic.compile();
    console.log(`✅ Compilation succeeded!`);
    console.log(`   VK hash: ${vk.verificationKey.hash || vk.verificationKey}`);
    
    // Test proof generation
    console.log(`🔧 Generating proof...`);
    const publicInput = Field(10);
    const a = Field(5);
    const b = Field(3);
    const proof = await SimpleArithmetic.normalValues(publicInput, a, b);
    console.log(`✅ Proof generation succeeded!`);
    console.log(`   Output: ${proof.publicOutput}`);
    
    // Verify proof
    console.log(`🔧 Verifying proof...`);
    const verifyResult = await SimpleArithmetic.verify(proof.proof);
    console.log(`✅ Verification result: ${verifyResult}`);
    
    return { success: true, vkHash: vk.verificationKey.hash || vk.verificationKey };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing Sparky permutation fix...');
  
  // Test both backends
  const snarkyResult = await testBackend('snarky');
  const sparkyResult = await testBackend('sparky');
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Snarky: ${snarkyResult.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Sparky: ${sparkyResult.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (snarkyResult.success && sparkyResult.success) {
    console.log(`\nVK comparison:`);
    console.log(`Snarky VK: ${snarkyResult.vkHash}`);
    console.log(`Sparky VK: ${sparkyResult.vkHash}`);
    console.log(`VK match: ${snarkyResult.vkHash === sparkyResult.vkHash ? '✅ YES' : '❌ NO'}`);
  }
}

main().catch(console.error);