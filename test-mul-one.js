#!/usr/bin/env node

/**
 * Test x.mul(1) Optimization
 * 
 * This test checks if x.mul(1) correctly returns x without creating
 * unnecessary witnesses or Add expressions.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testMulOneOptimization() {
  console.log('🧪 Testing x.mul(1) Optimization');
  console.log('================================');
  
  // Switch to Sparky to see debug output
  if (getCurrentBackend() !== 'sparky') {
    await switchBackend('sparky');
  }
  
  console.log('\n1. Testing x.mul(1) where x is a witness variable:');
  
  await Provable.runAndCheck(() => {
    console.log('Creating witness x = 5');
    const x = Provable.witness(Field, () => Field(5));
    console.log('x =', x);
    console.log('x.value =', x.value);
    
    console.log('\nComputing x.mul(1):');
    const result = x.mul(1);
    console.log('result =', result);
    console.log('result.value =', result.value);
    
    console.log('\nChecking if result === x (should be true for optimization):');
    console.log('Same object?', result === x);
    console.log('Same value?', JSON.stringify(result.value) === JSON.stringify(x.value));
    
    console.log('\nCalling result.assertEquals(5):');
    result.assertEquals(Field(5));
    
    console.log('✅ Test completed');
  });
  
  console.log('\n2. Testing x.mul(Field(1)) - explicit Field(1):');
  
  await Provable.runAndCheck(() => {
    const x = Provable.witness(Field, () => Field(7));
    console.log('x =', x);
    
    const one = Field(1);
    console.log('Field(1) =', one);
    console.log('Field(1).isConstant() =', one.isConstant());
    
    const result = x.mul(one);
    console.log('x.mul(Field(1)) =', result);
    
    result.assertEquals(Field(7));
    console.log('✅ Test completed');
  });
  
  console.log('\n🔍 Analysis:');
  console.log('=============');
  console.log('If x.mul(1) creates Add expressions instead of returning x,');
  console.log('this indicates a missing optimization in Field.mul()');
}

// Run the test
testMulOneOptimization().catch(console.error);