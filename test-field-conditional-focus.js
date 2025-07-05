#!/usr/bin/env node

/**
 * Focused test for field conditional optimization
 * Test if enhanced ConditionalExpressionOptimization achieves 4→2 constraint reduction
 * 
 * Created: July 5, 2025, 1:00 AM UTC
 * Last Modified: July 5, 2025, 1:00 AM UTC
 */

import { switchBackend, Provable, Field, Bool } from './dist/node/index.js';

async function getConstraintCount(backend, operation) {
  switchBackend(backend);
  
  // Reset constraint system
  await Provable.constraintSystem(() => {
    // Just to clear any previous state
  });
  
  // Capture constraints for the operation
  const { rows } = await Provable.constraintSystem(operation);
  return rows;
}

async function testFieldConditional() {
  console.log('🎯 Focused Test: Field Conditional Optimization\n');
  
  const operation = () => {
    const condition = Provable.witness(Bool, () => Bool(true));
    const thenVal = Provable.witness(Field, () => Field(10));
    const elseVal = Provable.witness(Field, () => Field(20));
    const result = Provable.if(condition, thenVal, elseVal);
    return result;
  };

  console.log('Testing Provable.if(condition, thenVal, elseVal)...\n');
  
  const snarkyCount = await getConstraintCount('snarky', operation);
  const sparkyCount = await getConstraintCount('sparky', operation);
  
  console.log(`Snarky: ${snarkyCount} constraints`);
  console.log(`Sparky: ${sparkyCount} constraints`);
  
  if (snarkyCount === sparkyCount) {
    console.log('✅ PERFECT PARITY ACHIEVED!');
  } else {
    const difference = sparkyCount - snarkyCount;
    const improvement = snarkyCount > 0 ? ((snarkyCount - sparkyCount) / snarkyCount * 100).toFixed(1) : 0;
    
    console.log(`❌ Difference: ${difference} extra constraints`);
    if (difference > 0) {
      console.log(`📊 Overhead: ${((difference / snarkyCount) * 100).toFixed(1)}%`);
    } else {
      console.log(`🎉 Improvement: ${Math.abs(improvement)}% fewer constraints than Snarky!`);
    }
  }
  
  // Check if we achieved the target improvement
  if (sparkyCount <= 2) {
    console.log('🎯 TARGET ACHIEVED: Sparky now generates ≤2 constraints for field conditionals');
  } else {
    console.log(`🔧 Still needs work: Current ${sparkyCount} constraints, target ≤2`);
  }
}

// Run the focused test
testFieldConditional().catch(console.error);