/**
 * Targeted asProver Division by Zero Test
 * Focus on the inconsistency found in asProver context
 */

import { Field, Provable, switchBackend, getCurrentBackend } from './dist/node/index.js';

async function testAsProverDivisionInconsistency() {
  console.log('Testing asProver division by zero inconsistency...\n');
  
  const backends = ['snarky', 'sparky'];
  const results = {};

  for (const backend of backends) {
    console.log(`\n=== Testing ${backend.toUpperCase()} backend ===`);
    await switchBackend(backend);
    
    results[backend] = {};
    
    // Test 1: Direct division in asProver
    console.log('\n1. Direct division by zero in asProver:');
    try {
      const result = Provable.asProver(() => {
        console.log(`   Attempting Field(5).div(Field(0))...`);
        return Field(5).div(Field(0));
      });
      console.log(`   ✅ SUCCESS: ${result}`);
      results[backend].direct = { success: true, result: result?.toString() };
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message || error}`);
      results[backend].direct = { success: false, error: error.message || String(error) };
    }

    // Test 2: Witness generation with division by zero
    console.log('\n2. Witness generation with division by zero:');
    try {
      const result = Provable.witness(Field, () => {
        console.log(`   Computing witness for Field(10).div(Field(0))...`);
        return Field(10).div(Field(0));
      });
      console.log(`   ✅ SUCCESS: ${result}`);
      results[backend].witness = { success: true, result: result?.toString() };
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message || error}`);
      results[backend].witness = { success: false, error: error.message || String(error) };
    }

    // Test 3: Inverse directly in asProver
    console.log('\n3. Inverse of zero in asProver:');
    try {
      const result = Provable.asProver(() => {
        console.log(`   Attempting Field(0).inv()...`);
        return Field(0).inv();
      });
      console.log(`   ✅ SUCCESS: ${result}`);
      results[backend].inverse = { success: true, result: result?.toString() };
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message || error}`);
      results[backend].inverse = { success: false, error: error.message || String(error) };
    }

    // Test 4: Conditional computation
    console.log('\n4. Conditional computation:');
    try {
      let divisionResult;
      const result = Provable.asProver(() => {
        const x = Field(7);
        const divisor = Field(0);
        console.log(`   Testing if divisor is zero: ${divisor.equals(Field(0))}`);
        
        // Try to handle the division conditionally
        if (divisor.equals(Field(0)).toBoolean()) {
          console.log(`   Divisor is zero, returning zero instead of dividing`);
          divisionResult = Field(0);
        } else {
          console.log(`   Divisor is non-zero, performing division`);
          divisionResult = x.div(divisor);
        }
        return divisionResult;
      });
      console.log(`   ✅ SUCCESS: ${result}`);
      results[backend].conditional = { success: true, result: result?.toString() };
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message || error}`);
      results[backend].conditional = { success: false, error: error.message || String(error) };
    }

    // Test 5: Runtime division error
    console.log('\n5. Runtime division with computed zero:');
    try {
      const result = Provable.asProver(() => {
        const x = Field(5);
        const a = Field(3);
        const b = Field(3);
        const zero = a.sub(b); // This should be zero at runtime
        console.log(`   Computed zero: ${zero}`);
        console.log(`   Attempting division by computed zero...`);
        return x.div(zero);
      });
      console.log(`   ✅ SUCCESS: ${result}`);
      results[backend].runtime = { success: true, result: result?.toString() };
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message || error}`);
      results[backend].runtime = { success: false, error: error.message || String(error) };
    }
  }

  // Analysis
  console.log('\n\n=== DETAILED ANALYSIS ===');
  const testTypes = ['direct', 'witness', 'inverse', 'conditional', 'runtime'];
  
  for (const testType of testTypes) {
    console.log(`\n${testType.toUpperCase()}:`);
    const snarkyResult = results.snarky[testType];
    const sparkyResult = results.sparky[testType];
    
    console.log(`  Snarky: ${snarkyResult.success ? 'SUCCESS (' + snarkyResult.result + ')' : 'ERROR (' + snarkyResult.error + ')'}`);
    console.log(`  Sparky: ${sparkyResult.success ? 'SUCCESS (' + sparkyResult.result + ')' : 'ERROR (' + sparkyResult.error + ')'}`);
    
    if (snarkyResult.success !== sparkyResult.success) {
      console.log(`  🚨 INCONSISTENCY: Different success/failure behavior!`);
      if (snarkyResult.success) {
        console.log(`    Snarky allows division by zero and returns: ${snarkyResult.result}`);
        console.log(`    Sparky correctly errors with: ${sparkyResult.error}`);
      } else {
        console.log(`    Snarky correctly errors with: ${snarkyResult.error}`);
        console.log(`    Sparky incorrectly succeeds with: ${sparkyResult.result}`);
      }
    } else if (snarkyResult.success && snarkyResult.result !== sparkyResult.result) {
      console.log(`  ⚠️ DIFFERENT RESULTS: Both succeed but return different values!`);
    } else {
      console.log(`  ✅ CONSISTENT: Both backends behave the same`);
    }
  }

  return results;
}

testAsProverDivisionInconsistency().catch(console.error);