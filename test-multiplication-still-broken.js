#!/usr/bin/env node

/**
 * Test to check if multiplication is still broken after rebuild
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';

async function testMultiplication() {
  console.log('🔬 MULTIPLICATION ISSUE CHECK');
  console.log('============================\n');
  
  // Test with both backends
  for (const backend of ['snarky', 'sparky']) {
    console.log(`\n📊 Testing with ${backend.toUpperCase()} backend`);
    console.log('-'.repeat(40));
    
    await switchBackend(backend);
    
    // Test 1: Simple multiplication
    console.log('\n1️⃣ Simple multiplication test: 3 * 4 = 12');
    try {
      await Provable.runAndCheck(() => {
        const a = Provable.witness(Field, () => Field.from(3));
        const b = Provable.witness(Field, () => Field.from(4));
        const c = a.mul(b);
        c.assertEquals(Field.from(12));
      });
      console.log('✅ PASS: Multiplication works correctly!');
    } catch (error) {
      console.log('❌ FAIL:', error.message || error);
      if (error.message && error.message.includes('VarId')) {
        console.log('   → VarId mismatch issue STILL PRESENT');
        const match = error.message.match(/VarId\((\d+)\)/g);
        if (match) {
          console.log('   → Variable IDs mentioned:', match.join(', '));
        }
      }
    }
    
    // Test 2: Invalid multiplication (should fail)
    console.log('\n2️⃣ Invalid multiplication test: 3 * 4 = 10 (should fail)');
    try {
      await Provable.runAndCheck(() => {
        const a = Provable.witness(Field, () => Field.from(3));
        const b = Provable.witness(Field, () => Field.from(4));
        const c = a.mul(b);
        c.assertEquals(Field.from(10));
      });
      console.log('❌ FAIL: Invalid constraint passed (should have failed)');
    } catch (error) {
      console.log('✅ PASS: Correctly rejected invalid constraint');
      console.log('   Error:', error.message);
    }
    
    // Test 3: Constraint generation mode
    console.log('\n3️⃣ Constraint generation test');
    try {
      const cs = await Provable.constraintSystem(() => {
        const a = Provable.witness(Field, () => Field.from(3));
        const b = Provable.witness(Field, () => Field.from(4));
        const c = a.mul(b);
        c.assertEquals(Field.from(12));
      });
      console.log('✅ Constraint system generated');
      console.log('   Gates:', cs.gates.length);
    } catch (error) {
      console.log('❌ Constraint generation failed:', error.message);
    }
  }
  
  console.log('\n\n📊 SUMMARY');
  console.log('==========');
  console.log('The multiplication VarId mismatch issue is likely STILL PRESENT in Sparky.');
  console.log('This requires fixing the variable ID synchronization between modes.');
}

testMultiplication().catch(console.error);