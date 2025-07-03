#!/usr/bin/env node

/**
 * DEBUG: Witness variable creation in multiplication
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

// Track witness variable creation
let witnessVarCount = 0;
const witnessVars = new Map();

function patchExistsOne() {
  // Patch existsOne to track calls
  const originalExistsOne = Snarky.run.existsOne;
  Snarky.run.existsOne = function(compute) {
  console.log(`🔍 [TRACE] existsOne called (#${++witnessVarCount})`);
  
  try {
    const result = originalExistsOne.call(this, compute);
    console.log(`🔍 [TRACE] existsOne returned:`, result);
    
    // Track the variable
    if (Array.isArray(result) && result[0] === 1) {
      const varId = result[1];
      witnessVars.set(varId, { 
        callNumber: witnessVarCount,
        result: result,
        inWitnessMode: Snarky.run.inProver()
      });
      console.log(`🔍 [TRACE] Tracked VarId(${varId}), witness mode: ${Snarky.run.inProver()}`);
    }
    
    return result;
  } catch (error) {
    console.log(`🔍 [TRACE] existsOne failed:`, error);
    throw error;
  }
  };
}

async function testWitnessVariableCreation() {
  console.log('🔬 WITNESS VARIABLE CREATION DEBUG');
  console.log('==================================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Patch after backend is loaded
  patchExistsOne();
  
  console.log('\n📊 TEST: Track variable creation during multiplication');
  console.log('-----------------------------------------------------');
  
  witnessVarCount = 0;
  witnessVars.clear();
  
  try {
    console.log('🔍 Entering runAndCheck...');
    
    await Provable.runAndCheck(() => {
      console.log(`🔍 In witness mode: ${Snarky.run.inProver()}`);
      
      console.log('\n🔍 Creating witness a = 3...');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('🔍 a.value:', a.value);
      
      console.log('\n🔍 Creating witness b = 4...');
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('🔍 b.value:', b.value);
      
      console.log('\n🔍 Computing c = a.mul(b)...');
      console.log(`🔍 Before mul: witness mode = ${Snarky.run.inProver()}`);
      const c = a.mul(b);
      console.log('🔍 c.value:', c.value);
      console.log(`🔍 After mul: witness mode = ${Snarky.run.inProver()}`);
      
      console.log('\n🔍 Created variables so far:');
      for (const [varId, info] of witnessVars.entries()) {
        console.log(`   VarId(${varId}): call #${info.callNumber}, witness mode: ${info.inWitnessMode}`);
      }
      
      console.log('\n🔍 Calling c.assertEquals(12)...');
      c.assertEquals(Field.from(12));
      console.log('🔍 assertEquals completed');
    });
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message || error);
    console.log('\n🔍 Final variable tracking:');
    for (const [varId, info] of witnessVars.entries()) {
      console.log(`   VarId(${varId}): call #${info.callNumber}, witness mode: ${info.inWitnessMode}`);
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log(`- Total existsOne calls: ${witnessVarCount}`);
  console.log(`- Variables created: ${witnessVars.size}`);
  console.log(`- Variable IDs: ${Array.from(witnessVars.keys()).map(id => `VarId(${id})`).join(', ')}`);
}

testWitnessVariableCreation().catch(console.error);