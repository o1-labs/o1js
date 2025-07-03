#!/usr/bin/env node

/**
 * 🔬 DEBUG: enterAsProver Witness Creation Bug Investigation
 * 
 * This test isolates the specific bug in enterAsProver where witness values
 * are not being properly stored, leading to empty witness maps.
 */

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testEnterAsProverBug() {
  console.log('🔬 DEBUGGING: enterAsProver Witness Creation Bug');
  console.log('==============================================');
  
  // Switch to Sparky to test the bug
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Test 1: Direct existsOne call with compute function
  console.log('\n📊 TEST 1: Direct existsOne call');
  console.log('--------------------------------');
  
  try {
    console.log('Calling Field.from(42) to create a witness variable...');
    const field = Field.from(42);
    console.log('✓ Field.from(42) succeeded:', field.toString());
  } catch (error) {
    console.log('❌ Field.from(42) failed:', error);
  }
  
  // Test 2: Check if we can create a simple constraint
  console.log('\n📊 TEST 2: Simple constraint creation');
  console.log('------------------------------------');
  
  try {
    console.log('Creating Field(3) and Field(4)...');
    const a = Field.from(3);
    const b = Field.from(4);
    console.log('✓ Created a =', a.toString(), 'b =', b.toString());
    
    console.log('Attempting multiplication a.mul(b)...');
    const result = a.mul(b);
    console.log('✓ Multiplication succeeded, result =', result.toString());
    
    console.log('Attempting assertEquals(result, 12)...');
    result.assertEquals(Field.from(12));
    console.log('✓ assertEquals succeeded');
    
  } catch (error) {
    console.log('❌ Constraint creation failed:', error);
  }
  
  // Test 3: Manual runAndCheck to see what happens
  console.log('\n📊 TEST 3: Manual runAndCheck');
  console.log('-----------------------------');
  
  try {
    // Import the WASM module directly to access debug functions
    const { switchBackend: _, getCurrentBackend: __, ...wasm } = await import('./dist/node/index.js');
    
    console.log('Attempting to access WASM functions...');
    // Check if we can access the underlying WASM module for debugging
    
  } catch (error) {
    console.log('❌ WASM access failed:', error);
  }
  
  console.log('\n🎯 ANALYSIS COMPLETE');
  console.log('===================');
  console.log('Check the debug logs above for:');
  console.log('1. "exists_impl called with compute function: false" ← Main bug indicator');
  console.log('2. "Original witness size: 0" ← Witness storage bug indicator');
  console.log('3. Any constraint satisfaction failures');
}

testEnterAsProverBug().catch(console.error);