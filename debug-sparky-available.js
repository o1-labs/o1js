import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Sparky Available APIs ===\n');

// Switch to Sparky first
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

// Check what's available globally
console.log('\n1. Global __snarky:', typeof globalThis.__snarky);
if (globalThis.__snarky) {
  console.log('   Keys:', Object.keys(globalThis.__snarky));
  
  // Check each module
  for (const key of Object.keys(globalThis.__snarky)) {
    const module = globalThis.__snarky[key];
    if (module && typeof module === 'object') {
      console.log(`\n   ${key}:`, Object.keys(module).slice(0, 10), '...');
    }
  }
}

console.log('\n2. Global sparkyInstance:', typeof globalThis.sparkyInstance);
console.log('\n3. Global sparkyConstraintBridge:', typeof globalThis.sparkyConstraintBridge);
if (globalThis.sparkyConstraintBridge) {
  console.log('   Methods:', Object.keys(globalThis.sparkyConstraintBridge));
}

// Import sparky adapter directly
import sparkyModule from './dist/node/bindings/sparky-adapter.js';
console.log('\n4. Sparky module exports:', Object.keys(sparkyModule));

console.log('\n=== Complete ===\n');