import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Run Methods ===\n');

// Switch to Sparky first
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

// Get the Snarky object
const sparky = globalThis.__snarky;
const Snarky = sparky.Snarky;

console.log('\n1. Run module methods:');
console.log('   Type:', typeof Snarky.run);
console.log('   Methods:', Object.keys(Snarky.run));

// Check each method type
for (const method of Object.keys(Snarky.run)) {
  console.log(`   ${method}:`, typeof Snarky.run[method]);
}

console.log('\n=== Complete ===\n');