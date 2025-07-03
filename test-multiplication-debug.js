#!/usr/bin/env node

/**
 * DEBUG: Multiplication constraint issue in Sparky
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

// Patch to capture the actual error
const originalRunAndCheck = Provable.runAndCheck;
Provable.runAndCheck = async function(f) {
  try {
    return await originalRunAndCheck.call(this, f);
  } catch (error) {
    console.log('🔍 FULL ERROR OBJECT:', error);
    console.log('🔍 ERROR TYPE:', typeof error);
    console.log('🔍 ERROR STRING:', String(error));
    console.log('🔍 ERROR KEYS:', Object.keys(error || {}));
    throw error;
  }
};

async function testMultiplicationDebug() {
  console.log('🔬 MULTIPLICATION DEBUG');
  console.log('=======================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Test 1: Minimal multiplication
  console.log('\n📊 TEST 1: Minimal multiplication (3 * 4 = 12)');
  console.log('----------------------------------------------');
  
  try {
    await Provable.runAndCheck(() => {
      console.log('🔍 Creating witness a = 3...');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('🔍 Created a');
      
      console.log('🔍 Creating witness b = 4...');
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('🔍 Created b');
      
      console.log('🔍 Computing c = a.mul(b)...');
      const c = a.mul(b);
      console.log('🔍 Computed c');
      
      console.log('🔍 Asserting c.assertEquals(12)...');
      c.assertEquals(Field.from(12));
      console.log('🔍 Assertion completed');
    });
    
    console.log('✅ Multiplication constraint passed');
  } catch (error) {
    console.log('❌ Multiplication constraint failed');
  }
  
  // Test 2: Check constraint generation in constraint mode
  console.log('\n📊 TEST 2: Constraint generation for multiplication');
  console.log('--------------------------------------------------');
  
  const csHandle = Snarky.run.enterConstraintSystem();
  
  console.log('🔍 Creating constant fields...');
  const a = Field.from(3);
  const b = Field.from(4);
  
  console.log('🔍 Computing c = a.mul(b) in constraint mode...');
  const c = a.mul(b);
  
  console.log('🔍 Adding c.assertEquals(12) constraint...');
  c.assertEquals(Field.from(12));
  
  const cs = csHandle();
  console.log('🔍 Constraint system gates:', cs.gates ? cs.gates.length : 'N/A');
  
  // Test 3: Direct assertMul
  console.log('\n📊 TEST 3: Direct assertMul constraint');
  console.log('--------------------------------------');
  
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = Provable.witness(Field, () => Field.from(12));
      
      console.log('🔍 Calling Snarky.field.assertMul directly...');
      // Convert to FieldVar format
      const aVar = a.value;
      const bVar = b.value;
      const cVar = c.value;
      
      Snarky.field.assertMul(aVar, bVar, cVar);
      console.log('🔍 Direct assertMul completed');
    });
    
    console.log('✅ Direct assertMul passed');
  } catch (error) {
    console.log('❌ Direct assertMul failed');
  }
}

testMultiplicationDebug().catch(console.error);