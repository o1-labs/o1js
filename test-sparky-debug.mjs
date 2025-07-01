#!/usr/bin/env node

/**
 * Debug why Sparky isn't recording constraints
 */

import { Snarky, initializeBindings, switchBackend } from './dist/node/bindings.js';

async function debugSparky() {
  console.log('🔍 Sparky Constraint Recording Debug\n');
  
  await switchBackend('sparky');
  
  console.log('Step 1: Enter constraint system mode');
  const finishCS = Snarky.run.enterConstraintSystem();
  
  console.log('\nStep 2: Check initial state');
  let cs = Snarky.run.getConstraintSystem();
  console.log('  Initial rows:', Snarky.constraintSystem.rows(cs));
  console.log('  Initial gates:', Snarky.constraintSystem.toJson(cs).gates.length);
  
  console.log('\nStep 3: Create witness variables');
  const x = Snarky.run.existsOne(() => 3n);
  const y = Snarky.run.existsOne(() => 5n);
  console.log('  x =', JSON.stringify(x));
  console.log('  y =', JSON.stringify(y));
  
  console.log('\nStep 4: Add generic gate');
  try {
    // Try with field element format for coefficients
    const one = [0, 1n];
    const zero = [0, 0n];
    const negEight = [0, -8n];
    
    console.log('  Calling gates.generic...');
    Snarky.gates.generic(
      one, x,      // 1*x
      one, y,      // 1*y  
      zero, x,     // 0*x (dummy)
      zero,        // 0 (no multiplication)
      negEight     // -8
    );
    console.log('  ✅ Gate added successfully');
  } catch (e) {
    console.error('  ❌ Error adding gate:', e.message);
  }
  
  console.log('\nStep 5: Check state after adding gate');
  cs = Snarky.run.getConstraintSystem();
  const afterRows = Snarky.constraintSystem.rows(cs);
  const afterJson = Snarky.constraintSystem.toJson(cs);
  console.log('  Rows after:', afterRows);
  console.log('  Gates after:', afterJson.gates.length);
  
  if (afterJson.gates.length > 0) {
    console.log('  First gate:', JSON.stringify(afterJson.gates[0], null, 2));
  }
  
  console.log('\nStep 6: Try different gate types');
  
  // Try zero gate
  try {
    console.log('  Trying zero gate...');
    Snarky.gates.zero(x, y, x);
    cs = Snarky.run.getConstraintSystem();
    console.log('    Gates now:', Snarky.constraintSystem.toJson(cs).gates.length);
  } catch (e) {
    console.error('    Error:', e.message);
  }
  
  // Try poseidon gate
  try {
    console.log('  Trying poseidon gate...');
    const state = [x, y, x];
    Snarky.gates.poseidon(state);
    cs = Snarky.run.getConstraintSystem();
    console.log('    Gates now:', Snarky.constraintSystem.toJson(cs).gates.length);
  } catch (e) {
    console.error('    Error:', e.message);
  }
  
  console.log('\nStep 7: Exit constraint system mode');
  finishCS();
  
  console.log('\nStep 8: Final state');
  const finalJson = Snarky.constraintSystem.toJson(cs);
  const finalDigest = Snarky.constraintSystem.digest(cs);
  console.log('  Final rows:', Snarky.constraintSystem.rows(cs));
  console.log('  Final gates:', finalJson.gates.length);
  console.log('  Final digest:', finalDigest);
  console.log('  Final JSON:', JSON.stringify(finalJson, null, 2));
}

// Also test Snarky for comparison
async function debugSnarky() {
  console.log('\n\n🔍 Snarky Constraint Recording (for comparison)\n');
  
  await switchBackend('snarky');
  
  console.log('Step 1: Enter constraint system mode');
  const finishCS = Snarky.run.enterConstraintSystem();
  
  console.log('\nStep 2: Create witness variables');
  const x = Snarky.run.existsOne(() => 3n);
  const y = Snarky.run.existsOne(() => 5n);
  console.log('  x =', JSON.stringify(x));
  console.log('  y =', JSON.stringify(y));
  
  console.log('\nStep 3: Add generic gate');
  try {
    // Try with same format as Sparky
    const one = [0, 1n];
    const zero = [0, 0n];
    const negEight = [0, -8n];
    
    console.log('  Calling gates.generic...');
    Snarky.gates.generic(
      one, x,
      one, y,
      zero, x,
      zero,
      negEight
    );
    console.log('  ✅ Gate added successfully');
  } catch (e) {
    console.error('  ❌ Error:', e.message);
  }
  
  console.log('\nStep 4: Get final constraint system');
  const cs = finishCS();
  const finalJson = Snarky.constraintSystem.toJson(cs);
  console.log('  Final rows:', Snarky.constraintSystem.rows(cs));
  console.log('  Final gates:', finalJson.gates.length);
  console.log('  Final digest:', Snarky.constraintSystem.digest(cs));
  
  if (finalJson.gates.length > 0) {
    console.log('  First gate:', JSON.stringify(finalJson.gates[0], null, 2));
  }
}

async function main() {
  await debugSparky();
  await debugSnarky();
}

main().catch(console.error);