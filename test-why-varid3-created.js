#!/usr/bin/env node

/**
 * DEBUG: Why is VarId(3) created in reduce_lincom_exact?
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Snarky } from './dist/node/bindings.js';

async function debugVarId3Creation() {
  console.log('🔬 WHY IS VARID(3) CREATED?');
  console.log('==========================\n');
  
  await switchBackend('sparky');
  
  // Patch to intercept Sparky's internal variable creation
  const originalRun = Snarky.run;
  let internalVarCreations = 0;
  
  // Create a proxy for the run module
  Snarky.run = new Proxy(originalRun, {
    get(target, prop) {
      if (prop === 'exists' || prop === 'existsOne') {
        return function(...args) {
          internalVarCreations++;
          console.log(`\n🔍 [INTERCEPT] Snarky.run.${prop} called`);
          console.log('Arguments:', args);
          console.trace('Stack trace');
          const result = target[prop].apply(this, args);
          console.log('Result:', result);
          return result;
        };
      }
      return target[prop];
    }
  });
  
  console.log('📊 CONSTRAINT GENERATION');
  console.log('------------------------');
  
  try {
    const cs = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field.from(3));
      const b = Provable.witness(Field, () => Field.from(4));
      const c = a.mul(b);
      
      console.log('\n🎯 Before assertEquals:');
      console.log('a.value:', a.value);
      console.log('b.value:', b.value);
      console.log('c.value:', c.value);
      
      c.assertEquals(Field.from(12));
    });
    
    console.log('\n✅ Constraint system generated');
    console.log('Internal variable creations:', internalVarCreations);
    
    // Analyze constraints
    console.log('\nConstraints:');
    cs.gates.forEach((gate, i) => {
      console.log(`Gate ${i}:`, gate.typ);
      if (gate.typ === 'Generic' && gate.coeffs) {
        // Check if it's a multiplication constraint
        const isMul = gate.coeffs[3] !== '0000000000000000000000000000000000000000000000000000000000000000';
        if (isMul) {
          console.log('  -> Multiplication constraint detected');
        }
      }
    });
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  // Restore original
  Snarky.run = originalRun;
  
  console.log('\n\n📊 DIRECT ANALYSIS OF REDUCE_LINCOM');
  console.log('-----------------------------------');
  
  // Let's trace what happens in the Sparky constraint processing
  console.log('\nThe issue appears to be in Sparky\'s reduce_lincom_exact function.');
  console.log('It processes this linear combination:');
  console.log('Add(Add(Add(');
  console.log('  Scale(0, Var(VarId(0))),     // a * 0');
  console.log('  Scale(0, Var(VarId(1)))),     // b * 0');
  console.log('  Scale(1, Var(VarId(2)))),     // c * 1');
  console.log('  Scale(-1, Var(VarId(3))))     // ??? * -1');
  console.log('\nVarId(3) appears with coefficient -1, suggesting it\'s created internally.');
  
  console.log('\n\n📊 HYPOTHESIS');
  console.log('------------');
  console.log('1. Sparky\'s Gates.generic implementation adds extra terms to the linear combination');
  console.log('2. During constraint processing, reduce_lincom_exact creates internal variables');
  console.log('3. These internal variables (like VarId(3)) don\'t exist during witness generation');
  console.log('4. Snarky likely has a different constraint representation that avoids this');
}

debugVarId3Creation().catch(console.error);