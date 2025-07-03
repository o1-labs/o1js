#!/usr/bin/env node

/**
 * DEBUG: Variable allocation mismatch
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testVariableAllocation() {
  console.log('🔬 VARIABLE ALLOCATION DEBUG');
  console.log('============================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  console.log('\n📊 TEST 1: Track variable allocation in constraint mode');
  console.log('-------------------------------------------------------');
  
  try {
    const cs1 = await Provable.constraintSystem(() => {
      console.log('🔍 Creating witness a...');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('- a.value:', a.value);
      
      console.log('🔍 Creating witness b...');
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('- b.value:', b.value);
      
      console.log('🔍 Computing c = a.mul(b)...');
      const c = a.mul(b);
      console.log('- c.value:', c.value);
      
      console.log('🔍 Asserting c.assertEquals(12)...');
      c.assertEquals(Field.from(12));
    });
    
    console.log('\n✅ Constraint system generated');
    console.log('- Total gates:', cs1.gates.length);
    
  } catch (error) {
    console.log('❌ Constraint generation failed:', error.message);
  }
  
  console.log('\n📊 TEST 2: Compare with direct Sparky field.mul');
  console.log('------------------------------------------------');
  
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      
      console.log('\n🔍 Direct Sparky field.mul call:');
      console.log('- a.value:', a.value);
      console.log('- b.value:', b.value);
      
      // Call Sparky's field.mul directly
      const cVar = Snarky.field.mul(a.value, b.value);
      console.log('- Sparky field.mul returned:', cVar);
      
      // Try to use this in assertEquals
      const c = new Field(cVar);
      console.log('- c wrapped as Field:', c);
      console.log('- c.value:', c.value);
      
      c.assertEquals(Field.from(12));
    });
    
    console.log('✅ Direct field.mul test passed');
  } catch (error) {
    console.log('❌ Direct field.mul test failed:', error.message);
  }
  
  console.log('\n📊 TEST 3: Check if the issue is double witness creation');
  console.log('--------------------------------------------------------');
  
  // Patch to track Sparky's internal witness creation
  const originalMul = Snarky.field.mul;
  let sparkyMulCalls = 0;
  
  Snarky.field.mul = function(...args) {
    sparkyMulCalls++;
    console.log(`🔍 [TRACE] Sparky field.mul called (#${sparkyMulCalls})`);
    console.log('- Arguments:', args.map((a, i) => `arg${i}: ${JSON.stringify(a).slice(0, 50)}...`));
    try {
      const result = originalMul.apply(this, args);
      console.log('- Result:', JSON.stringify(result).slice(0, 100) + '...');
      return result;
    } catch (error) {
      console.log('- Error:', error.message || error);
      throw error;
    }
  };
  
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      
      console.log('\n🔍 Calling a.mul(b) with patched Sparky...');
      const c = a.mul(b);
      console.log('- Result c.value:', c.value);
      
      c.assertEquals(Field.from(12));
    });
    
    console.log('✅ Patched test passed');
  } catch (error) {
    console.log('❌ Patched test failed:', error.message);
  }
  
  console.log('\n📊 SUMMARY:');
  console.log(`- Sparky field.mul calls: ${sparkyMulCalls}`);
}

testVariableAllocation().catch(console.error);