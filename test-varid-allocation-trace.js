#!/usr/bin/env node

/**
 * TRACE: Exact VarId allocation during assertMul
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function traceVarIdAllocation() {
  console.log('🔬 VARID ALLOCATION TRACE');
  console.log('========================\n');
  
  await switchBackend('sparky');
  
  // Patch all variable creation functions to trace allocations
  let varCounter = 0;
  const varAllocations = [];
  
  // Patch Snarky.run.exists
  const originalExists = Snarky.run.exists;
  Snarky.run.exists = function(size, compute) {
    console.log(`\n🔍 [TRACE] Snarky.run.exists called with size=${size}`);
    const result = originalExists.call(this, size, compute);
    console.log('   Result:', result);
    varAllocations.push({ type: 'exists', size, result });
    return result;
  };
  
  // Patch Snarky.run.existsOne  
  const originalExistsOne = Snarky.run.existsOne;
  Snarky.run.existsOne = function(compute) {
    varCounter++;
    console.log(`\n🔍 [TRACE ${varCounter}] Snarky.run.existsOne called`);
    console.trace('Stack trace');
    const result = originalExistsOne.call(this, compute);
    console.log('   Result:', result);
    varAllocations.push({ type: 'existsOne', id: varCounter, result });
    return result;
  };
  
  console.log('📊 CONSTRAINT GENERATION MODE');
  console.log('----------------------------');
  
  try {
    const cs = await Provable.constraintSystem(() => {
      console.log('\n=== CREATING WITNESSES ===');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('Created a');
      
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('Created b');
      
      console.log('\n=== MULTIPLICATION ===');
      const c = a.mul(b);
      console.log('Created c = a.mul(b)');
      
      console.log('\n=== ASSERTEQUALS ===');
      c.assertEquals(Field.from(12));
      console.log('Called assertEquals');
    });
    
    console.log('\n✅ Constraint system generated');
    console.log('\n📊 VARIABLE ALLOCATIONS:');
    varAllocations.forEach((alloc, i) => {
      console.log(`${i}: ${alloc.type} -> ${JSON.stringify(alloc.result)}`);
    });
    
    console.log('\n📊 CONSTRAINTS:');
    cs.gates.forEach((gate, i) => {
      console.log(`\nGate ${i}:`, gate.typ);
      if (gate.coeffs && gate.coeffs[3] !== '0000000000000000000000000000000000000000000000000000000000000000') {
        console.log('  -> Appears to be multiplication constraint');
      }
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Full error:', error);
  }
  
  console.log('\n\n📊 WITNESS GENERATION MODE');
  console.log('-------------------------');
  
  // Reset counters
  varCounter = 0;
  varAllocations.length = 0;
  
  try {
    await Provable.runAndCheck(() => {
      console.log('\n=== CREATING WITNESSES ===');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('Created a');
      
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('Created b');
      
      console.log('\n=== MULTIPLICATION ===');
      const c = a.mul(b);
      console.log('Created c = a.mul(b)');
      
      console.log('\n=== ASSERTEQUALS ===');
      c.assertEquals(Field.from(12));
      console.log('Called assertEquals');
    });
    
    console.log('\n✅ Witness generation passed!?');
  } catch (error) {
    console.log('\n❌ Witness generation failed:', error.message);
    console.log('\n📊 VARIABLE ALLOCATIONS:');
    varAllocations.forEach((alloc, i) => {
      console.log(`${i}: ${alloc.type} -> ${JSON.stringify(alloc.result)}`);
    });
  }
}

traceVarIdAllocation().catch(console.error);