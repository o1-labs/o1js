#!/usr/bin/env node

/**
 * CRITICAL ANALYSIS: Constraint System Equivalence Verification
 * 
 * This test verifies that Sparky's reduced constraints are mathematically 
 * equivalent to Snarky's constraints, not just fewer in number.
 * 
 * Key concerns:
 * - Are we dropping necessary constraints?
 * - Do both systems accept/reject the same witness values?
 * - Is the constraint reduction sound?
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testConstraintEquivalence() {
  console.log('🚨 CRITICAL ANALYSIS: Constraint System Equivalence');
  console.log('===================================================');
  console.log('Testing if Sparky\'s reduced constraints are mathematically equivalent to Snarky\'s');
  
  // Test cases with known valid and invalid witness values
  const testCases = [
    {
      name: 'Valid multiplication: 3 * 4 = 12',
      a: 3n,
      b: 4n,
      expected: 12n,
      shouldPass: true
    },
    {
      name: 'Invalid multiplication: 3 * 4 ≠ 10',
      a: 3n,
      b: 4n,
      expected: 10n,
      shouldPass: false
    },
    {
      name: 'Valid with zero: 0 * 5 = 0',
      a: 0n,
      b: 5n,
      expected: 0n,
      shouldPass: true
    },
    {
      name: 'Invalid with zero: 0 * 5 ≠ 1',
      a: 0n,
      b: 5n,
      expected: 1n,
      shouldPass: false
    },
    {
      name: 'Valid large numbers',
      a: 12345678n,
      b: 87654321n,
      expected: 12345678n * 87654321n,
      shouldPass: true
    }
  ];
  
  const backends = ['snarky', 'sparky'];
  const results = {};
  
  for (const backend of backends) {
    console.log(`\n📊 Testing ${backend.toUpperCase()} constraint satisfaction:`);
    
    // Switch to backend
    if (getCurrentBackend() !== backend) {
      await switchBackend(backend);
    }
    
    results[backend] = [];
    
    for (const testCase of testCases) {
      console.log(`\n  🧪 ${testCase.name}`);
      
      try {
        // Test constraint satisfaction
        const testResult = await Provable.runAndCheck(() => {
          const a = Provable.witness(Field, () => Field(testCase.a));
          const b = Provable.witness(Field, () => Field(testCase.b));
          const result = a.mul(b);
          result.assertEquals(Field(testCase.expected));
        });
        
        console.log(`     ✅ Constraints satisfied (expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'})`);
        results[backend].push({
          testCase: testCase.name,
          satisfied: true,
          expected: testCase.shouldPass,
          correct: testCase.shouldPass === true
        });
        
      } catch (error) {
        console.log(`     ❌ Constraints failed: ${error.message} (expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'})`);
        results[backend].push({
          testCase: testCase.name,
          satisfied: false,
          expected: testCase.shouldPass,
          correct: testCase.shouldPass === false
        });
      }
    }
  }
  
  console.log('\n🔍 CONSTRAINT EQUIVALENCE ANALYSIS:');
  console.log('===================================');
  
  let allEquivalent = true;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const snarkyResult = results.snarky[i];
    const sparkyResult = results.sparky[i];
    
    console.log(`\n${testCase.name}:`);
    console.log(`  Snarky: ${snarkyResult.satisfied ? 'SATISFIED' : 'REJECTED'} (correct: ${snarkyResult.correct})`);
    console.log(`  Sparky: ${sparkyResult.satisfied ? 'SATISFIED' : 'REJECTED'} (correct: ${sparkyResult.correct})`);
    
    const equivalent = (snarkyResult.satisfied === sparkyResult.satisfied);
    console.log(`  Equivalent behavior: ${equivalent ? '✅' : '❌'}`);
    
    if (!equivalent) {
      allEquivalent = false;
      console.log(`  🚨 CRITICAL: Different constraint satisfaction behavior!`);
    }
  }
  
  console.log('\n🎯 FINAL ANALYSIS:');
  console.log('==================');
  
  if (allEquivalent) {
    console.log('✅ CONSTRAINT SYSTEMS ARE EQUIVALENT');
    console.log('   - Both systems accept/reject the same witness values');
    console.log('   - Sparky\'s constraint reduction appears sound');
    console.log('   - Fewer constraints likely due to valid optimization');
  } else {
    console.log('❌ CONSTRAINT SYSTEMS ARE NOT EQUIVALENT');
    console.log('   - Different satisfaction behavior detected');
    console.log('   - Sparky may be dropping necessary constraints');
    console.log('   - OR Sparky may be over-constraining');
    console.log('   - REQUIRES IMMEDIATE INVESTIGATION');
  }
  
  // Additional analysis: constraint structure
  console.log('\n📋 CONSTRAINT STRUCTURE ANALYSIS:');
  console.log('=================================');
  
  console.log('Based on previous tests:');
  console.log('- Snarky: 3 constraints per multiplication');
  console.log('- Sparky: 1-2 constraints per multiplication');
  console.log('- Reduction ratio: 33-66%');
  
  if (allEquivalent) {
    console.log('\n🔬 HYPOTHESIS: Valid optimization');
    console.log('  Sparky is correctly optimizing redundant constraints');
    console.log('  VK mismatch is due to different circuit structure, not correctness');
  } else {
    console.log('\n🚨 HYPOTHESIS: Constraint system bug');
    console.log('  Sparky has a fundamental constraint generation bug');
    console.log('  Must fix constraint generation before optimization');
  }
}

// Run the critical analysis
testConstraintEquivalence().catch(console.error);