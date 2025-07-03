#!/usr/bin/env node

/**
 * 🔬 COMPUTE FUNCTION DEBUG TEST
 * 
 * This test checks what the compute function is actually returning
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testComputeFunctionDebug() {
  console.log('🔬 COMPUTE FUNCTION DEBUG');
  console.log('=========================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  console.log('\n📊 TEST: Check compute function return value');
  console.log('-------------------------------------------');
  
  try {
    const result = await Provable.runAndCheck(() => {
      console.log('🔍 About to call Provable.witness...');
      
      const witness = Provable.witness(Field, () => {
        const field42 = Field.from(42);
        console.log('🔍 Created Field.from(42):', typeof field42, field42.constructor.name);
        console.log('🔍 Field.from(42).toString():', field42.toString());
        console.log('🔍 Field.from(42).toBigInt():', field42.toBigInt());
        console.log('🔍 typeof field42.toBigInt():', typeof field42.toBigInt());
        
        // Test what gets returned
        console.log('🔍 Returning field42 from compute function...');
        return field42;
      });
      
      console.log('🔍 Provable.witness completed');
      return witness;
    });
    
    console.log('✅ Compute function test completed');
    
  } catch (error) {
    console.log('❌ Compute function test failed:', error.message);
  }
}

testComputeFunctionDebug().catch(console.error);