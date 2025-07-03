// ZkProgram Compilation Time Comparison: Sparky vs Snarky
//
// This script measures and compares compilation times for various ZkProgram patterns
// between the Sparky and Snarky backends to evaluate real-world performance differences.

import { Field, Bool, ZkProgram, verify, Provable } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test configuration
const TEST_CONFIG = {
    iterations: 3,  // Number of iterations per test for averaging
    warmupRuns: 1,  // Warmup runs to stabilize JIT
    timeoutMs: 60000, // 60 second timeout per compilation
};

/**
 * Measures execution time of an async function
 */
async function measureTime(fn, label) {
    const start = process.hrtime.bigint();
    try {
        const result = await fn();
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
 * Simple arithmetic ZkProgram for basic performance testing
 */
const SimpleArithmetic = ZkProgram({
    name: 'SimpleArithmetic',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
        add: {
            privateInputs: [Field],
            async method(publicInput, privateInput) {
                const result = publicInput.add(privateInput);
                return result;
            },
        },
        
        multiply: {
            privateInputs: [Field],
            async method(publicInput, privateInput) {
                const result = publicInput.mul(privateInput);
                return result;
            },
        },
    },
});

/**
 * Moderate complexity ZkProgram with multiple operations
 */
const ModerateComplexity = ZkProgram({
    name: 'ModerateComplexity',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
        complexCalculation: {
            privateInputs: [Field, Field, Field],
            async method(publicInput, a, b, c) {
                // temp1 = publicInput * a
                const temp1 = publicInput.mul(a);
                
                // temp2 = temp1 + b
                const temp2 = temp1.add(b);
                
                // temp3 = temp2 * c
                const temp3 = temp2.mul(c);
                
                // result = temp3 + publicInput
                const result = temp3.add(publicInput);
                
                return result;
            },
        },
        
        conditionalLogic: {
            privateInputs: [Field, Bool],
            async method(publicInput, privateValue, condition) {
                const result = Provable.if(
                    condition,
                    publicInput.mul(privateValue),
                    publicInput.add(privateValue)
                );
                return result;
            },
        },
    },
});

/**
 * Complex ZkProgram with nested operations and assertions
 */
const ComplexOperations = ZkProgram({
    name: 'ComplexOperations',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
        nestedCalculations: {
            privateInputs: [Field, Field, Field, Field, Field],
            async method(publicInput, a, b, c, d, e) {
                // Deep nesting: ((((publicInput * a) + b) * c) + d) * e
                const step1 = publicInput.mul(a);
                const step2 = step1.add(b);
                const step3 = step2.mul(c);
                const step4 = step3.add(d);
                const result = step4.mul(e);
                
                // Add some assertions
                step1.mul(Field(2)).assertEquals(publicInput.mul(a).mul(Field(2)));
                
                return result;
            },
        },
        
        multipleAssertions: {
            privateInputs: [Field, Field],
            async method(publicInput, x, y) {
                // Multiple operations with assertions
                const prod = x.mul(y);
                const sum = x.add(y);
                const diff = x.sub(y);
                
                // Assertions to create constraints
                prod.assertEquals(x.mul(y));
                sum.assertEquals(x.add(y));
                
                const result = prod.add(sum).add(diff);
                return result.add(publicInput);
            },
        },
    },
});

/**
 * Large ZkProgram with many operations for stress testing
 */
const LargeProgram = ZkProgram({
    name: 'LargeProgram',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
        manyOperations: {
            privateInputs: [Field, Field, Field, Field, Field, Field, Field, Field],
            async method(publicInput, a, b, c, d, e, f, g, h) {
                // Chain of 20+ operations
                let result = publicInput;
                
                // First phase: multiplications
                result = result.mul(a);
                result = result.mul(b);
                result = result.mul(c);
                
                // Second phase: additions
                result = result.add(d);
                result = result.add(e);
                result = result.add(f);
                
                // Third phase: mixed operations
                result = result.mul(g);
                result = result.add(h);
                result = result.mul(a);
                result = result.add(b);
                
                // Fourth phase: more complex expressions
                const temp1 = c.mul(d);
                const temp2 = e.add(f);
                const temp3 = temp1.add(temp2);
                
                result = result.add(temp3);
                result = result.mul(g);
                result = result.add(h);
                
                // Final phase: assertions
                temp1.assertEquals(c.mul(d));
                temp2.assertEquals(e.add(f));
                
                return result;
            },
        },
    },
});

/**
 * Test programs array for systematic testing
 */
const TEST_PROGRAMS = [
    { name: 'SimpleArithmetic', program: SimpleArithmetic, methods: ['add', 'multiply'] },
    { name: 'ModerateComplexity', program: ModerateComplexity, methods: ['complexCalculation', 'conditionalLogic'] },
    { name: 'ComplexOperations', program: ComplexOperations, methods: ['nestedCalculations', 'multipleAssertions'] },
    { name: 'LargeProgram', program: LargeProgram, methods: ['manyOperations'] },
];

/**
 * Compile a ZkProgram with timeout
 */
async function compileWithTimeout(program, timeoutMs) {
    return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Compilation timeout after ${timeoutMs}ms`));
        }, timeoutMs);
        
        try {
            await program.compile();
            clearTimeout(timeout);
            resolve();
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

/**
 * Test compilation performance for a single backend
 */
async function testBackendPerformance(backendName, testPrograms) {
    console.log(`\n📊 Testing ${backendName} Backend Performance:`);
    
    await switchBackend(backendName);
    const currentBackend = getCurrentBackend();
    console.log(`   Current backend: ${currentBackend}`);
    
    const results = {};
    
    for (const { name, program, methods } of testPrograms) {
        console.log(`\n   Testing ${name}...`);
        
        const programResults = {
            compilation: null,
            methods: {},
        };
        
        // Test compilation time
        const compilationTimes = [];
        
        // Warmup run
        try {
            await compileWithTimeout(program, TEST_CONFIG.timeoutMs);
            console.log(`     Warmup compilation completed`);
        } catch (error) {
            console.log(`     Warmup compilation failed: ${error.message}`);
        }
        
        // Actual measurement runs
        for (let i = 0; i < TEST_CONFIG.iterations; i++) {
            const measurement = await measureTime(
                () => compileWithTimeout(program, TEST_CONFIG.timeoutMs),
                `${name} compilation run ${i + 1}`
            );
            
            if (measurement.success) {
                compilationTimes.push(measurement.durationMs);
                console.log(`     Run ${i + 1}: ${measurement.durationMs.toFixed(2)}ms`);
            } else {
                console.log(`     Run ${i + 1}: FAILED (${measurement.durationMs.toFixed(2)}ms)`);
            }
        }
        
        if (compilationTimes.length > 0) {
            const avgTime = compilationTimes.reduce((a, b) => a + b, 0) / compilationTimes.length;
            const minTime = Math.min(...compilationTimes);
            const maxTime = Math.max(...compilationTimes);
            
            programResults.compilation = {
                average: avgTime,
                min: minTime,
                max: maxTime,
                successfulRuns: compilationTimes.length,
                totalRuns: TEST_CONFIG.iterations,
                times: compilationTimes,
            };
            
            console.log(`     Average: ${avgTime.toFixed(2)}ms (min: ${minTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms)`);
        } else {
            programResults.compilation = {
                average: null,
                error: 'All compilation attempts failed',
                successfulRuns: 0,
                totalRuns: TEST_CONFIG.iterations,
            };
            console.log(`     ❌ All compilation attempts failed`);
        }
        
        results[name] = programResults;
    }
    
    return results;
}

/**
 * Compare results between backends
 */
function compareResults(sparkyResults, snarkyResults) {
    console.log(`\n📈 Performance Comparison Summary:`);
    console.log(`${'='*80}`);
    
    const comparisonData = [];
    
    for (const programName of Object.keys(sparkyResults)) {
        const sparkyData = sparkyResults[programName];
        const snarkyData = snarkyResults[programName];
        
        console.log(`\n🔍 ${programName}:`);
        
        if (sparkyData.compilation && snarkyData.compilation && 
            sparkyData.compilation.average !== null && snarkyData.compilation.average !== null) {
            
            const sparkyTime = sparkyData.compilation.average;
            const snarkyTime = snarkyData.compilation.average;
            const ratio = sparkyTime / snarkyTime;
            const percentDiff = ((sparkyTime - snarkyTime) / snarkyTime * 100);
            
            console.log(`   Sparky: ${sparkyTime.toFixed(2)}ms (${sparkyData.compilation.successfulRuns}/${sparkyData.compilation.totalRuns} successful)`);
            console.log(`   Snarky: ${snarkyTime.toFixed(2)}ms (${snarkyData.compilation.successfulRuns}/${snarkyData.compilation.totalRuns} successful)`);
            console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio > 1 ? '(Sparky slower)' : '(Sparky faster)'}`);
            console.log(`   Difference: ${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%`);
            
            if (ratio < 1) {
                console.log(`   ✅ Sparky is ${(1/ratio).toFixed(2)}x faster than Snarky`);
            } else if (ratio > 1) {
                console.log(`   ⚠️ Sparky is ${ratio.toFixed(2)}x slower than Snarky`);
            } else {
                console.log(`   ⚖️ Performance is equivalent`);
            }
            
            comparisonData.push({
                program: programName,
                sparkyTime,
                snarkyTime,
                ratio,
                percentDiff,
                sparkySuccess: sparkyData.compilation.successfulRuns,
                snarkySuccess: snarkyData.compilation.successfulRuns,
            });
        } else {
            console.log(`   ❌ Cannot compare - incomplete data`);
            if (sparkyData.compilation?.error) {
                console.log(`     Sparky error: ${sparkyData.compilation.error}`);
            }
            if (snarkyData.compilation?.error) {
                console.log(`     Snarky error: ${snarkyData.compilation.error}`);
            }
        }
    }
    
    // Overall statistics
    if (comparisonData.length > 0) {
        console.log(`\n📊 Overall Statistics:`);
        console.log(`${'='*50}`);
        
        const validComparisons = comparisonData.filter(d => d.ratio > 0);
        if (validComparisons.length > 0) {
            const avgRatio = validComparisons.reduce((sum, d) => sum + d.ratio, 0) / validComparisons.length;
            const avgPercentDiff = validComparisons.reduce((sum, d) => sum + d.percentDiff, 0) / validComparisons.length;
            
            const sparkyFaster = validComparisons.filter(d => d.ratio < 1).length;
            const snarkyFaster = validComparisons.filter(d => d.ratio > 1).length;
            const equivalent = validComparisons.filter(d => Math.abs(d.ratio - 1) < 0.1).length;
            
            console.log(`   Programs tested: ${validComparisons.length}`);
            console.log(`   Average ratio: ${avgRatio.toFixed(2)}x`);
            console.log(`   Average difference: ${avgPercentDiff > 0 ? '+' : ''}${avgPercentDiff.toFixed(1)}%`);
            console.log(`   Sparky faster: ${sparkyFaster}/${validComparisons.length} programs`);
            console.log(`   Snarky faster: ${snarkyFaster}/${validComparisons.length} programs`);
            console.log(`   Equivalent: ${equivalent}/${validComparisons.length} programs`);
            
            if (avgRatio < 1) {
                console.log(`   🎉 Overall: Sparky is ${(1/avgRatio).toFixed(2)}x faster on average`);
            } else if (avgRatio > 1) {
                console.log(`   📝 Overall: Sparky is ${avgRatio.toFixed(2)}x slower on average`);
            } else {
                console.log(`   ⚖️ Overall: Performance is equivalent on average`);
            }
        }
        
        // Success rate comparison
        const sparkySuccessRate = comparisonData.reduce((sum, d) => sum + d.sparkySuccess, 0) / 
                                  comparisonData.reduce((sum, d) => sum + TEST_CONFIG.iterations, 0);
        const snarkySuccessRate = comparisonData.reduce((sum, d) => sum + d.snarkySuccess, 0) / 
                                  comparisonData.reduce((sum, d) => sum + TEST_CONFIG.iterations, 0);
        
        console.log(`\n🎯 Reliability Comparison:`);
        console.log(`   Sparky success rate: ${(sparkySuccessRate * 100).toFixed(1)}%`);
        console.log(`   Snarky success rate: ${(snarkySuccessRate * 100).toFixed(1)}%`);
    }
    
    return comparisonData;
}

/**
 * Main test execution function
 */
async function runCompilationComparison() {
    console.log('🚀 ZkProgram Compilation Time Comparison: Sparky vs Snarky');
    console.log(`${'='*80}`);
    console.log(`Test Configuration:`);
    console.log(`  Iterations per test: ${TEST_CONFIG.iterations}`);
    console.log(`  Warmup runs: ${TEST_CONFIG.warmupRuns}`);
    console.log(`  Timeout per compilation: ${TEST_CONFIG.timeoutMs}ms`);
    console.log(`  Programs to test: ${TEST_PROGRAMS.length}`);
    
    try {
        // Test Sparky backend
        const sparkyResults = await testBackendPerformance('sparky', TEST_PROGRAMS);
        
        // Test Snarky backend
        const snarkyResults = await testBackendPerformance('snarky', TEST_PROGRAMS);
        
        // Compare results
        const comparisonData = compareResults(sparkyResults, snarkyResults);
        
        // Export detailed results
        const fullResults = {
            testConfig: TEST_CONFIG,
            timestamp: new Date().toISOString(),
            sparky: sparkyResults,
            snarky: snarkyResults,
            comparison: comparisonData,
        };
        
        // Save results to file
        const fs = await import('fs');
        const resultsFile = 'zkprogram-compilation-comparison-results.json';
        fs.writeFileSync(resultsFile, JSON.stringify(fullResults, null, 2));
        console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
        
        return fullResults;
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        throw error;
    }
}

// Execute the comparison if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCompilationComparison()
        .then(() => {
            console.log('\n✅ Compilation comparison completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Compilation comparison failed:', error);
            process.exit(1);
        });
}

export { runCompilationComparison, TEST_PROGRAMS, compareResults };