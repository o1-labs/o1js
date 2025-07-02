/*
 * PRESERVED TEST FILE: test-backend-routing.mjs
 * 
 * PRESERVATION REASON: Identifies critical globalThis.__snarky routing bug
 * ORIGINAL PATH: ./test-backend-routing.mjs
 * ARCHIVED: 2025-07-02T14:51:05.615Z
 * 
 * This file was preserved during test cleanup as a reference for
 * understanding the constraint routing bug and backend switching issues.
 */

import { Field, initializeBindings, switchBackend } from './dist/node/index.js';

console.log('Testing backend routing issue...\n');

async function testBackendRouting() {
  // Initialize with Snarky
  await initializeBindings();
  
  console.log('=== Checking global __snarky object ===');
  console.log('globalThis.__snarky exists:', !!globalThis.__snarky);
  console.log('globalThis.__snarky.gates exists:', !!(globalThis.__snarky?.gates));
  
  // Get references to gate functions
  const snarkyGates = globalThis.__snarky?.gates;
  
  console.log('\n=== Testing with Snarky backend ===');
  // Create a simple constraint
  try {
    const x = Field(3);
    const y = Field(4);
    console.log('Created fields, checking gate function references...');
    console.log('Gates.generic is:', snarkyGates?.generic ? 'OCaml function' : 'missing');
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  // Switch to Sparky
  await switchBackend('sparky');
  
  console.log('\n=== After switching to Sparky ===');
  console.log('globalThis.__snarky unchanged:', globalThis.__snarky === snarkyGates);
  console.log('Still points to OCaml:', globalThis.__snarky?.gates === snarkyGates);
  
  // Check what Sparky provides
  const { Snarky: SparkySnarky } = await import('./dist/node/bindings/sparky-adapter.js');
  console.log('\nSparky adapter provides:');
  console.log('SparkySnarky.gates exists:', !!SparkySnarky.gates);
  console.log('SparkySnarky.gates.generic exists:', !!SparkySnarky.gates?.generic);
  
  console.log('\n=== DIAGNOSIS ===');
  console.log('The issue is clear:');
  console.log('1. OCaml sets globalThis.__snarky to its implementation');
  console.log('2. Sparky adapter does NOT update globalThis.__snarky');
  console.log('3. TypeScript code uses globalThis.__snarky for gates');
  console.log('4. Result: Constraints always go through OCaml, never Sparky');
  
  console.log('\nThis explains why:');
  console.log('- Constraint bridge gets empty results (constraints in wrong system)');
  console.log('- All Sparky VKs are identical (no circuit-specific constraints)');
  console.log('- Field operations work but constraints aren\'t captured');
}

testBackendRouting().catch(console.error);