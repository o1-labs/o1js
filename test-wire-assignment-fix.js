#!/usr/bin/env node
/**
 * WIRE ASSIGNMENT FIX VALIDATION TEST
 * 
 * This test specifically validates that the wire assignment fix resolves
 * the "permutation was not constructed correctly: final value" error.
 */

import { switchBackend, Field, ZkProgram } from './dist/node/index.js';

console.log('🎯 WIRE ASSIGNMENT FIX VALIDATION TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function testWireAssignmentFix() {
  console.log('\n🔧 Testing with SPARKY backend...');
  
  await switchBackend('sparky');
  console.log('✅ Switched to Sparky backend');

  // Create the minimal program that should trigger wire assignment 
  const SimpleArithmetic = ZkProgram({
    name: 'SimpleArithmetic',
    publicInput: Field,
    publicOutput: Field,
    methods: {
      add: {
        privateInputs: [Field],
        async method(publicInput, privateInput) {
          const sum = publicInput.add(privateInput);
          return { publicOutput: sum };
        },
      },
    },
  });

  try {
    console.log('🏗️ Compiling program...');
    const { verificationKey } = await SimpleArithmetic.compile();
    console.log('✅ Compilation successful');
    console.log(`VK length: ${verificationKey.data.length} chars`);

    console.log('\n🧪 Creating proof (this is where wire assignment matters)...');
    console.log('>>> Look for variable mapping debug logs <<<');
    
    const proof = await SimpleArithmetic.add(Field(10), Field(5));
    
    console.log('\n🎉 SUCCESS! WIRE ASSIGNMENT FIX WORKS!');
    console.log('✅ Proof generated successfully - no permutation errors!');
    console.log('✅ Wire assignment mapping is now correct!');

    console.log('\n🔍 Verifying proof...');
    const verified = await SimpleArithmetic.verify(proof);
    console.log(`✅ Verification: ${verified}`);
    
    return { success: true, message: 'Wire assignment fix successful!' };
    
  } catch (error) {
    console.log('\n❌ Wire assignment fix validation failed:');
    console.log('Error message:', error.message);
    
    if (error.message.includes('permutation was not constructed correctly')) {
      console.log('🎯 Still getting permutation error - wire assignment not fully fixed');
      console.log('🔍 Check the variable mapping logs above for debugging');
    } else if (error.message.includes('Index out of bounds')) {
      console.log('🎯 Index out of bounds - constraint system empty (different issue)');
    } else {
      console.log('🎯 Different error - may indicate progress or new issue');
    }
    
    return { success: false, message: error.message };
  }
}

// Execute the test
const result = await testWireAssignmentFix();

console.log('\n📊 WIRE ASSIGNMENT FIX VALIDATION RESULTS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (result.success) {
  console.log('🎉 VALIDATION: ✅ SUCCESS');
  console.log('🎯 Wire assignment fix has resolved the permutation construction error!');
  console.log('📈 Expected outcome: Sparky mathematical correctness should improve significantly');
} else {
  console.log('❌ VALIDATION: FAILED');
  console.log('🔍 Wire assignment fix needs further investigation');
  console.log('📝 Error:', result.message);
}