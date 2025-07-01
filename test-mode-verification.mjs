#!/usr/bin/env node

/**
 * Verify we're actually in constraint generation mode
 */

import { Field, Provable } from './dist/node/index.js';
import { Snarky, switchBackend, initializeBindings } from './dist/node/bindings.js';

async function testConstraintMode() {
  console.log('🔍 Testing Constraint Generation Mode');
  console.log('=====================================\n');

  // Test with Snarky first
  console.log('📊 Testing Snarky:');
  await initializeBindings('snarky');
  
  console.log('  1. Entering constraint system...');
  const cs1 = Snarky.run.enterConstraintSystem();
  
  console.log('  2. Creating witness...');
  const x1 = Provable.witness(Field, () => {
    console.log('    🚨 WITNESS FUNCTION CALLED - we might be in witness mode!');
    return Field(5);
  });
  
  console.log('  3. Adding constraint x = 5...');
  x1.assertEquals(Field(5));
  
  console.log('  4. Getting constraint system...');
  const constraintSystem1 = cs1();
  
  const json1 = Snarky.constraintSystem.toJson(constraintSystem1);
  const rows1 = Snarky.constraintSystem.rows(constraintSystem1);
  console.log(`  ✅ Snarky: ${rows1} rows, ${json1.gates?.length || 0} gates\n`);

  // Test with Sparky  
  console.log('📊 Testing Sparky:');
  await switchBackend('sparky');
  
  console.log('  1. Entering constraint system...');
  const cs2 = Snarky.run.enterConstraintSystem();
  
  console.log('  2. Creating witness...');
  const x2 = Provable.witness(Field, () => {
    console.log('    🚨 WITNESS FUNCTION CALLED - we might be in witness mode!');
    return Field(5);
  });
  
  console.log('  3. Adding constraint x = 5...');
  x2.assertEquals(Field(5));
  
  console.log('  4. Getting constraint system...');
  const constraintSystem2 = cs2();
  
  const json2 = Snarky.constraintSystem.toJson(constraintSystem2);
  const rows2 = Snarky.constraintSystem.rows(constraintSystem2);
  console.log(`  ✅ Sparky: ${rows2} rows, ${json2.gates?.length || 0} gates\n`);

  // Analysis
  console.log('🤔 Analysis:');
  if (rows1 === 0 && rows2 === 0) {
    console.log('  ⚠️  SUSPICIOUS: Both backends show 0 constraints');
    console.log('  💭 This suggests either:');
    console.log('     1. We are in witness mode (witness functions were called)');
    console.log('     2. Constraints are being over-optimized');
    console.log('     3. This is actually correct for trivial constraints');
  } else {
    console.log('  ✅ At least one backend generated constraints');
  }
  
  console.log('\n🔬 Expected behavior:');
  console.log('  - Witness functions should NOT be called in constraint mode');
  console.log('  - x.assertEquals(5) should create constraint x - 5 = 0');
  console.log('  - This should show as 1 row/gate in the constraint system');
}

testConstraintMode().catch(console.error);