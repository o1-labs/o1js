#!/usr/bin/env node

/**
 * Debug Union-Find Variable Substitution
 * 
 * This test verifies if Union-Find is incorrectly substituting variables
 * or adding constant terms where they shouldn't be.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugUnionFind() {
  console.log('🔍 Debugging Union-Find Variable Substitution');
  console.log('==============================================');
  
  // Switch to Sparky to see the debug output
  if (getCurrentBackend() !== 'sparky') {
    await switchBackend('sparky');
  }
  
  console.log('\n🧪 Test 1: Simple variable creation (no operations)');
  
  await Provable.runAndCheck(() => {
    console.log('Creating witness variable a = 3');
    const a = Provable.witness(Field, () => Field(3));
    console.log('a =', a);
    
    console.log('Asserting a equals 3 (should be simple)');
    a.assertEquals(Field(3));
    console.log('✅ Test 1 completed\n');
  });
  
  console.log('🧪 Test 2: Multiplication without Union-Find interference');
  
  await Provable.runAndCheck(() => {
    console.log('Creating a = 3, b = 1 (b is constant 1)');
    const a = Provable.witness(Field, () => Field(3));
    const b = Field(1); // This is a constant, not a witness
    
    console.log('Computing a.mul(b) (should be just scaling)');
    const result = a.mul(b);
    console.log('result =', result);
    
    console.log('Asserting result equals 3');
    result.assertEquals(Field(3));
    console.log('✅ Test 2 completed\n');
  });
  
  console.log('🧪 Test 3: Two witness variables multiplication');
  
  await Provable.runAndCheck(() => {
    console.log('Creating a = 3, b = 4 (both witnesses)');
    const a = Provable.witness(Field, () => Field(3));
    const b = Provable.witness(Field, () => Field(4));
    
    console.log('Computing a.mul(b)');
    const result = a.mul(b);
    console.log('result =', result);
    
    console.log('Before assertEquals - result representation:');
    console.log('  result =', result);
    
    console.log('Calling result.assertEquals(12)...');
    result.assertEquals(Field(12));
    console.log('✅ Test 3 completed\n');
  });
  
  console.log('🧪 Test 4: Multiple operations to see Union-Find pattern');
  
  await Provable.runAndCheck(() => {
    console.log('Creating multiple variables');
    const a = Provable.witness(Field, () => Field(2));
    const b = Provable.witness(Field, () => Field(3));
    const c = Provable.witness(Field, () => Field(6));
    
    console.log('Computing a.mul(b)');
    const result1 = a.mul(b);
    
    console.log('Asserting result1 equals c');
    result1.assertEquals(c);
    
    console.log('Now asserting c equals 6');
    c.assertEquals(Field(6));
    console.log('✅ Test 4 completed\n');
  });
  
  console.log('🔍 Analysis:');
  console.log('=============');
  console.log('Check the debug output to see:');
  console.log('1. When do we see Add(Var, Constant) expressions?');
  console.log('2. Are Union-Find messages related to the issue?');
  console.log('3. Is the issue in multiplication or in assertEquals?');
}

// Run the debug
debugUnionFind().catch(console.error);