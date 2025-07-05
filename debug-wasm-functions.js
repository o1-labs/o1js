#!/usr/bin/env node

/**
 * Debug what functions are actually available on sparkyInstance.gates
 */

import { switchBackend, getCurrentBackend, initializeBindings } from './src/bindings.js';

console.log('🔧 Starting WASM function inspection...');

// Initialize bindings first
console.log('🔧 Initializing bindings...');
await initializeBindings();

// Switch to sparky backend
console.log('\n🔧 Switching to Sparky backend...');
try {
  await switchBackend('sparky');
  console.log('✅ Backend switched to:', getCurrentBackend());
  
  // Check what's available on sparkyInstance.gates
  const sparkyAdapter = await import('./src/bindings/sparky-adapter/index.js');
  
  console.log('\n🔧 Inspecting sparkyInstance.gates...');
  
  // Access the sparkyInstance through the adapter (we need to trigger initialization)
  const { Field } = await import('./src/index.js');
  Field(0); // This should trigger WASM loading
  
  console.log('✅ WASM should be loaded now');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Error stack:', error.stack);
}