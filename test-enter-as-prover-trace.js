#!/usr/bin/env node

/**
 * TRACE: enterAsProver flow to find double-call source
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function testEnterAsProverTrace() {
  console.log('🔬 ENTER_AS_PROVER TRACE');
  console.log('========================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Monkey-patch enterAsProver to trace calls
  const originalEnterAsProver = Snarky.run.enterAsProver;
  let enterAsProverCallCount = 0;
  let finishCallCount = 0;
  
  Snarky.run.enterAsProver = function(size) {
    enterAsProverCallCount++;
    console.log(`🔍 [TRACE] enterAsProver called (#${enterAsProverCallCount}) with size: ${size}`);
    
    const finishFunc = originalEnterAsProver.call(this, size);
    
    // Wrap the finish function to trace its calls
    return function(values) {
      finishCallCount++;
      console.log(`🔍 [TRACE] finish function called (#${finishCallCount}) with values:`, values);
      
      const result = finishFunc.call(this, values);
      console.log(`🔍 [TRACE] finish function returned:`, result);
      
      return result;
    };
  };
  
  console.log('\n📊 TEST: Simple existsOne flow');
  console.log('-------------------------------');
  
  try {
    // Reset counters
    enterAsProverCallCount = 0;
    finishCallCount = 0;
    
    // Enter witness generation mode
    const genHandle = Snarky.run.enterGenerateWitness();
    
    console.log('🔍 Calling exists(1, compute) from core/exists.ts...');
    
    // Simulate what exists() does in core/exists.ts
    const size = 1;
    const finish = Snarky.run.enterAsProver(size);
    
    console.log('🔍 In prover mode?', Snarky.run.inProver());
    
    if (Snarky.run.inProver()) {
      console.log('🔍 Computing witness values...');
      const values = [42n]; // Simulating [compute()]
      console.log('🔍 Calling finish with MlOption format...');
      
      // MlOption format: 0 = None, [0, values] = Some(values)
      const mlValues = [0, values.map(v => Field.from(v))];
      const result = finish(mlValues);
      console.log('🔍 finish returned:', result);
    } else {
      console.log('🔍 Not in prover mode, calling finish with 0 (None)...');
      const result = finish(0);
      console.log('🔍 finish returned:', result);
    }
    
    // Exit witness generation mode
    genHandle();
    
    console.log('\n📊 SUMMARY:');
    console.log(`- enterAsProver calls: ${enterAsProverCallCount}`);
    console.log(`- finish function calls: ${finishCallCount}`);
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('\n📊 SUMMARY (on error):');
    console.log(`- enterAsProver calls: ${enterAsProverCallCount}`);
    console.log(`- finish function calls: ${finishCallCount}`);
  }
}

testEnterAsProverTrace().catch(console.error);