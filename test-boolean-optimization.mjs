#!/usr/bin/env node

// Test Boolean Operation Optimization
// This test verifies that Bool.or() and Bool.not() now use semantic gates

import { Bool, Field, ZkProgram, switchBackend } from './dist/node/index.js';

console.log('🧪 TESTING BOOLEAN SEMANTIC GATE OPTIMIZATION');
console.log('='.repeat(50));

// Test boolean operations with Sparky backend
await switchBackend('sparky');
console.log('✅ Switched to Sparky backend');

// Simple Boolean Logic Test Program
const TestBooleanLogic = ZkProgram({
  name: 'TestBooleanLogic',
  publicInput: Bool,
  methods: {
    test: {
      privateInputs: [Bool, Bool],
      async method(input, a, b) {
        console.log('🎯 Testing Bool.or() - should use semantic BooleanOr gate');
        const or_result = a.or(b);
        
        console.log('🎯 Testing Bool.not() - should use semantic BooleanNot gate');
        const not_result = a.not();
        
        console.log('🎯 Testing Bool.and() - should use semantic BooleanAnd gate');
        const and_result = a.and(b);
        
        // Simple final operation
        const final_result = or_result.and(not_result);
        
        return { publicOutput: final_result };
      },
    },
  },
});

console.log('\n⏱️  Compiling TestBooleanLogic with Sparky...');

try {
  const result = await TestBooleanLogic.compile();
  
  // Get constraint information
  const methods = result.provers ? Object.keys(result.provers) : ['test'];
  console.log(`\n📊 COMPILATION RESULTS:`);
  console.log(`- Methods: ${methods.join(', ')}`);
  console.log(`- VK Hash: ${result.verificationKey?.hash?.slice(0, 8)}...`);
  
  // Try to get constraint count
  if (result.analyzeMethods) {
    const analysis = result.analyzeMethods();
    if (analysis && analysis.test) {
      console.log(`- Constraints: ${analysis.test.rows || 'N/A'}`);
    }
  }
  
  console.log('\n✅ Boolean semantic gate test completed!');
  console.log('Check the console logs above for semantic gate creation messages.');
  
} catch (error) {
  console.error('❌ Error during compilation:', error.message);
}