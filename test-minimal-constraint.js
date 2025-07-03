#!/usr/bin/env node

/**
 * MINIMAL TEST: What happens with zero constraints?
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testMinimalConstraint() {
  console.log('🔬 MINIMAL CONSTRAINT TEST');
  console.log('==========================');
  
  // Test 1: Empty circuit (should always pass)
  console.log('\n📊 TEST 1: Empty circuit (zero constraints)');
  console.log('-------------------------------------------');
  
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n🔍 Testing ${backend}:`);
    
    try {
      await Provable.runAndCheck(() => {
        // Do nothing - empty circuit
        console.log('  Empty circuit executed');
      });
      console.log('  ✅ Empty circuit passed (as expected)');
    } catch (error) {
      console.log('  ❌ Empty circuit failed:', error.message);
    }
  }
  
  // Test 2: Just witness creation (no constraints)
  console.log('\n📊 TEST 2: Witness creation only (no constraints)');
  console.log('-------------------------------------------------');
  
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n🔍 Testing ${backend}:`);
    
    try {
      const result = await Provable.runAndCheck(() => {
        const a = Provable.witness(Field, () => Field.from(42));
        console.log('  Created witness:', a.toString());
        return a;
      });
      console.log('  ✅ Witness creation passed');
      console.log('  Result:', result.toString());
    } catch (error) {
      console.log('  ❌ Witness creation failed:', error.message);
    }
  }
  
  // Test 3: Single assertEqual constraint
  console.log('\n📊 TEST 3: Single assertEqual constraint');
  console.log('----------------------------------------');
  
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n🔍 Testing ${backend}:`);
    
    try {
      await Provable.runAndCheck(() => {
        const a = Provable.witness(Field, () => Field.from(42));
        a.assertEquals(Field.from(42));
        console.log('  assertEqual executed');
      });
      console.log('  ✅ assertEqual passed');
    } catch (error) {
      console.log('  ❌ assertEqual failed:', error.message);
    }
  }
  
  // Test 4: Check constraint system in constraint mode
  console.log('\n📊 TEST 4: Constraint system generation');
  console.log('---------------------------------------');
  
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\n🔍 Testing ${backend}:`);
    
    const csHandle = Snarky.run.enterConstraintSystem();
    
    // Add a simple constraint
    const a = Field.from(3);
    const b = Field.from(4);
    a.assertEquals(b.sub(1)); // 3 = 4 - 1
    
    const cs = csHandle();
    console.log('  Constraint system gates:', cs.gates ? cs.gates.length : 'N/A');
  }
}

testMinimalConstraint().catch(console.error);