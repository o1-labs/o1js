#!/usr/bin/env node

/**
 * Debug the constraint compiler mode and constraint addition
 * 
 * This script specifically tests whether the constraint compiler is in the
 * correct mode and whether constraints are actually being added.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugConstraintMode() {
  console.log('🔍 Debugging Constraint Compiler Mode');
  
  try {
    // Switch to Sparky backend
    if (getCurrentBackend() !== 'sparky') {
      console.log('🔄 Switching to Sparky backend...');
      await switchBackend('sparky');
    }
    
    console.log('✅ Using backend:', getCurrentBackend());
    
    // Import the Provable API
    const { Provable, Field } = await import('./dist/node/index.js');
    
    // Test simple multiplication to trigger constraint generation
    console.log('\n🔬 Testing Simple Multiplication (should generate constraints)');
    console.log('Expected: R1CS constraint for multiplication operation');
    
    const constraintSystem = await Provable.constraintSystem(() => {
      console.log('📝 Starting constraint generation...');
      
      const a = Provable.witness(Field, () => Field(3));
      console.log('✅ Created witness variable a');
      
      const b = Provable.witness(Field, () => Field(4));
      console.log('✅ Created witness variable b');
      
      const c = a.mul(b);
      console.log('⚡ Performed multiplication: a * b');
      console.log('🎯 This should have called assert_r1cs internally');
      
      console.log('📊 Multiplication result:', c);
    });
    
    console.log('\n📋 Final Constraint System Analysis:');
    console.log('Gates count:', constraintSystem.gates?.length || 0);
    console.log('Public input size:', constraintSystem.public_input_size || 0);
    console.log('Gates array:', constraintSystem.gates);
    
    if ((constraintSystem.gates?.length || 0) === 0) {
      console.log('\n❌ ZERO CONSTRAINTS GENERATED');
      console.log('🔍 Possible causes:');
      console.log('   1. Constraint compiler not in ConstraintGeneration mode');
      console.log('   2. assert_r1cs method not being called');
      console.log('   3. Constraints being added but immediately cleared');
      console.log('   4. Mode being changed to WitnessGeneration during execution');
    } else {
      console.log('\n✅ CONSTRAINTS SUCCESSFULLY GENERATED');
      console.log('🎉 The constraint storage mechanism is working!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the debug test
debugConstraintMode().catch(console.error);