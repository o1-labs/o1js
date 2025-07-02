import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Field Methods ===\n');

// Switch to Sparky first
await switchBackend('sparky');
console.log('Backend:', getCurrentBackend());

// Get the Snarky object
const sparky = globalThis.__snarky;
const Snarky = sparky.Snarky;

console.log('\n1. Field module methods:');
console.log('   Type:', typeof Snarky.field);
console.log('   Methods:', Object.keys(Snarky.field));

console.log('\n=== Complete ===\n');