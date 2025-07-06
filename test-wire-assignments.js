#!/usr/bin/env node

import { switchBackend, Field, Provable } from './dist/node/index.js';

console.log('🔧 Testing wire assignments with minimal constraint generation...');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Switched to Sparky backend');

try {
  console.log('🧪 Running minimal constraint generation...');
  
  // Use runAndCheck to generate constraints
  Provable.runAndCheck(() => {
    // Create some witness variables
    const a = Provable.witness(Field, () => Field(10));
    const b = Provable.witness(Field, () => Field(5));
    
    // Do an addition operation (creates intermediate variables)
    const sum = a.add(b);
    
    // Assert the result (creates a constraint)
    sum.assertEquals(Field(15));
    
    return sum;
  });
  
  console.log('✅ runAndCheck completed successfully - this should not happen if wire assignment bug exists');
  
} catch (error) {
  console.log('❌ Expected error occurred:');
  console.log('Error message:', error.message);
  
  if (error.message.includes('permutation')) {
    console.log('🎯 Got expected permutation error - check console output above for wire assignment error logs');
  }
}