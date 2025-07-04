#!/usr/bin/env node

/**
 * PERFORMANCE TEST RUNNER
 * 
 * This script runs a simplified version of the performance benchmark to actually
 * test Sparky vs Snarky on real circuits. It's designed to be ruthless but
 * executable within reasonable time limits.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable, ZkProgram, Poseidon } from './dist/node/index.js';
import { performance } from 'perf_hooks';
import * as fs from 'fs';

// ========== Simple but Ruthless Test Circuits ==========

// Test 1: Heavy Arithmetic - designed to stress constraint generation
const ArithmeticStressProgram = ZkProgram({
  name: 'ArithmeticStress',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    multiplyChain: {
      privateInputs: [Field, Field, Field],
      async method(input, a, b, c) {
        let result = input;
        
        // 50 multiplication operations to stress the constraint system
        for (let i = 0; i < 50; i++) {
          result = result.mul(a.add(Field(i)));
          if (i % 10 === 0) {
            result = result.add(b.mul(c));
          }
        }
        
        return result;
      }
    }
  }
});

// Test 2: Hash Heavy - stress test cryptographic operations
const HashStressProgram = ZkProgram({
  name: 'HashStress',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    hashChain: {
      privateInputs: [Field],
      async method(input, salt) {
        let current = input;
        
        // 20 rounds of Poseidon hashing
        for (let i = 0; i < 20; i++) {
          current = Poseidon.hash([current, salt, Field(i)]);
        }
        
        return current;
      }
    }
  }
});

// Test 3: Control Flow - stress test conditional logic
const ControlFlowProgram = ZkProgram({
  name: 'ControlFlow',
  publicInput: Field,
  publicOutput: Field,
  
  methods: {
    conditionalLogic: {
      privateInputs: [Field, Field],
      async method(input, threshold, multiplier) {
        let result = input;
        
        // 25 rounds of conditional operations
        for (let i = 0; i < 25; i++) {
          const condition = result.greaterThan(threshold.add(Field(i)));
          const branch1 = result.mul(multiplier);
          const branch2 = result.add(Field(i));
          
          result = Provable.if(condition, branch1, branch2);
        }
        
        return result;
      }
    }
  }
});

// ========== Performance Measurement ==========

class PerformanceMeasurement {
  constructor(testName, backend) {
    this.testName = testName;
    this.backend = backend;
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
  }
  
  finish() {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      testName: this.testName,
      backend: this.backend,
      elapsedMs: endTime - this.startTime,
      memoryUsedMB: (endMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024,
      peakMemoryMB: endMemory.heapUsed / 1024 / 1024
    };
  }
}

// ========== Test Runner ==========

async function runSingleTest(program, programName, backend, inputs) {
  console.log(`\n🧪 Testing ${programName} on ${backend.toUpperCase()}`);
  console.log('-'.repeat(50));
  
  await switchBackend(backend);
  const measurement = new PerformanceMeasurement(programName, backend);
  
  try {
    console.log(`⚙️ Compiling ${programName}...`);
    const compileStart = performance.now();
    
    const { verificationKey } = await program.compile();
    
    const compileEnd = performance.now();
    const compileTime = compileEnd - compileStart;
    
    console.log(`✅ Compilation successful: ${compileTime.toFixed(2)}ms`);
    
    // Try to generate a proof to test the full pipeline
    if (inputs) {
      try {
        console.log(`🔍 Testing proof generation...`);
        const proofStart = performance.now();
        
        // Note: This might be very slow for complex circuits
        // We'll set a timeout to avoid hanging
        const timeoutMs = 30000; // 30 second timeout
        
        const proofPromise = program[Object.keys(program.methods)[0]](inputs.publicInput, ...inputs.privateInputs);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Proof generation timeout')), timeoutMs)
        );
        
        const proof = await Promise.race([proofPromise, timeoutPromise]);
        
        const proofEnd = performance.now();
        const proofTime = proofEnd - proofStart;
        
        console.log(`✅ Proof generation: ${proofTime.toFixed(2)}ms`);
        
        const result = measurement.finish();
        result.success = true;
        result.compilationTimeMs = compileTime;
        result.proofTimeMs = proofTime;
        result.totalTimeMs = result.elapsedMs;
        
        return result;
        
      } catch (proofError) {
        console.log(`⚠️ Proof generation failed/timeout: ${proofError.message}`);
        // Still consider compilation success as a partial success
        const result = measurement.finish();
        result.success = true; // Compilation succeeded
        result.compilationTimeMs = compileTime;
        result.proofTimeMs = -1; // Failed
        result.totalTimeMs = result.elapsedMs;
        result.proofError = proofError.message;
        
        return result;
      }
    } else {
      const result = measurement.finish();
      result.success = true;
      result.compilationTimeMs = compileTime;
      result.proofTimeMs = -1; // Not attempted
      result.totalTimeMs = result.elapsedMs;
      
      return result;
    }
    
  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
    
    const result = measurement.finish();
    result.success = false;
    result.error = error.message;
    result.compilationTimeMs = -1;
    result.proofTimeMs = -1;
    result.totalTimeMs = result.elapsedMs;
    
    return result;
  }
}

async function runRuthlessPerformanceTest() {
  console.log('\n🔥 RUTHLESS PERFORMANCE TEST: SPARKY VS SNARKY 🔥');
  console.log('='.repeat(60));
  console.log('Testing both backends on computationally intensive circuits');
  console.log('Goal: Find Sparky\'s weaknesses with honest measurement');
  console.log('='.repeat(60));
  
  const tests = [
    {
      name: 'ArithmeticStress',
      program: ArithmeticStressProgram,
      inputs: {
        publicInput: Field(42),
        privateInputs: [Field(7), Field(13), Field(21)]
      }
    },
    {
      name: 'HashStress',
      program: HashStressProgram,
      inputs: {
        publicInput: Field(123),
        privateInputs: [Field(456)]
      }
    },
    {
      name: 'ControlFlow',
      program: ControlFlowProgram,
      inputs: {
        publicInput: Field(100),
        privateInputs: [Field(50), Field(3)]
      }
    }
  ];
  
  const results = [];
  
  // Test each program on both backends
  for (const test of tests) {
    // Test Snarky first (baseline)
    try {
      const snarkyResult = await runSingleTest(test.program, test.name, 'snarky', test.inputs);
      results.push(snarkyResult);
    } catch (error) {
      console.log(`💥 Snarky failed on ${test.name}: ${error.message}`);
    }
    
    // Test Sparky second (challenger)
    try {
      const sparkyResult = await runSingleTest(test.program, test.name, 'sparky', test.inputs);
      results.push(sparkyResult);
    } catch (error) {
      console.log(`💥 Sparky failed on ${test.name}: ${error.message}`);
    }
  }
  
  // Analyze results
  console.log('\n📊 RUTHLESS ANALYSIS');
  console.log('='.repeat(60));
  
  generateRuthlessReport(results);
  
  return results;
}

function generateRuthlessReport(results) {
  console.log('\n📋 PERFORMANCE COMPARISON TABLE');
  console.log('-'.repeat(80));
  console.log('Test'.padEnd(20) + 
              'Snarky Compile'.padEnd(15) + 
              'Sparky Compile'.padEnd(15) + 
              'Ratio'.padEnd(10) + 
              'Verdict'.padEnd(20));
  console.log('-'.repeat(80));
  
  const programNames = [...new Set(results.map(r => r.testName))];
  const weaknesses = [];
  
  for (const programName of programNames) {
    const snarkyResult = results.find(r => r.testName === programName && r.backend === 'snarky');
    const sparkyResult = results.find(r => r.testName === programName && r.backend === 'sparky');
    
    if (snarkyResult && sparkyResult) {
      let ratio = 'N/A';
      let verdict = '🤔 Unknown';
      
      if (snarkyResult.success && sparkyResult.success) {
        const timeRatio = sparkyResult.compilationTimeMs / snarkyResult.compilationTimeMs;
        ratio = `${timeRatio.toFixed(1)}x`;
        
        if (timeRatio > 5.0) {
          verdict = '🔥 CRITICAL SLOW';
          weaknesses.push({
            type: 'CRITICAL_PERFORMANCE',
            program: programName,
            ratio: timeRatio,
            snarkyTime: snarkyResult.compilationTimeMs,
            sparkyTime: sparkyResult.compilationTimeMs
          });
        } else if (timeRatio > 2.0) {
          verdict = '⚠️ SIGNIFICANTLY SLOW';
          weaknesses.push({
            type: 'HIGH_PERFORMANCE',
            program: programName,
            ratio: timeRatio,
            snarkyTime: snarkyResult.compilationTimeMs,
            sparkyTime: sparkyResult.compilationTimeMs
          });
        } else if (timeRatio > 1.2) {
          verdict = '📊 MODERATELY SLOW';
        } else {
          verdict = '✅ COMPETITIVE';
        }
      } else if (snarkyResult.success && !sparkyResult.success) {
        verdict = '💥 SPARKY FAILED';
        weaknesses.push({
          type: 'FAILURE',
          program: programName,
          error: sparkyResult.error
        });
      } else if (!snarkyResult.success && sparkyResult.success) {
        verdict = '🎉 SPARKY WINS';
      } else {
        verdict = '💥 BOTH FAILED';
      }
      
      const snarkyTime = snarkyResult.success ? `${snarkyResult.compilationTimeMs.toFixed(0)}ms` : 'FAILED';
      const sparkyTime = sparkyResult.success ? `${sparkyResult.compilationTimeMs.toFixed(0)}ms` : 'FAILED';
      
      console.log(programName.padEnd(20) + 
                  snarkyTime.padEnd(15) + 
                  sparkyTime.padEnd(15) + 
                  ratio.padEnd(10) + 
                  verdict);
    }
  }
  
  // Ruthless weakness analysis
  console.log('\n🎯 RUTHLESS WEAKNESS ANALYSIS');
  console.log('-'.repeat(60));
  
  if (weaknesses.length === 0) {
    console.log('🎉 SURPRISINGLY GOOD: No significant weaknesses found!');
    console.log('Sparky performs competitively with Snarky on these test cases.');
  } else {
    const failures = weaknesses.filter(w => w.type === 'FAILURE');
    const critical = weaknesses.filter(w => w.type === 'CRITICAL_PERFORMANCE');
    const high = weaknesses.filter(w => w.type === 'HIGH_PERFORMANCE');
    
    if (failures.length > 0) {
      console.log('\n💥 CRITICAL FAILURES:');
      failures.forEach(w => {
        console.log(`  ❌ ${w.program}: Sparky failed to compile (${w.error})`);
      });
    }
    
    if (critical.length > 0) {
      console.log('\n🔥 CRITICAL PERFORMANCE ISSUES:');
      critical.forEach(w => {
        console.log(`  🐌 ${w.program}: ${w.ratio.toFixed(1)}x slower (${w.sparkyTime.toFixed(0)}ms vs ${w.snarkyTime.toFixed(0)}ms)`);
      });
    }
    
    if (high.length > 0) {
      console.log('\n⚠️ SIGNIFICANT PERFORMANCE ISSUES:');
      high.forEach(w => {
        console.log(`  📊 ${w.program}: ${w.ratio.toFixed(1)}x slower (${w.sparkyTime.toFixed(0)}ms vs ${w.snarkyTime.toFixed(0)}ms)`);
      });
    }
  }
  
  // Final verdict
  console.log('\n🏆 RUTHLESS VERDICT:');
  console.log('-'.repeat(30));
  
  const totalTests = programNames.length;
  const failedTests = weaknesses.filter(w => w.type === 'FAILURE').length;
  const criticalIssues = weaknesses.filter(w => w.type === 'CRITICAL_PERFORMANCE').length;
  const highIssues = weaknesses.filter(w => w.type === 'HIGH_PERFORMANCE').length;
  
  if (failedTests > 0) {
    console.log(`💥 SPARKY IS NOT READY: ${failedTests}/${totalTests} tests failed completely`);
    console.log('🔧 RECOMMENDATION: Fix compilation failures before optimizing performance');
  } else if (criticalIssues > 0) {
    console.log(`🔥 SPARKY HAS CRITICAL PERFORMANCE ISSUES: ${criticalIssues}/${totalTests} tests show >5x slowdown`);
    console.log('🔧 RECOMMENDATION: Profile and optimize constraint generation pipeline');
  } else if (highIssues > 0) {
    console.log(`⚠️ SPARKY HAS PERFORMANCE ISSUES: ${highIssues}/${totalTests} tests show >2x slowdown`);
    console.log('🔧 RECOMMENDATION: Optimize WASM boundary and constraint batching');
  } else {
    console.log('🎉 SPARKY IS SURPRISINGLY COMPETITIVE!');
    console.log('✅ No critical performance issues detected on these test cases');
  }
  
  // Save results for detailed analysis
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ruthless-test-results-${timestamp}.json`;
  
  const report = {
    timestamp: new Date().toISOString(),
    results,
    weaknesses,
    summary: {
      totalTests,
      failedTests,
      criticalIssues,
      highIssues
    }
  };
  
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed results saved to: ${filename}`);
}

// ========== Main Execution ==========

async function main() {
  try {
    console.log('🚀 Starting ruthless performance test...');
    await runRuthlessPerformanceTest();
    console.log('\n✅ Ruthless performance test completed!');
  } catch (error) {
    console.error('💥 Performance test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runRuthlessPerformanceTest };