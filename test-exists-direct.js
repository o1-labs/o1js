#!/usr/bin/env node

/**
 * TEST: Direct exists() function call to isolate double-call issue
 */

import { switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testExistsDirect() {
  console.log('🔬 DIRECT EXISTS TEST');
  console.log('====================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  console.log('\n📊 TEST 1: Direct existsOne call');
  console.log('--------------------------------');
  
  try {
    // Enter prover mode first
    const enterHandle = Snarky.run.enterGenerateWitness();
    
    console.log('🔍 Calling existsOne with compute function...');
    let callCount = 0;
    const witnessVar = Snarky.run.existsOne(() => {
      callCount++;
      console.log(`🔍 Compute function called (call #${callCount})`);
      console.log('🔍 Returning BigInt 42n');
      return 42n;
    });
    
    console.log('🔍 existsOne returned:', witnessVar);
    console.log(`🔍 Total compute function calls: ${callCount}`);
    
    // Exit prover mode
    enterHandle();
    
    if (callCount === 1) {
      console.log('✅ Success: Compute function called exactly once');
    } else {
      console.log(`❌ Error: Compute function called ${callCount} times instead of 1`);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
  
  console.log('\n📊 TEST 2: Direct exists(1) call');
  console.log('--------------------------------');
  
  try {
    // Enter prover mode first
    const enterHandle = Snarky.run.enterGenerateWitness();
    
    console.log('🔍 Calling exists(1) with compute function...');
    let callCount = 0;
    const witnessArray = Snarky.run.exists(1, () => {
      callCount++;
      console.log(`🔍 Compute function called (call #${callCount})`);
      console.log('🔍 Returning [42n]');
      return [42n];
    });
    
    console.log('🔍 exists(1) returned array length:', witnessArray.length);
    console.log(`🔍 Total compute function calls: ${callCount}`);
    
    // Exit prover mode
    enterHandle();
    
    if (callCount === 1) {
      console.log('✅ Success: Compute function called exactly once');
    } else {
      console.log(`❌ Error: Compute function called ${callCount} times instead of 1`);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testExistsDirect().catch(console.error);