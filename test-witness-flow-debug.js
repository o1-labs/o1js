#!/usr/bin/env node

/**
 * DEBUG: Witness flow to isolate double-call in Provable.witness
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';

// Global counter to track witness creation
let witnessCreationCount = 0;

// Patch Field.from to track when witness values are created
const originalFieldFrom = Field.from;
Field.from = function(...args) {
  console.log(`🔍 [PATCH] Field.from called with:`, args);
  return originalFieldFrom.apply(this, args);
};

async function testWitnessFlowDebug() {
  console.log('🔬 WITNESS FLOW DEBUG');
  console.log('=====================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  console.log('\n📊 TEST: Minimal Provable.witness call');
  console.log('---------------------------------------');
  
  try {
    console.log('🔍 Starting runAndCheck...');
    
    await Provable.runAndCheck(() => {
      console.log('🔍 Inside runAndCheck');
      
      console.log('🔍 [1] Calling Provable.witness(Field, ...)');
      
      const witness = Provable.witness(Field, () => {
        console.log('🔍 [2] Inside compute function');
        console.log('🔍 [3] Creating Field.from(42)');
        const field = Field.from(42);
        console.log('🔍 [4] Field created:', field);
        console.log('🔍 [5] Field.value:', field.value);
        console.log('🔍 [6] Returning field from compute');
        return field;
      });
      
      console.log('🔍 [7] Provable.witness returned:', witness);
      console.log('🔍 [8] witness.value:', witness.value);
      
      return witness;
    });
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

testWitnessFlowDebug().catch(console.error);