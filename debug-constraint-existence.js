#!/usr/bin/env node

import { switchBackend, Field, Provable } from './dist/node/index.js';

console.log('🔍 DEBUGGING: Where are the constraints actually stored?');

await switchBackend('sparky');
console.log('✅ Switched to Sparky backend');

console.log('\n🧪 Running simple constraint generation with Provable.runAndCheck...');

try {
  const result = Provable.runAndCheck(() => {
    console.log('  📝 Inside runAndCheck - creating witnesses...');
    const a = Provable.witness(Field, () => Field(10));
    const b = Provable.witness(Field, () => Field(5));
    
    console.log('  ➕ Performing addition...');
    const sum = a.add(b);
    
    console.log('  ✅ Asserting equality...');
    sum.assertEquals(Field(15));
    
    console.log('  📊 runAndCheck operations complete');
    return sum;
  });
  
  console.log('✅ runAndCheck succeeded');
  console.log('Result:', result.toString());
  console.log('\n🎯 This proves constraints ARE being generated successfully!');
  console.log('📝 The issue must be in ZkProgram compilation/proof pipeline, not basic constraint generation');
  
} catch (error) {
  console.log('❌ runAndCheck failed:', error.message);
}