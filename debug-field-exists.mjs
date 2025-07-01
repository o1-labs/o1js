#!/usr/bin/env node
/**
 * Debug field.exists issue
 */

import { Field, switchBackend, initializeBindings } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

console.log('=== DEBUG FIELD EXISTS ===\n');

async function test() {
  // Test with Snarky first
  console.log('1. Testing Snarky field.exists:');
  await switchBackend('snarky');
  await initializeBindings();
  
  const snarkyEnter = Snarky.run.enterAsProver(1);
  const snarkyResult = snarkyEnter(0); // Pass 0 for None
  console.log('  Result type:', typeof snarkyResult);
  console.log('  Result:', snarkyResult);
  console.log('  Result[0]:', snarkyResult[0]);
  console.log('  Result[1]:', snarkyResult[1]);
  
  // Test with Sparky
  console.log('\n2. Testing Sparky field.exists:');
  await switchBackend('sparky');
  await initializeBindings();
  
  const sparkyEnter = Snarky.run.enterAsProver(1);
  const sparkyResult = sparkyEnter(0); // Pass 0 for None
  console.log('  Result type:', typeof sparkyResult);
  console.log('  Result:', sparkyResult);
  console.log('  Result[0]:', sparkyResult[0]);
  console.log('  Result[1]:', sparkyResult[1]);
  
  // Also test the Sparky field module directly
  console.log('\n3. Testing Sparky field module:');
  // Try to get the field module from sparky instance
  try {
    // Import sparky adapter to access internals
    const sparkyAdapter = await import('./dist/node/bindings/sparky-adapter.js');
    console.log('  sparkyInstance exists?', !!sparkyAdapter.sparkyInstance);
    
    // Try different ways to access field module
    console.log('  Snarky.field:', Snarky.field);
    console.log('  Snarky.field keys:', Object.keys(Snarky.field || {}));
    
    // Check if we have run.state.allocVar
    console.log('  Snarky.run.state:', Snarky.run.state);
    console.log('  Snarky.run.state keys:', Object.keys(Snarky.run.state || {}));
  } catch (e) {
    console.log('  Error accessing field module:', e.message);
  }
}

test().catch(console.error);