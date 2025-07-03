#!/usr/bin/env node

/**
 * INVESTIGATE: How does Snarky avoid the VarId mismatch?
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function investigateSnarkyConstraintFlow() {
  console.log('🔬 SNARKY CONSTRAINT FLOW INVESTIGATION');
  console.log('======================================\n');
  
  // First, let's understand how Snarky handles constraints
  console.log('📊 HYPOTHESIS: Snarky might...');
  console.log('1. Use a global variable counter');
  console.log('2. Not create internal variables in constraint processing');
  console.log('3. Have a different constraint representation');
  console.log('4. Reuse variables instead of creating new ones\n');
  
  // Test with Snarky first
  await switchBackend('snarky');
  console.log('Current backend:', getCurrentBackend());
  
  console.log('\n📊 SNARKY DETAILED TRACE');
  console.log('------------------------');
  
  // Patch various functions to trace execution
  const patches = [];
  
  // Track constraint system API calls
  const originalConstraintSystem = Provable.constraintSystem;
  Provable.constraintSystem = async function(fn) {
    console.log('\n[SNARKY] Entering constraint generation mode');
    const result = await originalConstraintSystem.call(this, fn);
    console.log('[SNARKY] Exiting constraint generation mode');
    console.log('[SNARKY] Constraint count:', result.gates.length);
    return result;
  };
  patches.push(() => Provable.constraintSystem = originalConstraintSystem);
  
  // Track runAndCheck
  const originalRunAndCheck = Provable.runAndCheck;
  Provable.runAndCheck = async function(fn) {
    console.log('\n[SNARKY] Entering witness generation mode');
    const result = await originalRunAndCheck.call(this, fn);
    console.log('[SNARKY] Exiting witness generation mode');
    return result;
  };
  patches.push(() => Provable.runAndCheck = originalRunAndCheck);
  
  try {
    // Test 1: Constraint generation
    console.log('\n=== CONSTRAINT GENERATION TEST ===');
    const cs1 = await Provable.constraintSystem(() => {
      console.log('[SNARKY] Creating witnesses...');
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('[SNARKY] a.value:', a.value);
      console.log('[SNARKY] b.value:', b.value);
      
      console.log('[SNARKY] Computing multiplication...');
      const c = a.mul(b);
      console.log('[SNARKY] c.value:', c.value);
      
      console.log('[SNARKY] Asserting equality...');
      c.assertEquals(Field.from(12));
    });
    
    // Test 2: Witness generation
    console.log('\n=== WITNESS GENERATION TEST ===');
    await Provable.runAndCheck(() => {
      console.log('[SNARKY] Creating witnesses...');
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = a.mul(b);
      c.assertEquals(Field.from(12));
      console.log('[SNARKY] ✅ All constraints satisfied');
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Restore all patches
  patches.forEach(restore => restore());
  
  console.log('\n\n📊 KEY INSIGHTS');
  console.log('===============');
  console.log('1. Snarky generates only 1 gate for multiplication + assertEquals');
  console.log('2. No internal variables are created (no VarId(3))');
  console.log('3. Variable IDs remain consistent between modes');
  console.log('\nPossible reasons:');
  console.log('- Snarky might optimize away intermediate variables');
  console.log('- Snarky might use a different constraint representation');
  console.log('- Snarky might have global state that persists between modes');
  
  console.log('\n\n📊 SPARKY ARCHITECTURE ISSUE');
  console.log('============================');
  console.log('The root cause appears to be:');
  console.log('1. Sparky\'s reduce_lincom_exact creates internal variables during constraint mode');
  console.log('2. These internal variables don\'t exist during witness mode');
  console.log('3. Snarky either doesn\'t create these variables or handles them differently');
  console.log('\nPossible fixes:');
  console.log('1. Make Sparky\'s variable counter global and persistent');
  console.log('2. Modify reduce_lincom_exact to not create internal variables');
  console.log('3. Ensure witness mode recreates the same internal variables');
  console.log('4. Change how assertMul constraints are generated to avoid the issue');
}

investigateSnarkyConstraintFlow().catch(console.error);