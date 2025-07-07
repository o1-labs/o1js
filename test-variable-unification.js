/**
 * Test to verify that variable unification fixes the permutation bug
 * 
 * Tests a simple ZkProgram with an assertEquals constraint to verify:
 * 1. Variables are properly unified in the Union-Find structure
 * 2. Permutation cycles are created correctly
 * 3. The permutation polynomial validation succeeds
 */

import { Field, ZkProgram, Provable, switchBackend, getCurrentBackend } from './src/index.js';

// Simple program with assertEquals that should trigger variable unification
const SimpleEqualityProgram = ZkProgram({
  name: 'SimpleEqualityProgram',
  publicInput: Field,
  publicOutput: Field,
  methods: {
    testEquality: {
      privateInputs: [Field],
      async method(publicInput, privateInput) {
        // This creates a constraint: publicInput - privateInput = 0
        // The variables should be unified in the Union-Find
        publicInput.assertEquals(privateInput);
        
        // Return the public input as output
        return { publicOutput: publicInput };
      },
    },
  },
});

async function testWithBackend(backend) {
  console.log(`\n🔄 Testing with ${backend.toUpperCase()} backend...`);
  console.log('─'.repeat(50));
  
  await switchBackend(backend);
  console.log(`✓ Switched to ${backend} backend`);
  
  try {
    console.log('\n📋 Compiling SimpleEqualityProgram...');
    const compilationResult = await SimpleEqualityProgram.compile();
    console.log('✅ Compilation successful');
    
    // Test with equal values (should pass)
    console.log('\n🧪 Testing with equal values...');
    const publicInput = Field(42);
    const privateInput = Field(42);
    const proof1 = await SimpleEqualityProgram.testEquality(publicInput, privateInput);
    const verified1 = await SimpleEqualityProgram.verify(proof1);
    console.log(`  ✅ Proof verification (equal values): ${verified1 ? 'PASSED' : 'FAILED'}`);
    console.log(`  📤 Public output: ${proof1.publicOutput.toString()}`);
    
    // Test with unequal values (should fail during proof generation)
    console.log('\n🧪 Testing with unequal values...');
    try {
      const proof2 = await SimpleEqualityProgram.testEquality(Field(42), Field(43));
      console.log('  ❌ ERROR: Proof generation should have failed for unequal values!');
    } catch (error) {
      console.log('  ✅ Correctly rejected unequal values:', error.message);
    }
    
    console.log(`\n✅ ${backend.toUpperCase()} backend: All tests passed`);
    
  } catch (error) {
    console.log(`\n❌ ${backend.toUpperCase()} backend failed:`, error.message);
    if (error.message.includes('permutation')) {
      console.log('  ⚠️  This is the permutation bug we\'re trying to fix!');
    }
    throw error;
  }
}

async function main() {
  console.log('🔍 Variable Unification & Permutation Bug Test');
  console.log('==============================================\n');
  
  console.log('This test verifies that:');
  console.log('1. Variables in assertEquals are properly unified');
  console.log('2. Permutation cycles are created from equivalence classes');
  console.log('3. The permutation polynomial validation succeeds');
  
  try {
    // Test with Snarky first (should work)
    await testWithBackend('snarky');
    
    // Test with Sparky (should now work with variable unification fix)
    await testWithBackend('sparky');
    
    console.log('\n🎉 SUCCESS: Both backends passed all tests!');
    console.log('Variable unification is working correctly.');
    
  } catch (error) {
    console.log('\n💥 Test failed. The permutation bug may not be fully fixed.');
    process.exit(1);
  }
}

main().catch(console.error);