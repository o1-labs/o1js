#!/usr/bin/env node
import { Field, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('🔍 Sparky Permutation Analysis Test');
console.log('=====================================\n');

// Simple test that should have clear permutation requirements
const PermutationTest = ZkProgram({
  name: 'PermutationTest',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    // This method uses variables in multiple positions
    testPermutation: {
      privateInputs: [Field],
      async method(publicInput, privateInput) {
        // Create intermediate values that use the same variable multiple times
        const a = publicInput.add(privateInput);  // a = publicInput + privateInput
        const b = a.mul(Field(2));                // b = a * 2
        const c = a.add(b);                        // c = a + b (a used twice!)
        return { publicOutput: c };
      },
    },
  },
});

async function analyzeBackend(backend) {
  console.log(`\n📊 Analyzing ${backend} backend:`);
  console.log('─'.repeat(40));
  
  try {
    await switchBackend(backend);
    console.log(`✅ Switched to ${backend}`);
    
    // Compile
    console.log('⏳ Compiling...');
    const { verificationKey } = await PermutationTest.compile();
    console.log(`✅ Compiled`);
    console.log(`📝 VK hash: ${verificationKey.hash}`);
    
    // Create proof
    console.log('⏳ Creating proof...');
    const publicInput = Field(3);
    const privateInput = Field(5);
    // Expected: a = 3 + 5 = 8, b = 8 * 2 = 16, c = 8 + 16 = 24
    
    const proofResult = await PermutationTest.testPermutation(publicInput, privateInput);
    const proof = proofResult.proof || proofResult;
    console.log(`✅ Proof created`);
    console.log(`📊 Public output: ${proof.publicOutput} (expected: 24)`);
    
    // Verify
    const isValid = await PermutationTest.verify(proof);
    console.log(`📊 Proof valid: ${isValid}`);
    
    return { success: true, vkHash: verificationKey.hash };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('This test creates a circuit where variable "a" is used in multiple constraints.');
  console.log('This should require proper permutation cycles to enforce copy constraints.\n');
  
  const snarkyResult = await analyzeBackend('snarky');
  const sparkyResult = await analyzeBackend('sparky');
  
  console.log('\n' + '='.repeat(50));
  console.log('📈 ANALYSIS:');
  console.log('─'.repeat(50));
  
  if (!sparkyResult.success && sparkyResult.error.includes('permutation')) {
    console.log('🎯 Permutation error confirmed!');
    console.log('\nThe issue is that Sparky doesn\'t create permutation cycles for');
    console.log('variables that appear in multiple constraint positions.');
    console.log('\nIn this example, variable "a" appears in:');
    console.log('- Constraint for b = a * 2');
    console.log('- Constraint for c = a + b');
    console.log('\nThese positions need to be connected via permutation cycles.');
  }
  
  process.exit(0);
}

main().catch(console.error);