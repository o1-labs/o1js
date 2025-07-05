/**
 * Test Semantic If Constraint Integration
 * 
 * Tests that the TypeScript integration for semantic If constraints works properly:
 * 1. Detects Sparky backend correctly
 * 2. Attempts to use semantic constraint when available
 * 3. Falls back gracefully to primitive expansion when semantic constraint not available
 * 4. Maintains compatibility with Snarky backend
 */

import { switchBackend, getCurrentBackend } from './dist/node/bindings.js';
import { Field, Bool, Provable } from './dist/node/index.js';

async function testSemanticIfIntegration() {
  console.log('🧪 Testing Semantic If Constraint Integration\n');

  // Test 1: Snarky Backend - Should use primitive expansion
  console.log('=== Test 1: Snarky Backend ===');
  await switchBackend('snarky');
  console.log('Current backend:', getCurrentBackend());

  try {
    const condition = Bool(true);
    const thenVal = Field(10);
    const elseVal = Field(5);
    
    const result = Provable.if(condition, thenVal, elseVal);
    console.log('✅ Snarky if operation successful:', result.toString());
    console.log('   Using primitive expansion (expected)');
  } catch (error) {
    console.log('❌ Snarky if operation failed:', error.message);
  }

  console.log();

  // Test 2: Sparky Backend - Should attempt semantic constraint, fall back gracefully
  console.log('=== Test 2: Sparky Backend ===');
  await switchBackend('sparky');
  console.log('Current backend:', getCurrentBackend());

  try {
    const condition = Bool(true);
    const thenVal = Field(10);
    const elseVal = Field(5);
    
    console.log('   Bridge available:', !!(globalThis.sparkyConstraintBridge?.emitIfConstraint));
    
    const result = Provable.if(condition, thenVal, elseVal);
    console.log('✅ Sparky if operation successful:', result.toString());
    console.log('   Used semantic constraint or graceful fallback');
  } catch (error) {
    console.log('❌ Sparky if operation failed:', error.message);
  }

  console.log();

  // Test 3: Constraint Count Analysis
  console.log('=== Test 3: Constraint Count Analysis ===');
  
  // Test with Snarky
  await switchBackend('snarky');
  const snarkyConstraints = await Provable.constraintSystem(() => {
    const condition = Bool(true);
    const thenVal = Field(10);
    const elseVal = Field(5);
    Provable.if(condition, thenVal, elseVal);
  });
  console.log(`Snarky if constraints: ${snarkyConstraints.rows}`);

  // Test with Sparky
  await switchBackend('sparky');
  const sparkyConstraints = await Provable.constraintSystem(() => {
    const condition = Bool(true);
    const thenVal = Field(10);
    const elseVal = Field(5);
    Provable.if(condition, thenVal, elseVal);
  });
  console.log(`Sparky if constraints: ${sparkyConstraints.rows}`);

  // Analysis
  if (sparkyConstraints.rows < snarkyConstraints.rows) {
    console.log('🎉 SEMANTIC OPTIMIZATION ACTIVE: Sparky generated fewer constraints!');
  } else if (sparkyConstraints.rows === snarkyConstraints.rows) {
    console.log('✅ Constraint parity achieved (expected with current fallback)');
  } else {
    console.log('⚠️  Sparky generated more constraints (needs investigation)');
  }

  console.log();

  // Test 4: Bridge Function Availability
  console.log('=== Test 4: Bridge Function Availability ===');
  console.log('sparkyConstraintBridge exists:', !!globalThis.sparkyConstraintBridge);
  console.log('emitIfConstraint function exists:', !!globalThis.sparkyConstraintBridge?.emitIfConstraint);
  
  if (globalThis.sparkyConstraintBridge?.emitIfConstraint) {
    try {
      // Test the bridge function directly
      const testResult = globalThis.sparkyConstraintBridge.emitIfConstraint(
        [1, 1], // condition = true
        [0, [0, 10n]], // then = Field(10)
        [0, [0, 5n]]   // else = Field(5)
      );
      console.log('Bridge function test result:', testResult ? 'SUCCESS' : 'FALLBACK');
    } catch (error) {
      console.log('Bridge function test error (expected):', error.message);
    }
  }

  console.log('\n🏁 Semantic If Integration Test Complete');
}

// Run the test
testSemanticIfIntegration().catch(console.error);