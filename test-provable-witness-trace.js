#!/usr/bin/env node

/**
 * TRACE: Provable.witness flow to find double-call source
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

let existsCallCount = 0;
let existsOneCallCount = 0;

async function testProvableWitnessTrace() {
  console.log('🔬 PROVABLE.WITNESS TRACE');
  console.log('=========================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Monkey-patch to trace calls after backend is loaded
  const originalExists = Snarky.run.exists;
  const originalExistsOne = Snarky.run.existsOne;

  Snarky.run.exists = function(...args) {
    existsCallCount++;
    console.log(`🔍 [TRACE] Snarky.run.exists called (#${existsCallCount}) with size:`, args[0]);
    const result = originalExists.apply(this, args);
    console.log(`🔍 [TRACE] Snarky.run.exists returned array length:`, result.length);
    return result;
  };

  Snarky.run.existsOne = function(...args) {
    existsOneCallCount++;
    console.log(`🔍 [TRACE] Snarky.run.existsOne called (#${existsOneCallCount})`);
    const result = originalExistsOne.apply(this, args);
    console.log(`🔍 [TRACE] Snarky.run.existsOne returned:`, result);
    return result;
  };
  
  console.log('\n📊 TRACING: Provable.witness(Field, ...) flow');
  console.log('---------------------------------------------');
  
  existsCallCount = 0;
  existsOneCallCount = 0;
  
  try {
    await Provable.runAndCheck(() => {
      console.log('🔍 [APP] Inside runAndCheck, calling Provable.witness...');
      
      const witness = Provable.witness(Field, () => {
        console.log('🔍 [APP] Compute function called, returning Field.from(42)');
        return Field.from(42);
      });
      
      console.log('🔍 [APP] Provable.witness completed');
      return witness;
    });
    
    console.log('\n📊 CALL SUMMARY:');
    console.log(`- Snarky.run.exists calls: ${existsCallCount}`);
    console.log(`- Snarky.run.existsOne calls: ${existsOneCallCount}`);
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('\n📊 CALL SUMMARY (on error):');
    console.log(`- Snarky.run.exists calls: ${existsCallCount}`);
    console.log(`- Snarky.run.existsOne calls: ${existsOneCallCount}`);
  }
}

testProvableWitnessTrace().catch(console.error);