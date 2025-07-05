#!/usr/bin/env node

/**
 * Debug the specific assertLessThan path that's failing
 */

import { switchBackend, getCurrentBackend, initializeBindings } from './src/bindings.js';

console.log('🔧 Starting assertLessThan debug...');

// Initialize bindings first
console.log('🔧 Initializing bindings...');
await initializeBindings();

// Test with snarky backend first
console.log('\n🔧 Testing assertLessThan with Snarky backend...');
const { Field, Provable } = await import('./src/index.js');

try {
  Provable.runAndCheck(() => {
    const witnessValue = Provable.witness(Field, () => Field(7));
    witnessValue.assertLessThan(Field(100));
    console.log('✅ assertLessThan works with Snarky backend');
  });
} catch (error) {
  console.error('❌ assertLessThan failed with Snarky backend:', error.message);
}

// Now test with sparky backend
console.log('\n🔧 Switching to Sparky backend...');
try {
  await switchBackend('sparky');
  console.log('✅ Backend switched to:', getCurrentBackend());
  
  console.log('\n🔧 Testing assertLessThan with Sparky backend...');
  Provable.runAndCheck(() => {
    const witnessValue = Provable.witness(Field, () => Field(7));
    console.log('🔧 Calling witnessValue.assertLessThan(Field(100))...');
    witnessValue.assertLessThan(Field(100));
    console.log('✅ assertLessThan works with Sparky backend');
  });
  
} catch (error) {
  console.error('❌ assertLessThan failed with Sparky backend:', error.message);
  console.error('Error stack:', error.stack);
}