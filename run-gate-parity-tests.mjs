#!/usr/bin/env node

/**
 * Direct Gate Parity Test Runner
 * 
 * Runs comprehensive gate parity tests directly without the complex infrastructure.
 */

console.log('🚀 COMPREHENSIVE GATE PARITY TESTING');
console.log('='.repeat(60));

async function runGateParityTests() {
  try {
    // Import o1js and backend switching
    const o1js = await import('./dist/node/index.js');
    const { switchBackend, getCurrentBackend } = o1js;
    
    // Import our test suite
    const testSuite = await import('./dist/node/test/sparky/suites/integration/comprehensive-gate-parity.suite.js');
    const tests = testSuite.tests;
    
    console.log(`📋 Found ${tests.length} gate parity tests`);
    console.log('');
    
    // Results storage
    const allResults = {};
    const summary = {
      totalTests: tests.length,
      passedTests: 0,
      failedTests: 0,
      parityMatches: 0,
      optimizations: 0,
      regressions: 0
    };
    
    // Run each test with both backends
    for (const test of tests) {
      console.log(`🧪 Running test: ${test.name}`);
      console.log('-'.repeat(50));
      
      const testResults = {};
      
      // Test with both backends
      for (const backend of ['snarky', 'sparky']) {
        console.log(`  🔄 Testing with ${backend} backend...`);
        
        try {
          await switchBackend(backend);
          const currentBackend = getCurrentBackend();
          console.log(`    ✅ Switched to: ${currentBackend}`);
          
          const result = await test.testFn(backend);
          testResults[backend] = result;
          
          if (result.success) {
            console.log(`    ✅ ${result.gateName}: ${result.result}`);
            console.log(`    📊 Constraints: ${result.constraintCount}`);
            console.log(`    ⏱️  Time: ${result.executionTime.toFixed(2)}ms`);
            console.log(`    🔍 Properties: ${result.properties?.length || 0} checks`);
            
            if (result.properties) {
              result.properties.forEach(prop => {
                const status = prop.passed ? '✅' : '❌';
                console.log(`      ${status} ${prop.property}: ${prop.description}`);
              });
            }
          } else {
            console.log(`    ❌ Failed: ${result.error}`);
          }
          
        } catch (error) {
          console.error(`    💥 Error with ${backend}:`, error.message);
          testResults[backend] = {
            success: false,
            error: error.message,
            backend
          };
        }
      }
      
      // Compare results
      console.log('  📊 COMPARISON:');
      if (testResults.snarky && testResults.sparky && 
          testResults.snarky.success && testResults.sparky.success) {
        
        const resultMatch = testResults.snarky.result === testResults.sparky.result;
        const propertiesMatch = testResults.snarky.allPropertiesPassed && testResults.sparky.allPropertiesPassed;
        const constraintDiff = testResults.sparky.constraintCount - testResults.snarky.constraintCount;
        
        console.log(`    ${resultMatch ? '✅' : '❌'} Result Parity: ${resultMatch ? 'MATCH' : 'MISMATCH'}`);
        console.log(`    ${propertiesMatch ? '✅' : '❌'} Properties: ${propertiesMatch ? 'ALL PASS' : 'SOME FAIL'}`);
        console.log(`    📊 Constraints: Snarky ${testResults.snarky.constraintCount} vs Sparky ${testResults.sparky.constraintCount} (${constraintDiff > 0 ? '+' : ''}${constraintDiff})`);
        
        if (constraintDiff < 0) {
          console.log(`    🎉 OPTIMIZATION: Sparky uses ${Math.abs(constraintDiff)} fewer constraints!`);
          summary.optimizations++;
        } else if (constraintDiff > 0) {
          console.log(`    ⚠️  REGRESSION: Sparky uses ${constraintDiff} more constraints`);
          summary.regressions++;
        } else {
          console.log(`    ⚖️  PARITY: Same constraint count`);
        }
        
        const speedRatio = testResults.snarky.executionTime / testResults.sparky.executionTime;
        if (speedRatio > 1.2) {
          console.log(`    🚀 Performance: Sparky ${speedRatio.toFixed(2)}x faster`);
        } else if (speedRatio < 0.8) {
          console.log(`    🐌 Performance: Sparky ${(1/speedRatio).toFixed(2)}x slower`);
        } else {
          console.log(`    ⚖️  Performance: Similar speed`);
        }
        
        if (resultMatch && propertiesMatch) {
          summary.passedTests++;
          summary.parityMatches++;
        } else {
          summary.failedTests++;
        }
        
      } else {
        console.log(`    ❌ COMPARISON FAILED: One or both backends failed`);
        summary.failedTests++;
      }
      
      allResults[test.name] = testResults;
      console.log('');
    }
    
    // Final summary
    console.log('🎯 COMPREHENSIVE GATE PARITY SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passedTests} (${(summary.passedTests / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${summary.failedTests} (${(summary.failedTests / summary.totalTests * 100).toFixed(1)}%)`);
    console.log(`🔗 Parity Matches: ${summary.parityMatches} / ${summary.totalTests}`);
    console.log(`🎉 Optimizations: ${summary.optimizations}`);
    console.log(`⚠️  Regressions: ${summary.regressions}`);
    
    console.log('');
    console.log('📋 GATE-BY-GATE RESULTS:');
    for (const [testName, results] of Object.entries(allResults)) {
      if (results.snarky && results.sparky && results.snarky.success && results.sparky.success) {
        const resultMatch = results.snarky.result === results.sparky.result;
        const constraintDiff = results.sparky.constraintCount - results.snarky.constraintCount;
        const status = resultMatch ? '✅' : '❌';
        const optStatus = constraintDiff < 0 ? '🎉' : constraintDiff > 0 ? '⚠️' : '⚖️';
        console.log(`  ${status} ${optStatus} ${testName}: ${resultMatch ? 'PASS' : 'FAIL'} (${constraintDiff > 0 ? '+' : ''}${constraintDiff} constraints)`);
      } else {
        console.log(`  ❌ ❌ ${testName}: FAIL (backend error)`);
      }
    }
    
    const overallSuccess = summary.passedTests === summary.totalTests;
    
    console.log('');
    console.log('='.repeat(60));
    if (overallSuccess) {
      console.log('🎉 ALL GATE PARITY TESTS PASSED!');
      console.log('✅ Snarky and Sparky backends have full mathematical parity');
    } else {
      console.log('⚠️  SOME GATE PARITY TESTS FAILED');
      console.log(`📊 Success Rate: ${(summary.passedTests / summary.totalTests * 100).toFixed(1)}%`);
    }
    
    return overallSuccess;
    
  } catch (error) {
    console.error('💥 Gate parity testing failed:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Run the tests
runGateParityTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 UNEXPECTED ERROR:', error);
  process.exit(1);
});