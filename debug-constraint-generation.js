#!/usr/bin/env node

import { switchBackend, Field, Provable } from './dist/node/index.js';

console.log('🔧 Testing constraint generation during runAndCheck...');

// Switch to Sparky backend
await switchBackend('sparky');
console.log('✅ Switched to Sparky backend');

try {
  console.log('🧪 Running simple constraint generation...');
  
  // Use runAndCheck to generate constraints
  const result = Provable.runAndCheck(() => {
    const a = Provable.witness(Field, () => Field(5));
    const b = Provable.witness(Field, () => Field(3));
    const sum = a.add(b);
    sum.assertEquals(Field(8));
    return sum;
  });
  
  console.log('✅ runAndCheck completed successfully');
  console.log('Result:', result.toString());
  
} catch (error) {
  console.log('❌ Error occurred:');
  console.log(error.message);
  console.log(error.stack);
}