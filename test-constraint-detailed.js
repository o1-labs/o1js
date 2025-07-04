/**
 * Detailed constraint counting test
 * 
 * This test verifies that constraints are being properly generated and counted
 * after the timing fixes resolved the optimization pipeline panics.
 */

import { Provable } from './dist/node/index.js';

async function testDetailedConstraintCounting() {
  console.log('🔍 Detailed constraint counting test...');
  
  try {
    // Test constraint counting using Provable.constraintSystem
    console.log('📊 Testing constraint system analysis...');
    
    // Simple circuit: x * y = z
    const { rows: multiplyRows } = await Provable.constraintSystem(() => {
      const x = Provable.witness(Provable.Field, () => 3);
      const y = Provable.witness(Provable.Field, () => 4); 
      const z = x.mul(y);
      return z;
    });
    
    console.log('Multiplication circuit constraints:', multiplyRows);
    
    // More complex circuit: (x + y) * z
    const { rows: complexRows } = await Provable.constraintSystem(() => {
      const x = Provable.witness(Provable.Field, () => 3);
      const y = Provable.witness(Provable.Field, () => 4);
      const z = Provable.witness(Provable.Field, () => 5);
      const sum = x.add(y);  // Addition (may or may not add constraints)
      const result = sum.mul(z);  // Multiplication (definitely adds constraint)
      return result;
    });
    
    console.log('Complex circuit constraints:', complexRows);
    
    // Verification
    if (multiplyRows > 0) {
      console.log('✅ SUCCESS: Multiplication generates', multiplyRows, 'constraints (not 0!)');
    } else {
      console.log('❌ ISSUE: Multiplication still generating 0 constraints');
    }
    
    if (complexRows > 0) {
      console.log('✅ SUCCESS: Complex circuit generates', complexRows, 'constraints (not 0!)');
    } else {
      console.log('❌ ISSUE: Complex circuit still generating 0 constraints');
    }
    
    console.log('✅ Detailed constraint counting test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('time not implemented') || error.message.includes('optimization')) {
      console.error('🚨 OPTIMIZATION PIPELINE ISSUE - timing problems still exist');
    }
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testDetailedConstraintCounting().catch(console.error);