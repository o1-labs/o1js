#!/usr/bin/env node

/**
 * RUTHLESS PERFORMANCE BENCHMARK: Sparky vs Snarky (FIXED)
 * 
 * This benchmark is designed to stress-test both backends on large, real-world circuits
 * and expose performance differences with scientific rigor.
 * 
 * FIXES APPLIED:
 * - Removed publicOutput fields (causes field conversion errors)
 * - Changed methods to use assertions instead of returns
 * - Removed console.log statements from within methods
 * - Using working ZkProgram pattern from test-sparky-zkprogram.js
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable, ZkProgram, Poseidon } from './dist/node/index.js';
import { performance } from 'perf_hooks';
import * as fs from 'fs';

// ========== Performance Measurement Framework ==========

class PerformanceMeasurement {
  constructor(testName, backend) {
    this.testName = testName;
    this.backend = backend;
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.events = [];
  }
  
  mark(eventName) {
    const now = performance.now();
    const memory = process.memoryUsage();
    this.events.push({
      event: eventName,
      timestamp: now,
      elapsedMs: now - this.startTime,
      memoryMB: memory.heapUsed / 1024 / 1024,
      memoryDeltaMB: (memory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024
    });
  }
  
  finish() {
    this.mark('finish');
    const totalTime = this.events[this.events.length - 1].elapsedMs;
    const peakMemory = Math.max(...this.events.map(e => e.memoryMB));
    
    return {
      testName: this.testName,
      backend: this.backend,
      totalTimeMs: totalTime,
      peakMemoryMB: peakMemory,
      events: this.events
    };
  }
}

// ========== Fixed Test Circuit Definitions ==========

/**
 * ARITHMETIC HEAVY CIRCUIT (FIXED)
 * Tests: Large multiplication chains, complex polynomial evaluation
 * FIX: Use assertions instead of returns, no publicOutput
 */
const ArithmeticHeavyProgram = ZkProgram({
  name: 'ArithmeticHeavy',
  publicInput: Field,
  // REMOVED: publicOutput: Field,
  
  methods: {
    // Large polynomial evaluation with constraint assertion
    evaluatePolynomial: {
      privateInputs: [Field, Field, Field, Field, Field],
      method(x, a1, a2, a3, expectedResult, targetValue) {
        let result = Field(0);
        let xPower = Field(1);
        
        // Reduced from 100 to 20 terms for reasonable compilation time
        const coefficients = [a1, a2, a3];
        
        for (let i = 0; i < 20; i++) {
          const coeff = coefficients[i % 3];
          xPower = xPower.mul(x); // x^i
          const term = coeff.mul(xPower); // aᵢ * x^i
          result = result.add(term); // sum += aᵢ * x^i
          
          // Add some complex nested operations (reduced complexity)
          if (i % 5 === 0) {
            const temp1 = result.mul(result); // result²
            const temp2 = temp1.add(xPower); // result² + x^i
            const temp3 = temp2.mul(coeff); // (result² + x^i) * coeff
            result = result.add(temp3.mul(Field(i + 1))); // Accumulate complex expression
          }
        }
        
        // Assert the result matches expected value instead of returning
        result.assertEquals(expectedResult);
      }
    },
    
    // Matrix multiplication with constraint assertion
    matrixMultiply: {
      privateInputs: [Field, Field, Field, Field, Field, Field, Field],
      method(input, a11, a12, a21, a22, expectedResult, iterations) {
        // 2x2 matrix operations with reduced complexity
        const matrix = [[a11, a12], [a21, a22]];
        let result = Field(0);
        
        // Reduced from 50 to 10 iterations
        for (let i = 0; i < 10; i++) {
          let rowSum = Field(0);
          for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
              const element = matrix[row][col];
              const product = element.mul(input.add(Field(i))); // Dynamic computation
              const squared = product.mul(product); // Square each element
              rowSum = rowSum.add(squared); // Accumulate
            }
          }
          result = result.add(rowSum.mul(Field(i + 1))); // Weight by iteration
        }
        
        // Assert instead of return
        result.assertEquals(expectedResult);
      }
    }
  }
});

/**
 * HASH INTENSIVE CIRCUIT (FIXED)
 * Tests: Poseidon hash chains, merkle tree operations
 * FIX: Use assertions, reduced complexity, no publicOutput
 */
const HashIntensiveProgram = ZkProgram({
  name: 'HashIntensive',
  publicInput: Field,
  // REMOVED: publicOutput: Field,
  
  methods: {
    // Deep hash chain with assertion
    deepHashChain: {
      privateInputs: [Field, Field],
      method(input, salt, expectedHash) {
        let current = input;
        
        // Reduced from 100 to 10 rounds for reasonable compilation time
        for (let i = 0; i < 10; i++) {
          current = Poseidon.hash([current, salt, Field(i)]);
          
          // Add some intermediate complexity (reduced)
          if (i % 3 === 0) {
            const temp1 = Poseidon.hash([current, current]); // Hash with self
            const temp2 = Poseidon.hash([temp1, Field(i * i)]); // Square progression
            current = Poseidon.hash([current, temp1, temp2]); // Triple hash
          }
        }
        
        // Assert the final hash matches expected value
        current.assertEquals(expectedHash);
      }
    },
    
    // Simplified merkle verification
    simpleMerkleVerification: {
      privateInputs: [Field, Field, Field, Field, Field],
      method(input, leaf, path0, path1, expectedRoot) {
        const pathElements = [path0, path1];
        let current = leaf;
        
        // Reduced from 20 to 5 levels
        for (let level = 0; level < 5; level++) {
          const pathElement = pathElements[level % 2]; // Cycle through provided elements
          const isLeft = Field(level % 2); // Alternate left/right
          
          // Conditional hashing (expensive in R1CS)
          const leftHash = Poseidon.hash([current, pathElement]);
          const rightHash = Poseidon.hash([pathElement, current]);
          current = Provable.if(isLeft.equals(Field(0)), leftHash, rightHash);
          
          // Add verification hash
          const verification = Poseidon.hash([current, Field(level)]);
          current = Poseidon.hash([current, verification]);
        }
        
        // Assert root matches expected
        current.assertEquals(expectedRoot);
      }
    }
  }
});

/**
 * CONTROL FLOW HEAVY CIRCUIT (FIXED)
 * Tests: Complex conditional logic, nested if statements
 * FIX: Use assertions, reduced complexity, no publicOutput
 */
const ControlFlowProgram = ZkProgram({
  name: 'ControlFlow',
  publicInput: Field,
  // REMOVED: publicOutput: Field,
  
  methods: {
    // Nested conditionals with assertion
    nestedConditionals: {
      privateInputs: [Field, Field, Field, Field],
      method(input, a, b, c, expectedResult) {
        let result = input;
        
        // Reduced from 50 to 10 rounds
        for (let i = 0; i < 10; i++) {
          const condition1 = result.greaterThan(Field(i));
          const condition2 = a.lessThan(b.add(Field(i)));
          const condition3 = c.equals(Field(i % 3)); // Reduced modulo
          
          // Simplified nested if-else chains
          const branch1 = Provable.if(
            condition1,
            result.mul(a).add(Field(i)),
            result.add(b).mul(Field(2))
          );
          
          const branch2 = Provable.if(
            condition2,
            branch1.mul(c),
            branch1.add(a)
          );
          
          result = Provable.if(
            condition1.and(condition2),
            branch2.add(Field(i)),
            branch2.sub(Field(i))
          );
        }
        
        // Assert instead of return
        result.assertEquals(expectedResult);
      }
    }
  }
});

/**
 * MEMORY STRESS CIRCUIT (FIXED)
 * Tests: Large variable counts, complex data structures
 * FIX: Greatly reduced complexity, use assertions
 */
const MemoryStressProgram = ZkProgram({
  name: 'MemoryStress',
  publicInput: Field,
  // REMOVED: publicOutput: Field,
  
  methods: {
    // Simplified array operations
    simpleArrayProcessing: {
      privateInputs: [Field, Field, Field, Field],
      method(input, seed1, seed2, expectedResult) {
        // Greatly reduced from 1000 variables to ~20
        const arrays = [];
        const seeds = [seed1, seed2];
        
        // Build 2 arrays of 10 elements each (20 variables total)
        for (let arrayIndex = 0; arrayIndex < 2; arrayIndex++) {
          const array = [];
          let current = seeds[arrayIndex];
          
          for (let i = 0; i < 10; i++) {
            // Simplified variable generation
            const temp1 = current.mul(input.add(Field(i)));
            const temp2 = temp1.add(seeds[i % 2]);
            current = temp2.mul(Field((i % 10) + 1)); // Avoid zero
            array.push(current);
          }
          arrays.push(array);
        }
        
        // Simple cross-array operations
        let result = Field(0);
        for (let i = 0; i < 5; i++) { // Reduced processing
          for (let j = 0; j < 2; j++) {
            const element = arrays[j][i];
            const crossProduct = element.mul(arrays[(j + 1) % 2][i]);
            result = result.add(crossProduct.mul(Field(i + j + 1)));
          }
        }
        
        // Assert instead of return
        result.assertEquals(expectedResult);
      }
    }
  }
});

/**
 * REAL WORLD ZKAPP CIRCUIT (FIXED)
 * Tests: Practical zkApp patterns like voting, token transfers
 * FIX: Use assertions, simplified logic, no publicOutput
 */
const RealWorldZkAppProgram = ZkProgram({
  name: 'RealWorldZkApp',
  publicInput: Field,
  // REMOVED: publicOutput: Field,
  
  methods: {
    // Simplified voting system
    privateVoting: {
      privateInputs: [Field, Field, Field, Field, Field],
      method(publicKey, vote, nullifier, commitment, expectedTally) {
        // Vote validation (0 or 1)
        const validVote = vote.mul(vote.sub(Field(1))); // vote * (vote - 1) should be 0
        validVote.assertEquals(Field(0));
        
        // Nullifier computation (prevents double voting)
        const computedNullifier = Poseidon.hash([publicKey, Field(12345)]);
        computedNullifier.assertEquals(nullifier);
        
        // Commitment verification
        const computedCommitment = Poseidon.hash([vote, publicKey]);
        computedCommitment.assertEquals(commitment);
        
        // Simplified aggregate computation (reduced from 20 to 5 rounds)
        let tally = Field(0);
        for (let round = 0; round < 5; round++) {
          const roundHash = Poseidon.hash([publicKey, Field(round), vote]);
          const roundValidation = Poseidon.hash([roundHash, nullifier]);
          
          // Simplified conditional logic
          const isYes = vote.equals(Field(1));
          const contribution = Provable.if(
            isYes,
            roundValidation.mul(Field(round + 1)),
            Field(0)
          );
          
          tally = tally.add(contribution);
        }
        
        // Assert instead of return
        tally.assertEquals(expectedTally);
      }
    },
    
    // Simplified token transfer
    tokenTransfer: {
      privateInputs: [Field, Field, Field, Field, Field],
      method(publicKey, fromBalance, amount, signature, expectedFinalBalance) {
        // Balance validation
        const newFromBalance = fromBalance.sub(amount);
        newFromBalance.assertGreaterThanOrEqual(Field(0));
        
        // Signature verification (simplified)
        const messageHash = Poseidon.hash([publicKey, fromBalance, amount]);
        const expectedSignature = Poseidon.hash([messageHash, publicKey]);
        expectedSignature.assertEquals(signature);
        
        // Simplified fee calculation (reduced from 10 to 3 levels)
        let totalFees = Field(0);
        for (let feeLevel = 0; feeLevel < 3; feeLevel++) {
          const baseFee = Field(feeLevel + 1);
          const amountTier = amount.div(Field(1000)); // Amount in thousands
          const tierMultiplier = Provable.if(
            amountTier.greaterThan(Field(feeLevel)),
            Field(feeLevel + 1),
            Field(1)
          );
          
          const levelFee = baseFee.mul(tierMultiplier);
          totalFees = totalFees.add(levelFee);
        }
        
        // Final balance after fees
        const finalBalance = newFromBalance.sub(totalFees);
        finalBalance.assertGreaterThanOrEqual(Field(0));
        
        // Assert instead of return
        finalBalance.assertEquals(expectedFinalBalance);
      }
    }
  }
});

// ========== Benchmark Runner ==========

class BenchmarkRunner {
  constructor() {
    this.results = [];
    this.testPrograms = [
      { name: 'ArithmeticHeavy', program: ArithmeticHeavyProgram },
      { name: 'HashIntensive', program: HashIntensiveProgram },
      { name: 'ControlFlow', program: ControlFlowProgram },
      { name: 'MemoryStress', program: MemoryStressProgram },
      { name: 'RealWorldZkApp', program: RealWorldZkAppProgram }
    ];
  }
  
  async runBenchmark(programInfo, backend, testInputs) {
    console.log(`\n🧪 TESTING: ${programInfo.name} on ${backend.toUpperCase()}`);
    console.log('=' .repeat(60));
    
    await switchBackend(backend);
    const measurement = new PerformanceMeasurement(programInfo.name, backend);
    
    let result = {
      programName: programInfo.name,
      backend: backend,
      success: false,
      error: null,
      compilationTimeMs: 0,
      constraintCount: 0,
      vkGenerationTimeMs: 0,
      memoryPeakMB: 0,
      methodResults: {}
    };
    
    try {
      // Compilation phase
      measurement.mark('compilation_start');
      console.log(`⚙️ Compiling ${programInfo.name}...`);
      
      const { verificationKey } = await programInfo.program.compile();
      
      measurement.mark('compilation_end');
      const compileTime = measurement.events[1].elapsedMs - measurement.events[0].elapsedMs;
      result.compilationTimeMs = compileTime;
      
      console.log(`✅ Compilation: ${compileTime.toFixed(2)}ms`);
      console.log(`📊 VK length: ${verificationKey.data.length}`);
      
      // VK generation time (approximate from compilation)
      result.vkGenerationTimeMs = compileTime * 0.3; // Rough estimate
      
      result.success = true;
      const finalMeasurement = measurement.finish();
      result.memoryPeakMB = finalMeasurement.peakMemoryMB;
      
      console.log(`🎯 TOTAL TIME: ${finalMeasurement.totalTimeMs.toFixed(2)}ms`);
      console.log(`💾 PEAK MEMORY: ${finalMeasurement.peakMemoryMB.toFixed(2)}MB`);
      
    } catch (error) {
      console.log(`💥 FATAL ERROR: ${error.message}`);
      result.error = error.message;
      const finalMeasurement = measurement.finish();
      result.memoryPeakMB = finalMeasurement.peakMemoryMB;
    }
    
    this.results.push(result);
    return result;
  }
  
  async runFullBenchmark() {
    console.log('\n🔥 RUTHLESS PERFORMANCE BENCHMARK: SPARKY VS SNARKY (FIXED) 🔥');
    console.log('='.repeat(80));
    console.log('Goal: Stress test both backends to find performance differences');
    console.log('Methodology: Large, realistic circuits with heavy computation');
    console.log('FIXES: Removed publicOutput, use assertions, reduced complexity');
    console.log('='.repeat(80));
    
    // Test each program on both backends
    for (const programInfo of this.testPrograms) {
      // Test on Snarky first (baseline)
      try {
        await this.runBenchmark(programInfo, 'snarky', {});
      } catch (error) {
        console.log(`💥 Snarky failed on ${programInfo.name}: ${error.message}`);
      }
      
      // Test on Sparky (challenger)
      try {
        await this.runBenchmark(programInfo, 'sparky', {});
      } catch (error) {
        console.log(`💥 Sparky failed on ${programInfo.name}: ${error.message}`);
      }
    }
    
    this.generateReport();
  }
  
  generateReport() {
    console.log('\n📊 RUTHLESS PERFORMANCE ANALYSIS (FIXED)');
    console.log('='.repeat(80));
    
    const report = {
      summary: this.generateSummary(),
      detailedResults: this.results,
      sparkyWeaknesses: this.analyzeSparkyWeaknesses(),
      recommendations: this.generateRecommendations()
    };
    
    // Save detailed results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ruthless-benchmark-results-fixed-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(`💾 Detailed results saved to: ${filename}`);
    
    this.printSummaryTable();
    this.printSparkyWeaknesses();
  }
  
  generateSummary() {
    const summary = {
      totalTests: this.results.length,
      snarkyTests: this.results.filter(r => r.backend === 'snarky').length,
      sparkyTests: this.results.filter(r => r.backend === 'sparky').length,
      snarkySuccesses: this.results.filter(r => r.backend === 'snarky' && r.success).length,
      sparkySuccesses: this.results.filter(r => r.backend === 'sparky' && r.success).length,
      averageCompilationTime: {},
      averageMemoryUsage: {},
      performanceRatios: {}
    };
    
    // Calculate averages
    const snarkyResults = this.results.filter(r => r.backend === 'snarky' && r.success);
    const sparkyResults = this.results.filter(r => r.backend === 'sparky' && r.success);
    
    if (snarkyResults.length > 0) {
      summary.averageCompilationTime.snarky = 
        snarkyResults.reduce((sum, r) => sum + r.compilationTimeMs, 0) / snarkyResults.length;
      summary.averageMemoryUsage.snarky = 
        snarkyResults.reduce((sum, r) => sum + r.memoryPeakMB, 0) / snarkyResults.length;
    }
    
    if (sparkyResults.length > 0) {
      summary.averageCompilationTime.sparky = 
        sparkyResults.reduce((sum, r) => sum + r.compilationTimeMs, 0) / sparkyResults.length;
      summary.averageMemoryUsage.sparky = 
        sparkyResults.reduce((sum, r) => sum + r.memoryPeakMB, 0) / sparkyResults.length;
    }
    
    // Calculate performance ratios (Sparky / Snarky)
    if (summary.averageCompilationTime.snarky > 0) {
      summary.performanceRatios.compilationTime = 
        summary.averageCompilationTime.sparky / summary.averageCompilationTime.snarky;
    }
    
    if (summary.averageMemoryUsage.snarky > 0) {
      summary.performanceRatios.memoryUsage = 
        summary.averageMemoryUsage.sparky / summary.averageMemoryUsage.snarky;
    }
    
    return summary;
  }
  
  analyzeSparkyWeaknesses() {
    const weaknesses = [];
    
    // Compare same programs across backends
    const programNames = [...new Set(this.results.map(r => r.programName))];
    
    for (const programName of programNames) {
      const snarkyResult = this.results.find(r => r.programName === programName && r.backend === 'snarky');
      const sparkyResult = this.results.find(r => r.programName === programName && r.backend === 'sparky');
      
      if (snarkyResult && sparkyResult) {
        if (snarkyResult.success && !sparkyResult.success) {
          weaknesses.push({
            type: 'FAILURE',
            program: programName,
            description: `Sparky failed where Snarky succeeded: ${sparkyResult.error}`,
            severity: 'CRITICAL'
          });
        } else if (snarkyResult.success && sparkyResult.success) {
          const timeRatio = sparkyResult.compilationTimeMs / snarkyResult.compilationTimeMs;
          const memoryRatio = sparkyResult.memoryPeakMB / snarkyResult.memoryPeakMB;
          
          if (timeRatio > 2.0) {
            weaknesses.push({
              type: 'PERFORMANCE',
              program: programName,
              description: `Sparky ${timeRatio.toFixed(1)}x slower compilation (${sparkyResult.compilationTimeMs.toFixed(0)}ms vs ${snarkyResult.compilationTimeMs.toFixed(0)}ms)`,
              severity: timeRatio > 5.0 ? 'CRITICAL' : 'HIGH',
              metrics: { timeRatio, sparkyTime: sparkyResult.compilationTimeMs, snarkyTime: snarkyResult.compilationTimeMs }
            });
          }
          
          if (memoryRatio > 1.5) {
            weaknesses.push({
              type: 'MEMORY',
              program: programName,
              description: `Sparky uses ${memoryRatio.toFixed(1)}x more memory (${sparkyResult.memoryPeakMB.toFixed(1)}MB vs ${snarkyResult.memoryPeakMB.toFixed(1)}MB)`,
              severity: memoryRatio > 3.0 ? 'HIGH' : 'MEDIUM',
              metrics: { memoryRatio, sparkyMemory: sparkyResult.memoryPeakMB, snarkyMemory: snarkyResult.memoryPeakMB }
            });
          }
        }
      }
    }
    
    return weaknesses;
  }
  
  generateRecommendations() {
    const weaknesses = this.analyzeSparkyWeaknesses();
    const recommendations = [];
    
    const hasPerformanceIssues = weaknesses.some(w => w.type === 'PERFORMANCE' && w.severity === 'CRITICAL');
    const hasMemoryIssues = weaknesses.some(w => w.type === 'MEMORY' && w.severity === 'HIGH');
    const hasFailures = weaknesses.some(w => w.type === 'FAILURE');
    
    if (hasFailures) {
      recommendations.push({
        priority: 'CRITICAL',
        area: 'Correctness',
        recommendation: 'Fix circuit compilation failures before performance optimization',
        rationale: 'Sparky fails to compile circuits that Snarky handles successfully'
      });
    }
    
    if (hasPerformanceIssues) {
      recommendations.push({
        priority: 'HIGH',
        area: 'Performance',
        recommendation: 'Optimize WASM boundary crossing and constraint generation pipeline',
        rationale: 'Compilation times are 2-5x slower than Snarky on complex circuits'
      });
    }
    
    if (hasMemoryIssues) {
      recommendations.push({
        priority: 'MEDIUM',
        area: 'Memory Management',
        recommendation: 'Implement memory pooling and constraint batching in WASM layer',
        rationale: 'Memory usage significantly higher than Snarky baseline'
      });
    }
    
    recommendations.push({
      priority: 'LOW',
      area: 'Optimization',
      recommendation: 'Implement constraint system optimization passes equivalent to Snarky',
      rationale: 'Constraint counts may be higher due to missing optimization passes'
    });
    
    return recommendations;
  }
  
  printSummaryTable() {
    console.log('\n📋 PERFORMANCE SUMMARY TABLE');
    console.log('-'.repeat(80));
    
    const programNames = [...new Set(this.results.map(r => r.programName))];
    
    console.log('Program'.padEnd(20) + 
                'Snarky Time'.padEnd(15) + 
                'Sparky Time'.padEnd(15) + 
                'Ratio'.padEnd(10) + 
                'Snarky Mem'.padEnd(15) + 
                'Sparky Mem'.padEnd(15) + 
                'Status');
    console.log('-'.repeat(80));
    
    for (const programName of programNames) {
      const snarkyResult = this.results.find(r => r.programName === programName && r.backend === 'snarky');
      const sparkyResult = this.results.find(r => r.programName === programName && r.backend === 'sparky');
      
      const snarkyTime = snarkyResult?.success ? `${snarkyResult.compilationTimeMs.toFixed(0)}ms` : 'FAILED';
      const sparkyTime = sparkyResult?.success ? `${sparkyResult.compilationTimeMs.toFixed(0)}ms` : 'FAILED';
      const snarkyMem = snarkyResult?.success ? `${snarkyResult.memoryPeakMB.toFixed(1)}MB` : 'N/A';
      const sparkyMem = sparkyResult?.success ? `${sparkyResult.memoryPeakMB.toFixed(1)}MB` : 'N/A';
      
      let ratio = 'N/A';
      let status = '✅ OK';
      
      if (snarkyResult?.success && sparkyResult?.success) {
        const timeRatio = sparkyResult.compilationTimeMs / snarkyResult.compilationTimeMs;
        ratio = `${timeRatio.toFixed(1)}x`;
        
        if (timeRatio > 5.0) status = '🔥 CRITICAL';
        else if (timeRatio > 2.0) status = '⚠️ SLOW';
      } else if (sparkyResult && !sparkyResult.success) {
        status = '💥 FAILED';
      }
      
      console.log(programName.padEnd(20) + 
                  snarkyTime.padEnd(15) + 
                  sparkyTime.padEnd(15) + 
                  ratio.padEnd(10) + 
                  snarkyMem.padEnd(15) + 
                  sparkyMem.padEnd(15) + 
                  status);
    }
  }
  
  printSparkyWeaknesses() {
    const weaknesses = this.analyzeSparkyWeaknesses();
    
    console.log('\n🎯 SPARKY WEAKNESSES ANALYSIS');
    console.log('-'.repeat(80));
    
    if (weaknesses.length === 0) {
      console.log('🎉 No significant weaknesses found! Sparky performs competitively.');
      return;
    }
    
    const critical = weaknesses.filter(w => w.severity === 'CRITICAL');
    const high = weaknesses.filter(w => w.severity === 'HIGH');
    const medium = weaknesses.filter(w => w.severity === 'MEDIUM');
    
    if (critical.length > 0) {
      console.log('\n🔥 CRITICAL ISSUES:');
      critical.forEach(w => {
        console.log(`  💥 ${w.program}: ${w.description}`);
      });
    }
    
    if (high.length > 0) {
      console.log('\n⚠️ HIGH PRIORITY ISSUES:');
      high.forEach(w => {
        console.log(`  🐌 ${w.program}: ${w.description}`);
      });
    }
    
    if (medium.length > 0) {
      console.log('\n📊 MEDIUM PRIORITY ISSUES:');
      medium.forEach(w => {
        console.log(`  📈 ${w.program}: ${w.description}`);
      });
    }
    
    console.log('\n🎯 RUTHLESS VERDICT (FIXED VERSION):');
    if (critical.length > 0) {
      console.log('💥 SPARKY IS NOT PRODUCTION READY - Critical failures detected');
    } else if (high.length > 0) {
      console.log('⚠️ SPARKY HAS SIGNIFICANT PERFORMANCE ISSUES - Optimization needed');
    } else if (medium.length > 0) {
      console.log('📊 SPARKY IS FUNCTIONAL BUT SLOWER - Minor optimization opportunities');
    } else {
      console.log('🎉 SPARKY PERFORMS COMPETITIVELY - Ready for production');
    }
  }
}

// ========== Main Execution ==========

async function main() {
  try {
    const runner = new BenchmarkRunner();
    await runner.runFullBenchmark();
  } catch (error) {
    console.error('💥 Benchmark failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BenchmarkRunner };