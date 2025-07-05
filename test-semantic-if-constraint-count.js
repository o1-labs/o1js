/**
 * Test Semantic If Constraint Count Reduction
 * 
 * This test specifically measures the constraint count difference between:
 * 1. Primitive expansion (current default)
 * 2. Semantic If constraint (our optimization)
 */

import { switchBackend, getCurrentBackend } from './dist/node/bindings.js';
import { Field, Bool, Provable } from './dist/node/index.js';

async function testConstraintReduction() {
  console.log('🎯 Testing Semantic If Constraint Count Reduction\n');

  // Test 1: Snarky Backend (baseline)
  console.log('=== Baseline: Snarky Backend ===');
  await switchBackend('snarky');
  
  const snarkyConstraints = await Provable.constraintSystem(() => {
    const condition = Bool(true);
    const thenVal = Field(10);
    const elseVal = Field(5);
    const result = Provable.if(condition, thenVal, elseVal);
    result.assertEquals(Field(10)); // Force constraint generation
  });
  
  console.log(`Snarky constraints: ${snarkyConstraints.rows}`);
  console.log(`Snarky digest: ${snarkyConstraints.digest}`);

  // Test 2: Sparky Backend with Semantic Constraints  
  console.log('\n=== Optimization: Sparky Backend with Semantic If ===');
  await switchBackend('sparky');
  
  const sparkyConstraints = await Provable.constraintSystem(() => {
    const condition = Bool(true);
    const thenVal = Field(10);
    const elseVal = Field(5);
    const result = Provable.if(condition, thenVal, elseVal);
    result.assertEquals(Field(10)); // Force constraint generation
  });
  
  console.log(`Sparky constraints: ${sparkyConstraints.rows}`);
  console.log(`Sparky digest: ${sparkyConstraints.digest}`);

  // Test 3: Direct semantic constraint test
  console.log('\n=== Direct Semantic Constraint Test ===');
  if (globalThis.sparkyConstraintBridge?.emitIfConstraint) {
    try {
      const directConstraints = await Provable.constraintSystem(() => {
        // Create field variables
        const condition = Field(1); // true 
        const thenVal = Field(10);
        const elseVal = Field(5);
        
        // Try to call semantic constraint directly
        const bridge = globalThis.sparkyConstraintBridge;
        const result = bridge.emitIfConstraint(
          condition.toFields()[0],
          thenVal.toFields()[0], 
          elseVal.toFields()[0]
        );
        
        if (result) {
          console.log('✅ Direct semantic constraint succeeded');
          // Create a Field from the result for constraint generation
          const resultField = new Field(result);
          resultField.assertEquals(Field(10));
        } else {
          console.log('❌ Direct semantic constraint returned null');
        }
      });
      
      console.log(`Direct semantic constraints: ${directConstraints.rows}`);
      console.log(`Direct semantic digest: ${directConstraints.digest}`);
    } catch (error) {
      console.log('❌ Direct semantic constraint failed:', error.message);
    }
  }

  // Analysis
  console.log('\n=== Constraint Reduction Analysis ===');
  const reduction = snarkyConstraints.rows - sparkyConstraints.rows;
  const reductionPercent = snarkyConstraints.rows > 0 ? 
    Math.round((reduction / snarkyConstraints.rows) * 100) : 0;
  
  if (reduction > 0) {
    console.log(`🎉 OPTIMIZATION SUCCESS: Reduced ${reduction} constraints (${reductionPercent}% reduction)`);
    console.log(`   From ${snarkyConstraints.rows} to ${sparkyConstraints.rows} constraints`);
  } else if (reduction === 0) {
    console.log(`✅ CONSTRAINT PARITY: Both backends generate ${snarkyConstraints.rows} constraints`);
  } else {
    console.log(`⚠️  MORE CONSTRAINTS: Sparky generated ${Math.abs(reduction)} more constraints`);
  }

  // VK Hash Comparison
  if (snarkyConstraints.digest === sparkyConstraints.digest) {
    console.log(`✅ VK HASH MATCH: ${snarkyConstraints.digest}`);
  } else {
    console.log(`❌ VK HASH MISMATCH:`);
    console.log(`   Snarky: ${snarkyConstraints.digest}`);
    console.log(`   Sparky: ${sparkyConstraints.digest}`);
  }

  console.log('\n🏁 Constraint Reduction Test Complete');
}

// Run the test
testConstraintReduction().catch(console.error);