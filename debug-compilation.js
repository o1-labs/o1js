#!/usr/bin/env node

// Minimal SmartContract compilation test to debug exact failure point
import { switchBackend, getCurrentBackend, Field, SmartContract, State, state, method } from './dist/node/index.js';

console.log('🧪 MINIMAL COMPILATION DEBUG TEST');
console.log('================================');

try {
  // Switch to Sparky
  console.log('1. Switching to Sparky backend...');
  await switchBackend('sparky');
  console.log(`✅ Current backend: ${getCurrentBackend()}`);

  // Test basic Field operation
  console.log('2. Testing basic Field operation...');
  const a = Field(5);
  const b = Field(10);
  const c = a.add(b);
  console.log(`✅ Basic field operation: ${a} + ${b} = ${c}`);

  // Test constraint generation directly
  console.log('3. Testing constraint generation...');
  const x = Field(5);
  const y = Field(10);
  
  // This should route to Sparky if backend switching works
  x.assertEquals(x); // Simple equality constraint
  console.log('✅ Basic constraint generation works');

  // Test more complex operations
  console.log('4. Testing multiplication constraint...');
  const z = x.mul(y); // Should create multiplication constraint
  z.assertEquals(Field(50)); // Should verify the result
  console.log('✅ Multiplication constraint works');
  
  // Try to access compilation functions directly
  console.log('5. Testing circuit compilation...');
  
  // Import ZkProgram instead of SmartContract (simpler)
  const { ZkProgram, SelfProof } = await import('./dist/node/index.js');
  
  const SimpleProgram = ZkProgram({
    name: 'simple',
    publicInput: Field,
    methods: {
      baseCase: {
        privateInputs: [],
        method(input) {
          // Simple constraint
          input.assertEquals(Field(42));
        },
      },
    },
  });
  
  console.log('6. Attempting ZkProgram compilation...');
  const result = await SimpleProgram.compile();
  console.log('✅ ZKPROGRAM COMPILATION SUCCESSFUL!');
  console.log('   Verification key exists:', !!result.verificationKey);
  
} catch (error) {
  console.log('❌ COMPILATION FAILED!');
  console.log('Error message:', error.message);
  console.log('Stack trace:', error.stack);
  
  // Check if it's a specific Sparky issue
  if (error.message.includes('sparky') || error.message.includes('Sparky')) {
    console.log('🔍 This appears to be a Sparky-specific issue');
  }
  
  if (error.message.includes('not a function') || error.message.includes('undefined')) {
    console.log('🔍 This appears to be a missing function implementation');
  }
}