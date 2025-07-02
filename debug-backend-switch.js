import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

console.log('\n=== Debug Backend Switch ===\n');

// Check Snarky before switch
console.log('1. Before switch:');
console.log('   Current backend:', getCurrentBackend());
console.log('   __snarky type:', typeof globalThis.__snarky);
console.log('   __snarky.Snarky.gates.generic:', typeof globalThis.__snarky?.Snarky?.gates?.generic);

// Switch to Sparky
await switchBackend('sparky');

console.log('\n2. After switch to Sparky:');
console.log('   Current backend:', getCurrentBackend());
console.log('   __snarky type:', typeof globalThis.__snarky);
console.log('   __snarky.Snarky.gates.generic:', typeof globalThis.__snarky?.Snarky?.gates?.generic);

// Check if it's the same function
const gatesGenericBefore = globalThis.__snarky?.Snarky?.gates?.generic;

// Switch back to snarky
await switchBackend('snarky');

console.log('\n3. After switch back to Snarky:');
console.log('   Current backend:', getCurrentBackend());
console.log('   __snarky type:', typeof globalThis.__snarky);
console.log('   __snarky.Snarky.gates.generic:', typeof globalThis.__snarky?.Snarky?.gates?.generic);

const gatesGenericAfter = globalThis.__snarky?.Snarky?.gates?.generic;

console.log('\n4. Comparison:');
console.log('   Same gates.generic function?', gatesGenericBefore === gatesGenericAfter);
console.log('   gates.generic before toString:', gatesGenericBefore?.toString());
console.log('   gates.generic after toString:', gatesGenericAfter?.toString());

// Switch back to Sparky for final test
await switchBackend('sparky');

console.log('\n5. Check sparky-adapter exports:');
import sparkyAdapter from './dist/node/bindings/sparky-adapter.js';
console.log('   sparkyAdapter.Snarky.gates.generic:', typeof sparkyAdapter.Snarky.gates.generic);

console.log('\n=== Complete ===\n');