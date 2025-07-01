#!/usr/bin/env node

/**
 * Debug variable format test
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';

async function debugVariables(backendName) {
  console.log(`\n🔍 ${backendName} Variable Format:`);
  
  if (backendName === 'sparky') {
    await switchBackend('sparky');
  } else {
    await initializeBindings('snarky');
  }
  
  try {
    // Enter constraint system mode
    const finishCS = Snarky.run.enterConstraintSystem();
    
    // Create a witness variable
    const x = Snarky.run.existsOne(() => 42n);
    console.log('  Variable x:', x);
    console.log('  Type:', typeof x);
    console.log('  Is Array:', Array.isArray(x));
    console.log('  JSON:', JSON.stringify(x));
    
    // Try exists with multiple values
    const vars = Snarky.run.exists(3, () => [1n, 2n, 3n]);
    console.log('  Multiple vars:', vars);
    console.log('  Type:', typeof vars);
    console.log('  Is Array:', Array.isArray(vars));
    console.log('  JSON:', JSON.stringify(vars));
    
    // Exit
    if (backendName === 'sparky') {
      const cs = Snarky.run.getConstraintSystem();
      finishCS();
    } else {
      finishCS();
    }
    
  } catch (e) {
    console.error('  Error:', e.message);
  }
}

async function main() {
  console.log('🔬 Variable Format Debug Test');
  
  await debugVariables('snarky');
  await debugVariables('sparky');
}

main().catch(console.error);