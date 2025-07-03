// Simple Compilation Time Comparison: Sparky vs Snarky
//
// This script measures basic constraint generation and compilation performance
// differences between Sparky and Snarky backends using simple field operations.

import { Field, Bool, Provable } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test configuration
const TEST_CONFIG = {
    iterations: 5,  // Number of iterations per test
    operations: [10, 25, 50, 100],  // Different operation counts to test
};

/**
 * Measures execution time of a function
 */
function measureTime(fn, label) {
    const start = process.hrtime.bigint();
    try {
        const result = fn();
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        return { success: true, durationMs, result };
    } catch (error) {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        console.error(`❌ ${label} failed:`, error.message);
        return { success: false, durationMs, error: error.message };
    }
}

/**
 * Create a chain of field operations for testing
 */
function createOperationChain(operationCount) {
    return function() {
        // Start with initial values
        let a = Field(5);
        let b = Field(7);
        let result = Field(1);
        
        // Create a chain of operations
        for (let i = 0; i < operationCount; i++) {
            if (i % 3 === 0) {
                // Multiplication
                result = result.mul(a);
            } else if (i % 3 === 1) {
                // Addition  
                result = result.add(b);
            } else {
                // Subtraction
                result = result.sub(Field(1));
            }
            
            // Occasionally create new intermediate values
            if (i % 5 === 0) {
                a = a.add(Field(1));
            }
            if (i % 7 === 0) {
                b = b.mul(Field(2));
            }
        }
        
        return result;
    };
}

/**
 * Create field operations with assertions
 */
function createAssertionChain(operationCount) {
    return function() {
        let a = Field(3);
        let b = Field(4);
        
        for (let i = 0; i < operationCount; i++) {
            // Create operations
            const sum = a.add(b);
            const product = a.mul(b);
            
            // Add assertions to create constraints
            sum.assertEquals(a.add(b));
            
            if (i % 2 === 0) {
                product.assertEquals(a.mul(b));
            }
            
            // Update values for next iteration
            a = sum.add(Field(1));
            b = product.add(Field(1));
        }
        
        return a.add(b);
    };
}

/**
 * Test constraint generation performance for a single backend
 */
async function testBackendConstraints(backendName) {
    console.log(`\n📊 Testing ${backendName} Backend Constraint Generation:`);
    
    await switchBackend(backendName);
    const currentBackend = getCurrentBackend();
    console.log(`   Current backend: ${currentBackend}`);
    
    const results = {
        operationChains: {},
        assertionChains: {},
    };
    
    // Test operation chains
    console.log(`\n   🔗 Operation Chain Tests:`);
    for (const opCount of TEST_CONFIG.operations) {
        console.log(`     Testing ${opCount} operations...`);
        
        const times = [];
        for (let i = 0; i < TEST_CONFIG.iterations; i++) {
            const measurement = measureTime(
                createOperationChain(opCount),
                `${backendName} operation chain ${opCount} ops run ${i + 1}`
            );
            
            if (measurement.success) {
                times.push(measurement.durationMs);
            }
        }
        
        if (times.length > 0) {
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            results.operationChains[opCount] = {
                average: avgTime,
                min: minTime,
                max: maxTime,
                times: times,
                successCount: times.length,
            };
            
            console.log(`       Average: ${avgTime.toFixed(3)}ms (${times.length}/${TEST_CONFIG.iterations} successful)`);
        } else {
            results.operationChains[opCount] = {
                error: 'All attempts failed',
                successCount: 0,
            };
        }
    }
    
    // Test assertion chains
    console.log(`\n   ✅ Assertion Chain Tests:`);
    for (const opCount of TEST_CONFIG.operations) {
        console.log(`     Testing ${opCount} assertions...`);
        
        const times = [];
        for (let i = 0; i < TEST_CONFIG.iterations; i++) {
            const measurement = measureTime(
                createAssertionChain(opCount),
                `${backendName} assertion chain ${opCount} ops run ${i + 1}`
            );
            
            if (measurement.success) {
                times.push(measurement.durationMs);
            }
        }
        
        if (times.length > 0) {
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            results.assertionChains[opCount] = {
                average: avgTime,
                min: minTime,
                max: maxTime,
                times: times,
                successCount: times.length,
            };
            
            console.log(`       Average: ${avgTime.toFixed(3)}ms (${times.length}/${TEST_CONFIG.iterations} successful)`);
        } else {
            results.assertionChains[opCount] = {
                error: 'All attempts failed',
                successCount: 0,
            };
        }
    }
    
    return results;
}

/**
 * Compare constraint generation results
 */
function compareConstraintResults(sparkyResults, snarkyResults) {
    console.log(`\n📈 Constraint Generation Performance Comparison:`);
    console.log(`${'='*80}`);
    
    const testTypes = ['operationChains', 'assertionChains'];
    const comparisonData = {};
    
    for (const testType of testTypes) {
        console.log(`\n🔍 ${testType.charAt(0).toUpperCase() + testType.slice(1)}:`);
        comparisonData[testType] = {};
        
        for (const opCount of TEST_CONFIG.operations) {
            const sparkyData = sparkyResults[testType][opCount];
            const snarkyData = snarkyResults[testType][opCount];
            
            console.log(`\n   ${opCount} operations:`);
            
            if (sparkyData?.average && snarkyData?.average) {
                const sparkyTime = sparkyData.average;
                const snarkyTime = snarkyData.average;
                const ratio = sparkyTime / snarkyTime;
                const percentDiff = ((sparkyTime - snarkyTime) / snarkyTime * 100);
                
                console.log(`     Sparky: ${sparkyTime.toFixed(3)}ms (${sparkyData.successCount}/${TEST_CONFIG.iterations})`);
                console.log(`     Snarky: ${snarkyTime.toFixed(3)}ms (${snarkyData.successCount}/${TEST_CONFIG.iterations})`);
                console.log(`     Ratio: ${ratio.toFixed(2)}x ${ratio > 1 ? '(Sparky slower)' : '(Sparky faster)'}`);
                console.log(`     Difference: ${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%`);
                
                comparisonData[testType][opCount] = {
                    sparkyTime,
                    snarkyTime,
                    ratio,
                    percentDiff,
                    sparkySuccess: sparkyData.successCount,
                    snarkySuccess: snarkyData.successCount,
                };
                
                if (ratio < 0.9) {
                    console.log(`     ✅ Sparky is significantly faster`);
                } else if (ratio > 1.1) {
                    console.log(`     ⚠️ Sparky is significantly slower`);
                } else {
                    console.log(`     ⚖️ Performance is similar`);
                }
            } else {
                console.log(`     ❌ Cannot compare - missing data`);
                if (sparkyData?.error) {
                    console.log(`       Sparky: ${sparkyData.error}`);
                }
                if (snarkyData?.error) {
                    console.log(`       Snarky: ${snarkyData.error}`);
                }
            }
        }
    }
    
    // Overall statistics
    console.log(`\n📊 Overall Performance Summary:`);
    console.log(`${'='*50}`);
    
    const allComparisons = [];
    for (const testType of testTypes) {
        for (const opCount of TEST_CONFIG.operations) {
            const data = comparisonData[testType][opCount];
            if (data?.ratio) {
                allComparisons.push({
                    testType,
                    opCount,
                    ...data
                });
            }
        }
    }
    
    if (allComparisons.length > 0) {
        const avgRatio = allComparisons.reduce((sum, d) => sum + d.ratio, 0) / allComparisons.length;
        const avgPercentDiff = allComparisons.reduce((sum, d) => sum + d.percentDiff, 0) / allComparisons.length;
        
        const sparkyFaster = allComparisons.filter(d => d.ratio < 1).length;
        const snarkyFaster = allComparisons.filter(d => d.ratio > 1).length;
        const similar = allComparisons.filter(d => Math.abs(d.ratio - 1) < 0.1).length;
        
        console.log(`   Valid comparisons: ${allComparisons.length}`);
        console.log(`   Average performance ratio: ${avgRatio.toFixed(3)}x`);
        console.log(`   Average difference: ${avgPercentDiff > 0 ? '+' : ''}${avgPercentDiff.toFixed(1)}%`);
        console.log(`   Sparky faster: ${sparkyFaster}/${allComparisons.length} tests`);
        console.log(`   Snarky faster: ${snarkyFaster}/${allComparisons.length} tests`);
        console.log(`   Similar performance: ${similar}/${allComparisons.length} tests`);
        
        if (avgRatio < 0.9) {
            console.log(`   🎉 Overall: Sparky is ${(1/avgRatio).toFixed(2)}x faster on average`);
        } else if (avgRatio > 1.1) {
            console.log(`   📝 Overall: Sparky is ${avgRatio.toFixed(2)}x slower on average`);
        } else {
            console.log(`   ⚖️ Overall: Performance is similar on average`);
        }
        
        // Performance by operation count
        console.log(`\n   Performance scaling:`);
        for (const opCount of TEST_CONFIG.operations) {
            const opComparisons = allComparisons.filter(d => d.opCount === opCount);
            if (opComparisons.length > 0) {
                const opAvgRatio = opComparisons.reduce((sum, d) => sum + d.ratio, 0) / opComparisons.length;
                console.log(`     ${opCount} ops: ${opAvgRatio.toFixed(3)}x average ratio`);
            }
        }
    }
    
    return comparisonData;
}

/**
 * Main test execution
 */
async function runConstraintComparison() {
    console.log('🚀 Simple Compilation Time Comparison: Sparky vs Snarky');
    console.log(`${'='*80}`);
    console.log(`Test Configuration:`);
    console.log(`  Iterations per test: ${TEST_CONFIG.iterations}`);
    console.log(`  Operation counts: ${TEST_CONFIG.operations.join(', ')}`);
    console.log(`  Test types: Operation chains, Assertion chains`);
    
    try {
        // Test Sparky backend
        const sparkyResults = await testBackendConstraints('sparky');
        
        // Test Snarky backend  
        const snarkyResults = await testBackendConstraints('snarky');
        
        // Compare results
        const comparisonData = compareConstraintResults(sparkyResults, snarkyResults);
        
        // Export results
        const fullResults = {
            testConfig: TEST_CONFIG,
            timestamp: new Date().toISOString(),
            sparky: sparkyResults,
            snarky: snarkyResults,
            comparison: comparisonData,
        };
        
        // Save results to file
        const fs = await import('fs');
        const resultsFile = 'constraint-generation-comparison-results.json';
        fs.writeFileSync(resultsFile, JSON.stringify(fullResults, null, 2));
        console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
        
        return fullResults;
        
    } catch (error) {
        console.error('❌ Constraint comparison failed:', error);
        throw error;
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runConstraintComparison()
        .then(() => {
            console.log('\n✅ Constraint generation comparison completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Constraint generation comparison failed:', error);
            process.exit(1);
        });
}

export { runConstraintComparison, compareConstraintResults };