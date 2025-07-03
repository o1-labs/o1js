#!/usr/bin/env node

/**
 * DEBUG: VarId mismatch in assertMul
 * 
 * The issue: During constraint generation, assertMul creates a constraint
 * R1CS(VarId(0), VarId(1), VarId(3)) but during witness generation only
 * VarId(0), VarId(1), VarId(2) exist.
 */

import { Field, Provable, switchBackend } from './dist/node/index.js';
import { Gates, fieldVar } from './dist/node/lib/provable/gates.js';
import { assertMul, reduceToScaledVar } from './dist/node/lib/provable/gadgets/basic.js';

async function testAssertMulVarIdMismatch() {
  console.log('🔬 ASSERTMUL VARID MISMATCH DEBUG');
  console.log('=================================');
  
  await switchBackend('sparky');
  console.log('✓ Switched to Sparky backend');
  
  // Patch Gates.generic to trace variable IDs
  const originalGeneric = Gates.generic;
  let constraintMode = false;
  let witnessMode = false;
  
  Gates.generic = function(coeffs, vars) {
    const mode = constraintMode ? 'CONSTRAINT' : witnessMode ? 'WITNESS' : 'UNKNOWN';
    console.log(`\n🔍 [${mode} MODE] Gates.generic called`);
    console.log('Coefficients:', coeffs);
    console.log('Variables:');
    console.log('- left:', vars.left);
    console.log('- right:', vars.right);
    console.log('- out:', vars.out);
    
    // Extract VarId from the variables
    if (vars.left && vars.left[0] === 1) console.log('  -> left is VarId(' + vars.left[1] + ')');
    if (vars.right && vars.right[0] === 1) console.log('  -> right is VarId(' + vars.right[1] + ')');
    if (vars.out && vars.out[0] === 1) console.log('  -> out is VarId(' + vars.out[1] + ')');
    
    return originalGeneric.call(this, coeffs, vars);
  };
  
  console.log('\n📊 PHASE 1: Constraint Generation');
  console.log('---------------------------------');
  constraintMode = true;
  
  try {
    const cs = await Provable.constraintSystem(() => {
      console.log('\n1. Creating witness variables...');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('   a created (should be VarId(0))');
      
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('   b created (should be VarId(1))');
      
      console.log('\n2. Calling a.mul(b)...');
      const c = a.mul(b);
      console.log('   c created (should be VarId(2))');
      console.log('   c.value:', c.value);
      
      console.log('\n3. Processing through assertMul...');
      console.log('   Looking at what reduceToScaledVar does to c...');
      
      // Manually check what reduceToScaledVar does
      const cFieldVar = fieldVar(c);
      console.log('   c as FieldVar:', cFieldVar);
      
      const reduced = reduceToScaledVar(c);
      console.log('   reduceToScaledVar(c):', reduced);
      
      console.log('\n4. Calling c.assertEquals(12)...');
      c.assertEquals(Field.from(12));
    });
    
    console.log('\n✅ Constraint generation completed');
    console.log('Gates:', cs.gates.length);
    
    // Look for R1CS constraints
    cs.gates.forEach((gate, i) => {
      if (gate.typ === 'Generic' && gate.coeffs && gate.coeffs[3] === '0100000000000000000000000000000000000000000000000000000000000000') {
        console.log(`\nFound multiplication constraint at gate ${i}`);
      }
    });
    
  } catch (error) {
    console.log('❌ Constraint generation failed:', error.message);
  }
  
  constraintMode = false;
  
  console.log('\n\n📊 PHASE 2: Witness Generation');
  console.log('------------------------------');
  witnessMode = true;
  
  try {
    await Provable.runAndCheck(() => {
      console.log('\n1. Creating witness variables...');
      const a = Provable.witness(Field, () => Field.from(3));
      console.log('   a.value:', a.value);
      
      const b = Provable.witness(Field, () => Field.from(4));
      console.log('   b.value:', b.value);
      
      console.log('\n2. Calling a.mul(b)...');
      const c = a.mul(b);
      console.log('   c.value:', c.value);
      
      console.log('\n3. Calling c.assertEquals(12)...');
      c.assertEquals(Field.from(12));
    });
    
    console.log('\n✅ Witness generation passed!');
  } catch (error) {
    console.log('\n❌ Witness generation failed:', error.message);
    console.log('Full error:', error);
  }
  
  witnessMode = false;
  
  console.log('\n\n📊 ANALYSIS:');
  console.log('The mismatch occurs because during constraint generation,');
  console.log('the linear combination processing creates an internal variable.');
}

testAssertMulVarIdMismatch().catch(console.error);