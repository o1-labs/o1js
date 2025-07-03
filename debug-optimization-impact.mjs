#!/usr/bin/env node

/**
 * Test the impact of new constraint optimization code on constraint storage
 * 
 * This script tests whether the new optimization features are helping or hurting
 * the constraint storage issue identified in BUG.md.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test constraint generation with current optimization code
async function testConstraintStorage() {
  console.log('🧪 Testing Constraint Storage with Optimization Code');
  
  try {
    // Switch to Sparky backend
    console.log('📋 Current backend:', getCurrentBackend());
    
    if (getCurrentBackend() !== 'sparky') {
      console.log('🔄 Switching to Sparky backend...');
      await switchBackend('sparky');
    }
    
    console.log('✅ Using backend:', getCurrentBackend());
    
    // Import the Provable API
    const { Provable, Field } = await import('./dist/node/index.js');
    
    // Test 1: Simple field addition
    console.log('\n🔬 Test 1: Simple Field Addition');
    const constraintSystem1 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(1));
      const b = Provable.witness(Field, () => Field(2));
      const c = a.add(b);
      console.log('Field addition computed:', c);
    });
    
    console.log('📊 Constraint system result:', {
      gates: constraintSystem1.gates?.length || 0,
      publicInputSize: constraintSystem1.public_input_size || 0
    });
    
    // Test 2: Field multiplication (should generate constraints)
    console.log('\n🔬 Test 2: Field Multiplication');
    const constraintSystem2 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(3));
      const b = Provable.witness(Field, () => Field(4));
      const c = a.mul(b);
      console.log('Field multiplication computed:', c);
    });
    
    console.log('📊 Constraint system result:', {
      gates: constraintSystem2.gates?.length || 0,
      publicInputSize: constraintSystem2.public_input_size || 0
    });
    
    // Test 3: Complex expression
    console.log('\n🔬 Test 3: Complex Expression');
    const constraintSystem3 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(5));
      const b = Provable.witness(Field, () => Field(6));
      const c = Provable.witness(Field, () => Field(7));
      const result = a.add(b).mul(c);
      console.log('Complex expression computed:', result);
    });
    
    console.log('📊 Constraint system result:', {
      gates: constraintSystem3.gates?.length || 0,
      publicInputSize: constraintSystem3.public_input_size || 0
    });
    
    // Test 4: Field assertion (should generate constraints)
    console.log('\n🔬 Test 4: Field Assertion');
    const constraintSystem4 = await Provable.constraintSystem(() => {
      const a = Provable.witness(Field, () => Field(8));
      const b = Provable.witness(Field, () => Field(8));
      a.assertEquals(b);
      console.log('Field assertion completed');
    });
    
    console.log('📊 Constraint system result:', {
      gates: constraintSystem4.gates?.length || 0,
      publicInputSize: constraintSystem4.public_input_size || 0
    });
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('Test 1 (addition):', constraintSystem1.gates?.length || 0, 'constraints');
    console.log('Test 2 (multiplication):', constraintSystem2.gates?.length || 0, 'constraints');
    console.log('Test 3 (complex):', constraintSystem3.gates?.length || 0, 'constraints');
    console.log('Test 4 (assertion):', constraintSystem4.gates?.length || 0, 'constraints');
    
    const totalConstraints = (constraintSystem1.gates?.length || 0) + 
                           (constraintSystem2.gates?.length || 0) + 
                           (constraintSystem3.gates?.length || 0) + 
                           (constraintSystem4.gates?.length || 0);
    
    console.log('🎯 Total constraints across all tests:', totalConstraints);
    
    if (totalConstraints === 0) {
      console.log('❌ CONSTRAINT STORAGE ISSUE PERSISTS');
      console.log('💡 The optimization code may be eliminating constraints that should be stored');
    } else {
      console.log('✅ CONSTRAINT STORAGE WORKING');
      console.log('🎉 The optimization code appears to be working correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConstraintStorage().catch(console.error);