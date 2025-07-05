// Debug inProver() function to understand mode detection
// Created: July 4, 2025 1:00 AM UTC
// Last Modified: July 4, 2025 1:00 AM UTC

import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugInProver() {
  console.log('=== Debug inProver() Mode Detection ===');
  
  await switchBackend('sparky');
  console.log('Backend:', getCurrentBackend());
  
  // Access the Sparky adapter through global snarky
  const snarky = globalThis.__snarky?.Snarky;
  if (!snarky) {
    console.log('❌ Snarky not available');
    return;
  }
  
  console.log('\n1. Testing inProver() in different contexts:');
  
  // Test 1: Default state
  console.log('  Default state:');
  console.log('    inProver():', snarky.run.inProver());
  console.log('    inProverBlock():', snarky.run.inProverBlock());
  
  // Test 2: Inside constraint system
  console.log('\n  Inside constraint system:');
  const finishConstraintSystem = snarky.run.enterConstraintSystem();
  console.log('    inProver():', snarky.run.inProver());
  console.log('    inProverBlock():', snarky.run.inProverBlock());
  finishConstraintSystem();
  
  // Test 3: Inside asProver block
  console.log('\n  Inside asProver block:');
  snarky.run.asProver(() => {
    console.log('    inProver():', snarky.run.inProver());
    console.log('    inProverBlock():', snarky.run.inProverBlock());
  });
  
  // Test 4: Inside enterAsProver block
  console.log('\n  Inside enterAsProver block:');
  const finishAsProver = snarky.run.enterAsProver(1);
  console.log('    inProver():', snarky.run.inProver());
  console.log('    inProverBlock():', snarky.run.inProverBlock());
  finishAsProver();
  
  console.log('\n2. Testing actual comparison in each context:');
  
  // Test the same lessThan call we're having issues with
  const { Field } = await import('./dist/node/index.js');
  
  try {
    console.log('\n  Simple lessThan call:');
    const a = Field(5);
    const b = Field(10);
    console.log('    Before lessThan - inProver():', snarky.run.inProver());
    const result = a.lessThan(b);
    console.log('    After lessThan - inProver():', snarky.run.inProver());
    console.log('    Result:', result);
    console.log('    Result type:', typeof result);
  } catch (error) {
    console.log('    Error:', error.message);
  }
}

debugInProver().catch(console.error);