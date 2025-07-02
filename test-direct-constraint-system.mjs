#!/usr/bin/env node

import { switchBackend } from './dist/node/index.js';

// Direct test of constraint system persistence
async function testDirectConstraintSystem() {
  console.log('=== Direct Constraint System Test ===\n');
  
  await switchBackend('sparky');
  
  // Import the Sparky adapter directly
  const sparkyAdapter = await import('./dist/node/bindings/sparky-adapter.js');
  await sparkyAdapter.initializeSparky();
  
  // Access Sparky directly
  const { Snarky } = sparkyAdapter;
  
  console.log('1. Initial constraint system:');
  let cs = sparkyAdapter.getAccumulatedConstraints();
  console.log('   Constraints:', cs.length);
  
  console.log('\n2. Starting constraint accumulation...');
  sparkyAdapter.startConstraintAccumulation();
  
  console.log('\n3. After starting accumulation:');
  cs = sparkyAdapter.getAccumulatedConstraints();
  console.log('   Constraints:', cs.length);
  
  console.log('\n4. Calling a gate directly...');
  try {
    // Try to add a constraint using the gates API
    // Create field vars (MlArray format: [tag, value])
    const zero = [0, 0n];
    const one = [0, 1n];
    
    // Call generic gate: 1*x = 0 (constraint x to zero)
    Snarky.gates.generic(one, zero, zero, zero, zero, zero, zero, zero, zero);
    console.log('   Gate called successfully');
  } catch (error) {
    console.error('   Error calling gate:', error.message);
  }
  
  console.log('\n5. After calling gate:');
  cs = sparkyAdapter.getAccumulatedConstraints();
  console.log('   Constraints:', cs.length);
  console.log('   Full constraints:', JSON.stringify(cs, null, 2));
  
  console.log('\n6. Ending constraint accumulation...');
  sparkyAdapter.endConstraintAccumulation();
  
  console.log('\n7. After ending:');
  cs = sparkyAdapter.getAccumulatedConstraints();
  console.log('   Constraints:', cs.length);
  
  console.log('\n=== Analysis ===');
  console.log('If gates remain 0 throughout, the constraint system is not persisting');
  console.log('If gates increase then decrease, they are being cleared on exit');
}

testDirectConstraintSystem().catch(console.error);