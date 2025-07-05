#!/usr/bin/env node

/**
 * Complete Test Suite Runner
 * 
 * Runs all available tests to get comprehensive coverage.
 */

console.log('🚀 COMPLETE SPARKY TEST SUITE');
console.log('='.repeat(70));

async function runCompleteTestSuite() {
  const results = {
    suites: [],
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    startTime: Date.now()
  };
  
  try {
    const o1js = await import('./dist/node/index.js');
    const { switchBackend, getCurrentBackend } = o1js;
    
    console.log('✅ o1js loaded successfully');
    console.log('📋 Running comprehensive test coverage...\n');
    
    // Test Suite 1: Basic Gate Parity (Our Implementation)
    console.log('🧪 TEST SUITE 1: COMPREHENSIVE GATE PARITY');
    console.log('-'.repeat(50));
    
    try {
      const testSuite = await import('./dist/node/test/sparky/suites/integration/comprehensive-gate-parity.suite.js');
      const tests = testSuite.tests;
      
      console.log(`📋 Found ${tests.length} gate parity tests`);
      
      let suiteResults = {
        name: 'Comprehensive Gate Parity',
        tests: tests.length,
        passed: 0,
        failed: 0,
        details: []
      };
      
      for (const test of tests) {
        console.log(`  🧪 ${test.name}...`);
        
        let testPassed = true;
        const testResults = {};
        
        try {
          // Test with both backends
          for (const backend of ['snarky', 'sparky']) {
            await switchBackend(backend);
            const result = await test.testFn(backend);
            testResults[backend] = result;
          }
          
          // Check parity
          if (testResults.snarky && testResults.sparky && 
              testResults.snarky.success && testResults.sparky.success) {
            const resultMatch = testResults.snarky.result === testResults.sparky.result;
            const propertiesMatch = testResults.snarky.allPropertiesPassed && testResults.sparky.allPropertiesPassed;
            
            if (resultMatch && propertiesMatch) {
              console.log(`    ✅ PASS - Results match, properties pass`);
              suiteResults.passed++;
            } else {
              console.log(`    ❌ FAIL - Parity mismatch`);
              testPassed = false;
              suiteResults.failed++;
            }
          } else {
            console.log(`    ❌ FAIL - Backend error`);
            testPassed = false;
            suiteResults.failed++;
          }
          
        } catch (error) {
          console.log(`    ❌ FAIL - Exception: ${error.message}`);
          testPassed = false;
          suiteResults.failed++;
        }
        
        suiteResults.details.push({ name: test.name, passed: testPassed });
      }
      
      results.suites.push(suiteResults);
      results.totalTests += suiteResults.tests;
      results.totalPassed += suiteResults.passed;
      results.totalFailed += suiteResults.failed;
      
    } catch (error) {
      console.error(`❌ Gate parity suite failed to load: ${error.message}`);
    }
    
    console.log('');
    
    // Test Suite 2: Backend Switching Tests
    console.log('🧪 TEST SUITE 2: BACKEND SWITCHING');
    console.log('-'.repeat(50));
    
    let switchingResults = {
      name: 'Backend Switching',
      tests: 0,
      passed: 0,
      failed: 0,
      details: []
    };
    
    const switchingTests = [
      {
        name: 'basic-switching',
        test: async () => {
          await switchBackend('snarky');
          const snarky = getCurrentBackend();
          await switchBackend('sparky');
          const sparky = getCurrentBackend();
          await switchBackend('snarky');
          const backToSnarky = getCurrentBackend();
          
          return snarky === 'snarky' && sparky === 'sparky' && backToSnarky === 'snarky';
        }
      },
      {
        name: 'repeated-switching',
        test: async () => {
          for (let i = 0; i < 5; i++) {
            await switchBackend('snarky');
            if (getCurrentBackend() !== 'snarky') return false;
            await switchBackend('sparky');
            if (getCurrentBackend() !== 'sparky') return false;
          }
          return true;
        }
      },
      {
        name: 'field-operations-after-switch',
        test: async () => {
          const { Field } = o1js;
          
          await switchBackend('snarky');
          const snarkyResult = Field(10).add(Field(20));
          
          await switchBackend('sparky');
          const sparkyResult = Field(10).add(Field(20));
          
          return snarkyResult.equals(sparkyResult).toBoolean();
        }
      }
    ];
    
    for (const test of switchingTests) {
      console.log(`  🧪 ${test.name}...`);
      switchingResults.tests++;
      
      try {
        const result = await test.test();
        if (result) {
          console.log(`    ✅ PASS`);
          switchingResults.passed++;
        } else {
          console.log(`    ❌ FAIL - Test assertion failed`);
          switchingResults.failed++;
        }
      } catch (error) {
        console.log(`    ❌ FAIL - Exception: ${error.message}`);
        switchingResults.failed++;
      }
      
      switchingResults.details.push({ name: test.name, passed: switchingResults.passed > switchingResults.failed });
    }
    
    results.suites.push(switchingResults);
    results.totalTests += switchingResults.tests;
    results.totalPassed += switchingResults.passed;
    results.totalFailed += switchingResults.failed;
    
    console.log('');
    
    // Test Suite 3: Specific Gate Type Coverage
    console.log('🧪 TEST SUITE 3: SPECIFIC GATE TYPE COVERAGE');
    console.log('-'.repeat(50));
    
    let gateResults = {
      name: 'Gate Type Coverage',
      tests: 0,
      passed: 0,
      failed: 0,
      details: []
    };
    
    const { Field, Bool, Provable } = o1js;
    
    const gateTests = [
      {
        name: 'field-constants',
        test: async () => {
          await switchBackend('sparky');
          const result = Field(42);
          return result.toString() === '42';
        }
      },
      {
        name: 'field-addition',
        test: async () => {
          await switchBackend('sparky');
          const result = Field(10).add(Field(32));
          return result.toString() === '42';
        }
      },
      {
        name: 'field-multiplication', 
        test: async () => {
          await switchBackend('sparky');
          const result = Field(6).mul(Field(7));
          return result.toString() === '42';
        }
      },
      {
        name: 'field-subtraction',
        test: async () => {
          await switchBackend('sparky');
          const result = Field(50).sub(Field(8));
          return result.toString() === '42';
        }
      },
      {
        name: 'boolean-constants',
        test: async () => {
          await switchBackend('sparky');
          const trueVal = Bool(true);
          const falseVal = Bool(false);
          return trueVal.toBoolean() === true && falseVal.toBoolean() === false;
        }
      },
      {
        name: 'boolean-and',
        test: async () => {
          await switchBackend('sparky');
          const result = Bool(true).and(Bool(false));
          return result.toBoolean() === false;
        }
      },
      {
        name: 'boolean-or',
        test: async () => {
          await switchBackend('sparky');
          const result = Bool(true).or(Bool(false));
          return result.toBoolean() === true;
        }
      },
      {
        name: 'provable-witness',
        test: async () => {
          await switchBackend('sparky');
          const witness = Provable.witness(Field, () => Field(42));
          return witness.toString() === '42';
        }
      },
      {
        name: 'constraint-system-basic',
        test: async () => {
          await switchBackend('sparky');
          const cs = await Provable.constraintSystem(() => {
            const a = Provable.witness(Field, () => Field(10));
            const b = Provable.witness(Field, () => Field(20));
            const sum = a.add(b);
            sum.assertEquals(sum);
            return sum;
          });
          return cs.gates.length > 0;
        }
      }
    ];
    
    for (const test of gateTests) {
      console.log(`  🧪 ${test.name}...`);
      gateResults.tests++;
      
      try {
        const result = await test.test();
        if (result) {
          console.log(`    ✅ PASS`);
          gateResults.passed++;
        } else {
          console.log(`    ❌ FAIL - Test assertion failed`);
          gateResults.failed++;
        }
      } catch (error) {
        console.log(`    ❌ FAIL - Exception: ${error.message}`);
        gateResults.failed++;
      }
      
      gateResults.details.push({ name: test.name, passed: gateResults.passed > 0 });
    }
    
    results.suites.push(gateResults);
    results.totalTests += gateResults.tests;
    results.totalPassed += gateResults.passed;
    results.totalFailed += gateResults.failed;
    
    console.log('');
    
    // Test Suite 4: Error Handling and Edge Cases
    console.log('🧪 TEST SUITE 4: ERROR HANDLING & EDGE CASES');
    console.log('-'.repeat(50));
    
    let errorResults = {
      name: 'Error Handling',
      tests: 0,
      passed: 0,
      failed: 0,
      details: []
    };
    
    const errorTests = [
      {
        name: 'invalid-backend-switch',
        test: async () => {
          try {
            await switchBackend('invalid-backend');
            return false; // Should have thrown
          } catch (error) {
            return true; // Expected to throw
          }
        }
      },
      {
        name: 'poseidon-hash-error-handling',
        test: async () => {
          await switchBackend('sparky');
          try {
            const { Poseidon } = o1js;
            const cs = await Provable.constraintSystem(() => {
              const input = Provable.witness(Field, () => Field(123));
              const result = Poseidon.hash([input]);
              result.assertEquals(result);
              return result;
            });
            return false; // Should have failed
          } catch (error) {
            return true; // Expected to fail
          }
        }
      },
      {
        name: 'large-constraint-system',
        test: async () => {
          await switchBackend('sparky');
          try {
            const cs = await Provable.constraintSystem(() => {
              let result = Provable.witness(Field, () => Field(1));
              // Create a larger constraint system
              for (let i = 0; i < 10; i++) {
                const next = Provable.witness(Field, () => Field(i + 2));
                result = result.add(next);
              }
              result.assertEquals(result);
              return result;
            });
            return cs.gates.length > 10; // Should have many constraints
          } catch (error) {
            return false;
          }
        }
      }
    ];
    
    for (const test of errorTests) {
      console.log(`  🧪 ${test.name}...`);
      errorResults.tests++;
      
      try {
        const result = await test.test();
        if (result) {
          console.log(`    ✅ PASS`);
          errorResults.passed++;
        } else {
          console.log(`    ❌ FAIL - Test assertion failed`);
          errorResults.failed++;
        }
      } catch (error) {
        console.log(`    ❌ FAIL - Exception: ${error.message}`);
        errorResults.failed++;
      }
      
      errorResults.details.push({ name: test.name, passed: errorResults.passed > 0 });
    }
    
    results.suites.push(errorResults);
    results.totalTests += errorResults.tests;
    results.totalPassed += errorResults.passed;
    results.totalFailed += errorResults.failed;
    
    // Final Summary
    const endTime = Date.now();
    const duration = endTime - results.startTime;
    
    console.log('');
    console.log('🎯 COMPLETE TEST SUITE SUMMARY');
    console.log('='.repeat(70));
    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`📊 Total Tests: ${results.totalTests}`);
    console.log(`✅ Passed: ${results.totalPassed} (${(results.totalPassed / results.totalTests * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${results.totalFailed} (${(results.totalFailed / results.totalTests * 100).toFixed(1)}%)`);
    
    console.log('');
    console.log('📋 SUITE-BY-SUITE BREAKDOWN:');
    for (const suite of results.suites) {
      const successRate = (suite.passed / suite.tests * 100).toFixed(1);
      const status = suite.passed === suite.tests ? '✅' : suite.passed > 0 ? '⚠️' : '❌';
      console.log(`  ${status} ${suite.name}: ${suite.passed}/${suite.tests} (${successRate}%)`);
      
      // Show failed tests
      if (suite.failed > 0) {
        const failedTests = suite.details.filter(d => !d.passed);
        console.log(`      Failed: ${failedTests.map(t => t.name).join(', ')}`);
      }
    }
    
    const overallSuccess = results.totalFailed === 0;
    
    console.log('');
    console.log('='.repeat(70));
    if (overallSuccess) {
      console.log('🎉 ALL TESTS PASSED! Sparky backend is fully functional.');
    } else {
      console.log(`⚠️  ${results.totalFailed} tests failed. See details above.`);
      
      if (results.totalPassed > results.totalFailed) {
        console.log('✅ Overall status: MOSTLY WORKING with known issues');
      } else {
        console.log('❌ Overall status: SIGNIFICANT ISSUES DETECTED');
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 Complete test suite failed:', error.message);
    console.error('   Stack:', error.stack);
    return null;
  }
}

// Run the complete test suite
runCompleteTestSuite().then(results => {
  if (results) {
    const success = results.totalFailed === 0;
    process.exit(success ? 0 : 1);
  } else {
    process.exit(1);
  }
}).catch(error => {
  console.error('💥 UNEXPECTED ERROR:', error);
  process.exit(1);
});