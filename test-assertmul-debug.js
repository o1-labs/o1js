#!/usr/bin/env node

/**
 * DEBUG: assertMul internals
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Gates } from './dist/node/lib/provable/gates.js';
import { assertMul } from './dist/node/lib/provable/gadgets/basic.js';

async function testAssertMulDebug() {
  console.log('🔬 ASSERTMUL DEBUG');
  console.log('==================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Patch Gates.generic to see what's being passed
  const originalGeneric = Gates.generic;
  let genericCallCount = 0;
  
  Gates.generic = function(coeffs, vars) {
    genericCallCount++;
    console.log(`\n🔍 [TRACE] Gates.generic call #${genericCallCount}`);
    console.log('🔍 Coefficients:', coeffs);
    console.log('🔍 Variables:', vars);
    console.log('- vars.left:', vars.left);
    console.log('- vars.right:', vars.right);
    console.log('- vars.out:', vars.out);
    
    try {
      return originalGeneric.call(this, coeffs, vars);
    } catch (error) {
      console.log('❌ Gates.generic error:', error);
      throw error;
    }
  };
  
  console.log('\n📊 TEST 1: Simple assertMul');
  console.log('----------------------------');
  
  try {
    await Provable.runAndCheck(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = Provable.witness(Field, () => Field.from(12));
      
      console.log('\n🔍 Variables before assertMul:');
      console.log('- a.value:', a.value);
      console.log('- b.value:', b.value);
      console.log('- c.value:', c.value);
      
      console.log('\n🔍 Calling assertMul(a, b, c)...');
      assertMul(a, b, c);
      console.log('✅ assertMul completed');
    });
  } catch (error) {
    console.log('❌ Test failed:', error.message || error);
  }
  
  console.log('\n📊 TEST 2: Check constraint mode');
  console.log('--------------------------------');
  
  // Reset counter
  genericCallCount = 0;
  
  try {
    const cs = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = a.mul(b);
      c.assertEquals(Field.from(12));
    });
    
    console.log('✅ Constraint system generated');
    console.log('- Gates:', cs.gates ? cs.gates.length : 'N/A');
    console.log('- Generic calls during constraint generation:', genericCallCount);
  } catch (error) {
    console.log('❌ Constraint generation failed:', error.message);
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('- Total Gates.generic calls:', genericCallCount);
}

testAssertMulDebug().catch(console.error);