/**
 * Division by Zero Handling Test
 * Tests consistency between Snarky and Sparky backends for division by zero errors
 */

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testDivisionByZero() {
  console.log('Testing division by zero handling consistency between backends...\n');
  
  const testCases = [
    {
      name: 'Field(1).div(Field(0))',
      test: () => Field(1).div(Field(0))
    },
    {
      name: 'Field(1).div(0)',
      test: () => Field(1).div(0)
    },
    {
      name: 'Field(5).div(Field(0))',
      test: () => Field(5).div(Field(0))
    },
    {
      name: 'Field(0).inv()',
      test: () => Field(0).inv()
    },
    {
      name: 'Field(0).div(Field(1)) // Should work',
      test: () => Field(0).div(Field(1))
    }
  ];

  const backends = ['snarky', 'sparky'];
  const results = {};

  for (const backend of backends) {
    console.log(`\n=== Testing with ${backend.toUpperCase()} backend ===`);
    await switchBackend(backend);
    console.log(`Current backend: ${getCurrentBackend()}`);
    
    results[backend] = {};

    for (const testCase of testCases) {
      console.log(`\nTest: ${testCase.name}`);
      try {
        const result = testCase.test();
        console.log(`✅ SUCCESS: Result = ${result.toString()}`);
        results[backend][testCase.name] = { success: true, result: result.toString() };
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        results[backend][testCase.name] = { success: false, error: error.message };
      }
    }
  }

  // Compare results between backends
  console.log('\n\n=== CONSISTENCY ANALYSIS ===');
  for (const testCase of testCases) {
    const snarkyResult = results.snarky[testCase.name];
    const sparkyResult = results.sparky[testCase.name];
    
    console.log(`\nTest: ${testCase.name}`);
    console.log(`  Snarky: ${snarkyResult.success ? 'SUCCESS (' + snarkyResult.result + ')' : 'ERROR (' + snarkyResult.error + ')'}`);
    console.log(`  Sparky: ${sparkyResult.success ? 'SUCCESS (' + sparkyResult.result + ')' : 'ERROR (' + sparkyResult.error + ')'}`);
    
    if (snarkyResult.success !== sparkyResult.success) {
      console.log(`  🚨 INCONSISTENCY: Different error handling behavior!`);
    } else if (snarkyResult.success && snarkyResult.result !== sparkyResult.result) {
      console.log(`  ⚠️ DIFFERENT RESULTS: Same success but different values!`);
    } else if (!snarkyResult.success && snarkyResult.error !== sparkyResult.error) {
      console.log(`  📝 DIFFERENT ERROR MESSAGES: Both error but with different messages`);
    } else {
      console.log(`  ✅ CONSISTENT: Both backends behave the same`);
    }
  }

  return results;
}

testDivisionByZero().catch(console.error);