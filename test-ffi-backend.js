#!/usr/bin/env node

import { Pickles, initializeBindings } from './dist/node/bindings.js';

console.log('Testing FFI Snarky backend implementation...');

async function testFFIBackend() {
  try {
    // Initialize bindings first
    await initializeBindings();
    const pickles = Pickles;
    
    // Test 1: Check if our new functions are available
    console.log('\n=== Test 1: Check if FFI functions are available ===');
    console.log('createSnarkyJsWrapper:', typeof pickles.createSnarkyJsWrapper);
    console.log('createPicklesWithBackend:', typeof pickles.createPicklesWithBackend);
    console.log('getCurrentPickles:', typeof pickles.getCurrentPickles);
    
    // Test 2: Create the Snarky JS wrapper
    console.log('\n=== Test 2: Create Snarky JS wrapper ===');
    const snarkyWrapper = pickles.createSnarkyJsWrapper();
    console.log('Snarky wrapper created:', !!snarkyWrapper);
    console.log('Wrapper methods:', Object.getOwnPropertyNames(snarkyWrapper));
    
    // Test 3: Test some basic wrapper methods
    console.log('\n=== Test 3: Test wrapper methods ===');
    
    // Test fieldConstantOfInt
    console.log('Testing fieldConstantOfInt...');
    const fieldConst = snarkyWrapper.fieldConstantOfInt(42);
    console.log('Field constant created:', !!fieldConst);
    
    // Test fieldTyp
    console.log('Testing fieldTyp...');
    const fieldTyp = snarkyWrapper.fieldTyp();
    console.log('Field typ created:', !!fieldTyp);
    
    // Test typUnit
    console.log('Testing typUnit...');
    const unitTyp = snarkyWrapper.typUnit();
    console.log('Unit typ created:', !!unitTyp);
    
    // Test 4: Create a Pickles instance with the backend
    console.log('\n=== Test 4: Create Pickles with FFI backend ===');
    const picklesWithBackend = pickles.createPicklesWithBackend(snarkyWrapper);
    console.log('Pickles instance created:', !!picklesWithBackend);
    
    // Test 5: Check current backend
    console.log('\n=== Test 5: Check current backend ===');
    const currentBackend = pickles.getCurrentPickles();
    console.log('Current backend string:', currentBackend);
    
    console.log('\n✅ All FFI backend tests passed!');
    
  } catch (error) {
    console.error('\n❌ FFI backend test failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

testFFIBackend();