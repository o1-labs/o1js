#!/usr/bin/env node

/**
 * DEBUG: Understanding why reduceToScaledVar creates internal variables
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { fieldVar } from './dist/node/lib/provable/core/fieldvar.js';
import { reduceToScaledVar, toLinearCombination } from './dist/node/lib/provable/gadgets/basic.js';
import { existsOne } from './dist/node/lib/provable/core/exists.js';

async function debugReduceToScaledVar() {
  console.log('🔬 REDUCE TO SCALED VAR DEBUG');
  console.log('=============================\n');
  
  await switchBackend('sparky');
  
  // Patch existsOne to track calls
  let existsOneCalls = 0;
  const originalExistsOne = global.existsOne || existsOne;
  
  const patchedExistsOne = function(compute) {
    existsOneCalls++;
    console.log(`\n🔍 [TRACE] existsOne call #${existsOneCalls}`);
    console.log('Stack trace:');
    console.trace();
    const result = existsOne(compute);
    console.log('Result:', result);
    return result;
  };
  
  // Override global if possible
  if (global.existsOne) {
    global.existsOne = patchedExistsOne;
  }
  
  console.log('\n📊 TEST 1: Analyze what happens in constraint generation mode');
  console.log('------------------------------------------------------------');
  
  try {
    const cs = await Provable.constraintSystem(() => {
      console.log('\n1. Creating witness variables...');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('   a =', a);
      console.log('   a.value =', a.value);
      
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('   b =', b);
      console.log('   b.value =', b.value);
      
      console.log('\n2. Computing c = a.mul(b)...');
      const c = a.mul(b);
      console.log('   c =', c);
      console.log('   c.value =', c.value);
      console.log('   c as FieldVar =', fieldVar(c));
      
      console.log('\n3. Analyzing linear combination of c...');
      const lincom = toLinearCombination(fieldVar(c));
      console.log('   Linear combination:', JSON.stringify(lincom, null, 2));
      
      console.log('\n4. Calling reduceToScaledVar(c)...');
      const reduced = reduceToScaledVar(c);
      console.log('   Reduced result:', reduced);
      console.log('   Result type:', reduced[0]);
      if (reduced[0] === 3) { // FieldType.Scale
        console.log('   Scale factor:', reduced[1]);
        console.log('   Variable:', reduced[2]);
      }
      
      console.log('\n5. Now calling assertEquals...');
      c.assertEquals(Field.from(12));
    });
    
    console.log('\n✅ Constraint system generated');
    console.log('Total existsOne calls:', existsOneCalls);
    console.log('Gates:', cs.gates.length);
    
    // Analyze the constraint
    console.log('\nConstraint details:');
    cs.gates.forEach((gate, i) => {
      if (gate.typ === 'Generic' && gate.coeffs && gate.coeffs[3] !== '0000000000000000000000000000000000000000000000000000000000000000') {
        console.log(`\nGate ${i} appears to be multiplication:`, gate);
      }
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  console.log('\n\n📊 TEST 2: Trace the exact point where VarId(3) is created');
  console.log('----------------------------------------------------------');
  
  // Create a minimal test case
  try {
    const cs2 = await Provable.constraintSystem(() => {
      // Directly test what happens with different field representations
      console.log('\n Testing different Field representations:');
      
      // Simple variable
      const x = Provable.witness(Field, () => Field.from(42));
      console.log('\n1. Simple witness x:', x.value);
      
      // What does reduceToScaledVar do with it?
      console.log('\n2. reduceToScaledVar(x):');
      const reducedX = reduceToScaledVar(x);
      console.log('   Result:', reducedX);
      
      // Try with a computed value (like from mul)
      const y = Provable.witness(Field, () => Field.from(10));
      const z = existsOne(() => 420n); // Simulating what mul() does
      console.log('\n3. Created z with existsOne:', z);
      
      console.log('\n4. reduceToScaledVar(z):');
      const reducedZ = reduceToScaledVar(new Field(z));
      console.log('   Result:', reducedZ);
    });
    
    console.log('\n✅ Analysis complete');
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugReduceToScaledVar().catch(console.error);