// Minimal test for existsOne debugging
// Created: July 4, 2025 12:00 AM UTC

import pkg from './dist/node/index.js';
const { Field, switchBackend, getCurrentBackend, Provable } = pkg;

async function testMinimalExists() {
  console.log('=== Minimal existsOne Test ===');
  
  try {
    await switchBackend('sparky');
    console.log('Backend:', getCurrentBackend());
    
    // Test 1: Direct access to sparky instance
    console.log('\n1. Testing direct WASM existsOne call:');
    if (globalThis.sparkyInstance?.run?.existsOne) {
      console.log('  sparkyInstance.run.existsOne available');
      
      try {
        const result = globalThis.sparkyInstance.run.existsOne(() => {
          console.log('    Compute function called');
          return Field(42);
        });
        console.log('  Direct existsOne result:', result);
        console.log('  Result type:', typeof result);
      } catch (error) {
        console.log('  Direct existsOne error:', error.message);
      }
    } else {
      console.log('  ❌ sparkyInstance.run.existsOne not available');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testMinimalExists();