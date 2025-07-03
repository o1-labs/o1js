#!/usr/bin/env node

/**
 * Debug Constraint Generation from Add Expressions
 * 
 * This test compares how Snarky vs Sparky handle identical Add expressions
 * to identify the constraint generation bug.
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function debugConstraintGeneration() {
  console.log('🔍 Debugging Constraint Generation from Add Expressions');
  console.log('======================================================');
  
  const backends = ['snarky', 'sparky'];
  
  for (const backend of backends) {
    console.log(`\n📊 Testing ${backend.toUpperCase()} backend:`);
    
    if (getCurrentBackend() !== backend) {
      await switchBackend(backend);
    }
    
    console.log(`✓ ${backend} backend loaded`);
    
    // Test the exact same Add expression that we see in debug output
    console.log('\n🧪 Test: Add(Var(2), Constant(c)) === 12');
    
    try {
      const result = await Provable.runAndCheck(() => {
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(4));
        
        // This should create the multiplication constraint and return a variable
        const product = a.mul(b);
        
        // The critical moment - this Add expression should constrain properly
        product.assertEquals(Field(12));
      });
      
      console.log(`   ✅ Constraints satisfied (valid case)`);
      
    } catch (error) {
      console.log(`   ❌ Constraints failed: ${error.message}`);
    }
    
    // Test with invalid value
    console.log('\n🧪 Test: Same expression with invalid expected value');
    
    try {
      const result = await Provable.runAndCheck(() => {
        const a = Provable.witness(Field, () => Field(3));
        const b = Provable.witness(Field, () => Field(4));
        const product = a.mul(b);
        
        // This should FAIL - 3*4 ≠ 10
        product.assertEquals(Field(10));
      });
      
      console.log(`   ❌ CRITICAL: Constraints satisfied when they should have failed!`);
      
    } catch (error) {
      console.log(`   ✅ Correctly rejected: ${error.message}`);
    }
  }
  
  console.log('\n🎯 ANALYSIS:');
  console.log('=============');
  console.log('The issue is NOT in o1js encoding (both backends get same JavaScript)');
  console.log('The issue IS in how Sparky processes Add expressions in constraints');
  console.log('Specifically: how Sparky handles Equal(Add(Var, Constant), Expected)');
  
  console.log('\n🔧 HYPOTHESIS:');
  console.log('===============');
  console.log('Sparky\'s reduce_lincom_exact or Union-Find is incorrectly handling');
  console.log('the constraint generation from Add expressions, making them trivially');
  console.log('satisfiable by absorbing the difference into the constant term.');
}

// Run the analysis
debugConstraintGeneration().catch(console.error);