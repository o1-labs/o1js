#!/usr/bin/env node

/**
 * Debug assertLessThan with simple constants to isolate the issue
 */

import { switchBackend, getCurrentBackend, initializeBindings } from './src/bindings.js';

console.log('🔧 Starting simple assertLessThan debug...');

// Initialize bindings first
console.log('🔧 Initializing bindings...');
await initializeBindings();

// Switch to sparky backend
console.log('\n🔧 Switching to Sparky backend...');
try {
  await switchBackend('sparky');
  console.log('✅ Backend switched to:', getCurrentBackend());
  
  console.log('\n🔧 Testing assertLessThan with constants...');
  const { Field, Provable } = await import('./src/index.js');
  
  // Test with simple constants first
  console.log('Testing Field(5).assertLessThan(Field(10))...');
  try {
    Provable.runAndCheck(() => {
      Field(5).assertLessThan(Field(10));
      console.log('✅ Constant assertLessThan (5 < 10) works');
    });
  } catch (error) {
    console.error('❌ Constant assertLessThan failed:', error.message);
    console.error('Full error:', error);
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Error stack:', error.stack);
}