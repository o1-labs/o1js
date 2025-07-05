#!/usr/bin/env node

/**
 * Debug assertLessThan with witness variables to find the exact issue
 */

import { switchBackend, getCurrentBackend, initializeBindings } from './src/bindings.js';

console.log('🔧 Starting witness assertLessThan debug...');

// Initialize bindings first
console.log('🔧 Initializing bindings...');
await initializeBindings();

// Switch to sparky backend
console.log('\n🔧 Switching to Sparky backend...');
try {
  await switchBackend('sparky');
  console.log('✅ Backend switched to:', getCurrentBackend());
  
  console.log('\n🔧 Testing assertLessThan with witness variables...');
  const { Field, Provable } = await import('./src/index.js');
  
  // Test with witness variables
  console.log('Testing witness.assertLessThan(constant)...');
  try {
    Provable.runAndCheck(() => {
      const witnessValue = Provable.witness(Field, () => Field(7));
      console.log('✅ Witness variable created:', witnessValue.toString());
      
      console.log('Calling witnessValue.assertLessThan(Field(100))...');
      witnessValue.assertLessThan(Field(100));
      console.log('✅ Witness assertLessThan works');
    });
  } catch (error) {
    console.error('❌ Witness assertLessThan failed:', error.message);
    console.error('Full error object:', error);
    console.error('Error stack:', error.stack);
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Error stack:', error.stack);
}