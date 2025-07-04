// Simple ZkProgram Compilation Comparison
//
// This focuses on measuring compilation times for basic ZkPrograms
// that are more likely to work with both backends.

import { Field, ZkProgram, Proof } from './dist/node/index.js';
import { switchBackend, getCurrentBackend } from './dist/node/index.js';

// Test configuration
const TEST_CONFIG = {
    iterations: 3,
    timeoutMs: 30000, // 30 second timeout
};

/**
 * Measures execution time with timeout
 */
async function measureTimeAsync(fn, label, timeoutMs = 30000) {
    const start = process.hrtime.bigint();
    
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        
        const result = await Promise.race([fn(), timeoutPromise]);
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        
        return { success: true, durationMs, result };
    } catch (error) {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        console.error(`❌ ${label} failed after ${durationMs.toFixed(2)}ms:`, error.message);
        return { success: false, durationMs, error: error.message };
    }
}

// Very simple ZkProgram that should work with both backends
const SimpleAddition = ZkProgram({
    name: 'SimpleAddition',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
        add: {
            privateInputs: [Field],
            async method(publicInput, privateInput) {
                return publicInput.add(privateInput);
            },
        },
    },
});

const SimpleMultiplication = ZkProgram({
    name: 'SimpleMultiplication', 
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
        multiply: {
            privateInputs: [Field],
            async method(publicInput, privateInput) {
                return publicInput.mul(privateInput);
            },
        },
    },
});

const BasicArithmetic = ZkProgram({
    name: 'BasicArithmetic',
    publicInput: Field,
    publicOutput: Field,
    
    methods: {
        calculate: {
            privateInputs: [Field, Field],
            async method(publicInput, a, b) {
                const sum = publicInput.add(a);
                const product = sum.mul(b);
                return product;
            },
        },
    },
});

const TEST_PROGRAMS = [
    { name: 'SimpleAddition', program: SimpleAddition },
    { name: 'SimpleMultiplication', program: SimpleMultiplication },
    { name: 'BasicArithmetic', program: BasicArithmetic },
];

/**
 * Test ZkProgram compilation for a backend
 */
async function testZkProgramCompilation(backendName) {
    console.log(`\n📊 Testing ${backendName} ZkProgram Compilation:`);
    
    await switchBackend(backendName);
    const currentBackend = getCurrentBackend();
    console.log(`   Current backend: ${currentBackend}`);
    
    const results = {};
    
    for (const { name, program } of TEST_PROGRAMS) {
        console.log(`\n   Testing ${name}...`);
        
        const compilationTimes = [];
        
        for (let i = 0; i < TEST_CONFIG.iterations; i++) {
            console.log(`     Run ${i + 1}/${TEST_CONFIG.iterations}...`);
            
            const measurement = await measureTimeAsync(
                async () => {
                    // Create a fresh instance for each test
                    await program.compile();
                    return 'compiled';
                },
                `${name} compilation run ${i + 1}`,
                TEST_CONFIG.timeoutMs
            );
            
            if (measurement.success) {
                compilationTimes.push(measurement.durationMs);
                console.log(`       ✅ ${measurement.durationMs.toFixed(2)}ms`);
            } else {
                console.log(`       ❌ Failed after ${measurement.durationMs.toFixed(2)}ms`);
            }
        }
        
        if (compilationTimes.length > 0) {
            const avgTime = compilationTimes.reduce((a, b) => a + b, 0) / compilationTimes.length;
            const minTime = Math.min(...compilationTimes);
            const maxTime = Math.max(...compilationTimes);
            
            results[name] = {
                average: avgTime,
                min: minTime,
                max: maxTime,
                times: compilationTimes,
                successfulRuns: compilationTimes.length,
                totalRuns: TEST_CONFIG.iterations,
            };
            
            console.log(`     Summary: avg=${avgTime.toFixed(2)}ms, min=${minTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);
            console.log(`     Success rate: ${compilationTimes.length}/${TEST_CONFIG.iterations}`);
        } else {
            results[name] = {
                error: 'All compilation attempts failed',
                successfulRuns: 0,
                totalRuns: TEST_CONFIG.iterations,
            };
            console.log(`     ❌ All attempts failed`);
        }
    }
    
    return results;
}

/**
 * Compare ZkProgram compilation results
 */
function compareZkProgramResults(sparkyResults, snarkyResults) {
    console.log(`\n📈 ZkProgram Compilation Comparison:`);
    console.log(`${'='*80}`);
    
    const comparisonData = [];
    
    for (const programName of Object.keys(sparkyResults)) {
        const sparkyData = sparkyResults[programName];
        const snarkyData = snarkyResults[programName];
        
        console.log(`\n🔍 ${programName}:`);
        
        if (sparkyData.average && snarkyData.average) {
            const sparkyTime = sparkyData.average;
            const snarkyTime = snarkyData.average;
            const ratio = sparkyTime / snarkyTime;
            const percentDiff = ((sparkyTime - snarkyTime) / snarkyTime * 100);
            
            console.log(`   Sparky: ${sparkyTime.toFixed(2)}ms (${sparkyData.successfulRuns}/${sparkyData.totalRuns} successful)`);
            console.log(`   Snarky: ${snarkyTime.toFixed(2)}ms (${snarkyData.successfulRuns}/${snarkyData.totalRuns} successful)`);
            console.log(`   Ratio: ${ratio.toFixed(2)}x ${ratio > 1 ? '(Sparky slower)' : '(Sparky faster)'}`);
            console.log(`   Difference: ${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%`);
            
            if (ratio < 0.9) {
                console.log(`   ✅ Sparky is ${(1/ratio).toFixed(2)}x faster`);
            } else if (ratio > 1.1) {
                console.log(`   ⚠️ Sparky is ${ratio.toFixed(2)}x slower`);
            } else {
                console.log(`   ⚖️ Performance is similar`);
            }
            
            comparisonData.push({
                program: programName,
                sparkyTime,
                snarkyTime,
                ratio,
                percentDiff,
                sparkySuccess: sparkyData.successfulRuns,
                snarkySuccess: snarkyData.successfulRuns,
            });
        } else {
            console.log(`   ❌ Cannot compare - incomplete data`);
            if (sparkyData.error) {
                console.log(`     Sparky: ${sparkyData.error}`);
            }
            if (snarkyData.error) {
                console.log(`     Snarky: ${snarkyData.error}`);
            }
        }
    }
    
    // Overall statistics
    if (comparisonData.length > 0) {
        console.log(`\n📊 Overall ZkProgram Compilation Statistics:`);
        console.log(`${'='*60}`);
        
        const avgRatio = comparisonData.reduce((sum, d) => sum + d.ratio, 0) / comparisonData.length;
        const avgPercentDiff = comparisonData.reduce((sum, d) => sum + d.percentDiff, 0) / comparisonData.length;
        
        const sparkyFaster = comparisonData.filter(d => d.ratio < 1).length;
        const snarkyFaster = comparisonData.filter(d => d.ratio > 1).length;
        const similar = comparisonData.filter(d => Math.abs(d.ratio - 1) < 0.1).length;
        
        console.log(`   Programs tested: ${comparisonData.length}`);
        console.log(`   Average ratio: ${avgRatio.toFixed(2)}x`);
        console.log(`   Average difference: ${avgPercentDiff > 0 ? '+' : ''}${avgPercentDiff.toFixed(1)}%`);
        console.log(`   Sparky faster: ${sparkyFaster}/${comparisonData.length} programs`);
        console.log(`   Snarky faster: ${snarkyFaster}/${comparisonData.length} programs`);
        console.log(`   Similar: ${similar}/${comparisonData.length} programs`);
        
        if (avgRatio < 0.9) {
            console.log(`   🎉 Overall: Sparky is ${(1/avgRatio).toFixed(2)}x faster on average`);
        } else if (avgRatio > 1.1) {
            console.log(`   📝 Overall: Sparky is ${avgRatio.toFixed(2)}x slower on average`);
        } else {
            console.log(`   ⚖️ Overall: Performance is similar on average`);
        }
        
        // Success rate comparison
        const totalSparkySuccess = comparisonData.reduce((sum, d) => sum + d.sparkySuccess, 0);
        const totalSnarkySuccess = comparisonData.reduce((sum, d) => sum + d.snarkySuccess, 0);
        const totalTests = comparisonData.length * TEST_CONFIG.iterations;
        
        console.log(`\n   🎯 Reliability:`);
        console.log(`   Sparky success rate: ${(totalSparkySuccess / totalTests * 100).toFixed(1)}%`);
        console.log(`   Snarky success rate: ${(totalSnarkySuccess / totalTests * 100).toFixed(1)}%`);
    }
    
    return comparisonData;
}

/**
 * Main execution function
 */
async function runZkProgramComparison() {
    console.log('🚀 Simple ZkProgram Compilation Comparison: Sparky vs Snarky');
    console.log(`${'='*80}`);
    console.log(`Test Configuration:`);
    console.log(`  Iterations per program: ${TEST_CONFIG.iterations}`);
    console.log(`  Timeout per compilation: ${TEST_CONFIG.timeoutMs}ms`);
    console.log(`  Programs to test: ${TEST_PROGRAMS.length}`);
    
    try {
        // Test Sparky
        const sparkyResults = await testZkProgramCompilation('sparky');
        
        // Test Snarky
        const snarkyResults = await testZkProgramCompilation('snarky');
        
        // Compare results
        const comparisonData = compareZkProgramResults(sparkyResults, snarkyResults);
        
        // Export results
        const fullResults = {
            testConfig: TEST_CONFIG,
            timestamp: new Date().toISOString(),
            sparky: sparkyResults,
            snarky: snarkyResults,
            comparison: comparisonData,
        };
        
        // Save to file
        const fs = await import('fs');
        const resultsFile = 'zkprogram-simple-comparison-results.json';
        fs.writeFileSync(resultsFile, JSON.stringify(fullResults, null, 2));
        console.log(`\n💾 Results saved to: ${resultsFile}`);
        
        return fullResults;
        
    } catch (error) {
        console.error('❌ ZkProgram comparison failed:', error);
        throw error;
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runZkProgramComparison()
        .then(() => {
            console.log('\n✅ ZkProgram comparison completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ ZkProgram comparison failed:', error);
            process.exit(1);
        });
}

export { runZkProgramComparison };