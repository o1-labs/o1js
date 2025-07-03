#!/usr/bin/env node

/**
 * 🔬 EXISTS FUNCTION VERIFICATION TEST
 * 
 * This test verifies if our fixed exists() function is actually being called
 * and if the array processing logic is working.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testExistsVerification() {
  console.log('🔬 EXISTS FUNCTION VERIFICATION');
  console.log('==============================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  console.log('\n📊 TEST: Direct exists call verification');
  console.log('---------------------------------------');
  
  try {
    // Test the exists code path directly through Provable.witness
    // This should trigger our fixed exists() function
    const result = await Provable.runAndCheck(() => {
      console.log('🔍 About to call Provable.witness...');
      
      // This should call exists(1, compute_fn) internally
      const a = Provable.witness(Field, () => {
        console.log('🔍 Inside compute function - should return Field(42)');
        return Field.from(42);
      });
      
      console.log('🔍 Provable.witness completed');
      
      // Create another witness to test array behavior
      const b = Provable.witness(Field, () => {
        console.log('🔍 Inside second compute function - should return Field(7)');
        return Field.from(7);
      });
      
      console.log('🔍 Both witnesses created');
      
      return { a, b };
    });
    
    console.log('✅ Direct exists test completed');
    console.log('Result:', result);
    
  } catch (error) {
    console.log('❌ Direct exists test failed');
    console.log('Error:', error?.message || error);
    
    // Check if it's a specific error we can diagnose
    if (error?.message?.includes('array')) {
      console.log('🔍 DIAGNOSIS: Array handling error detected');
    } else if (error?.message?.includes('compute')) {
      console.log('🔍 DIAGNOSIS: Compute function error detected');
    } else if (error?.message?.includes('exists')) {
      console.log('🔍 DIAGNOSIS: exists function error detected');
    }
  }
  
  console.log('\n📊 TEST: Check if WASM functions are available');
  console.log('--------------------------------------------');
  
  try {
    // Try to access the WASM module directly to see what's available
    const { Snarky } = await import('./dist/node/bindings.js');
    
    console.log('Snarky object available:', !!Snarky);
    console.log('Snarky.run available:', !!Snarky?.run);
    console.log('Snarky.run.exists available:', !!Snarky?.run?.exists);
    console.log('Snarky.run.existsOne available:', !!Snarky?.run?.existsOne);
    
    if (Snarky?.run?.exists) {
      console.log('✅ exists function is available in Snarky.run');
    } else {
      console.log('❌ exists function NOT available in Snarky.run');
    }
    
  } catch (error) {
    console.log('❌ Failed to access WASM functions:', error?.message);
  }
  
  console.log('\n🎯 EXISTS VERIFICATION COMPLETE');
  console.log('===============================');
}

testExistsVerification().catch(console.error);