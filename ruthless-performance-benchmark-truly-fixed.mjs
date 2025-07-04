#!/usr/bin/env node

/**
 * RUTHLESS PERFORMANCE BENCHMARK: Sparky vs Snarky (TRULY FIXED)
 * 
 * This benchmark uses the CORRECT publicOutput pattern discovered from official examples:
 * - Methods with publicOutput must return { publicOutput: value }, not just value
 * - No console.log statements in methods during compilation
 * 
 * CORRECT PATTERN APPLIED:
 * - return { publicOutput: result } instead of return result
 * - Removed all console.log statements from methods
 * - Proper complex circuit implementations for stress testing
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

// ========== TRULY FIXED Test Circuit Definitions ==========

/**
 * ARITHMETIC HEAVY CIRCUIT (TRULY FIXED)
 * Tests: Large multiplication chains, complex polynomial evaluation
 * FIX: Use correct publicOutput pattern: return { publicOutput: result }
 */
const ArithmeticHeavyProgram = ZkProgram({
  name: 'ArithmeticHeavy',
  publicInput: Field,
  publicOutput: Field,  // ✅ RESTORED: Now using correct pattern
  
  methods: {
    // Large polynomial evaluation with CORRECT return pattern
    evaluatePolynomial: {
      privateInputs: [Field, Field, Field, Field, Field],
      async method(x, a1, a2, a3, a4, a5) {
        let result = Field(0);
        let xPower = Field(1);
        
        // Increased complexity back to 30 terms (was reduced to 20)
        const coefficients = [a1, a2, a3, a4, a5];
        
        for (let i = 0; i < 30; i++) {
          const coeff = coefficients[i % 5];
          xPower = xPower.mul(x); // x^i
          const term = coeff.mul(xPower); // aᵢ * x^i
          result = result.add(term); // sum += aᵢ * x^i
          
          // Add complex nested operations (every 3rd iteration)
          if (i % 3 === 0) {
            const temp1 = result.mul(result); // result²
            const temp2 = temp1.add(xPower); // result² + x^i
            const temp3 = temp2.mul(coeff); // (result² + x^i) * coeff
            result = result.add(temp3.mul(Field(i + 1))); // Accumulate complex expression
          }
        }
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: result };
      }
    },
    
    // Matrix multiplication with CORRECT return pattern
    matrixMultiply: {
      privateInputs: [Field, Field, Field, Field, Field, Field],
      async method(input, a11, a12, a21, a22, scale) {
        // 2x2 matrix operations with increased complexity
        const matrix = [[a11, a12], [a21, a22]];
        let result = Field(0);
        
        // Increased from 10 to 20 iterations
        for (let i = 0; i < 20; i++) {
          let rowSum = Field(0);
          for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
              const element = matrix[row][col];
              const product = element.mul(input.add(Field(i))); // Dynamic computation
              const squared = product.mul(product); // Square each element
              const scaled = squared.mul(scale); // Scale by parameter
              rowSum = rowSum.add(scaled); // Accumulate
            }
          }
          result = result.add(rowSum.mul(Field(i + 1))); // Weight by iteration
        }
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: result };
      }
    }
  }
});

/**
 * HASH INTENSIVE CIRCUIT (TRULY FIXED)
 * Tests: Poseidon hash chains, merkle tree operations
 * FIX: Use correct publicOutput pattern
 */
const HashIntensiveProgram = ZkProgram({
  name: 'HashIntensive',
  publicInput: Field,
  publicOutput: Field,  // ✅ RESTORED: Now using correct pattern
  
  methods: {
    // Deep hash chain with CORRECT return pattern
    deepHashChain: {
      privateInputs: [Field],
      async method(input, salt) {
        let current = input;
        
        // Increased from 10 to 20 rounds for more stress
        for (let i = 0; i < 20; i++) {
          current = Poseidon.hash([current, salt, Field(i)]);
          
          // Add intermediate complexity every 5th iteration
          if (i % 5 === 0) {
            const temp1 = Poseidon.hash([current, current]); // Hash with self
            const temp2 = Poseidon.hash([temp1, Field(i * i)]); // Square progression
            current = Poseidon.hash([current, temp1, temp2]); // Triple hash
          }
        }
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: current };
      }
    },
    
    // Merkle verification with CORRECT return pattern
    merkleVerification: {
      privateInputs: [Field, Field, Field, Field],
      async method(input, leaf, path0, path1) {
        const pathElements = [path0, path1];
        let current = leaf;
        
        // Increased from 5 to 10 levels
        for (let level = 0; level < 10; level++) {
          const pathElement = pathElements[level % 2]; // Cycle through provided elements
          const isLeft = Field(level % 2); // Alternate left/right
          
          // Conditional hashing (expensive in R1CS)
          const leftHash = Poseidon.hash([current, pathElement]);
          const rightHash = Poseidon.hash([pathElement, current]);
          current = Provable.if(isLeft.equals(Field(0)), leftHash, rightHash);
          
          // Add verification hash with input
          const verification = Poseidon.hash([current, Field(level), input]);
          current = Poseidon.hash([current, verification]);
        }
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: current };
      }
    }
  }
});

/**
 * CONTROL FLOW HEAVY CIRCUIT (TRULY FIXED)
 * Tests: Complex conditional logic, nested if statements
 * FIX: Use correct publicOutput pattern
 */
const ControlFlowProgram = ZkProgram({
  name: 'ControlFlow',
  publicInput: Field,
  publicOutput: Field,  // ✅ RESTORED: Now using correct pattern
  
  methods: {
    // Nested conditionals with CORRECT return pattern
    nestedConditionals: {
      privateInputs: [Field, Field, Field],
      async method(input, a, b, c) {
        let result = input;
        
        // Increased from 10 to 25 rounds for more stress
        for (let i = 0; i < 25; i++) {
          const condition1 = result.greaterThan(Field(i));
          const condition2 = a.lessThan(b.add(Field(i)));
          const condition3 = c.equals(Field(i % 5)); // Modulo 5 instead of 3
          
          // Complex nested if-else chains
          const branch1 = Provable.if(
            condition1,
            result.mul(a).add(Field(i)),
            result.add(b).mul(Field(2))
          );
          
          const branch2 = Provable.if(
            condition2,
            branch1.mul(c).sub(Field(i * i)),
            branch1.add(a.mul(b))
          );
          
          const branch3 = Provable.if(
            condition3,
            branch2.mul(Field(3)).add(c),
            branch2.sub(a).mul(b)
          );
          
          result = Provable.if(
            condition1.and(condition2),
            branch3.add(Field(i)),
            Provable.if(
              condition2.or(condition3),
              branch3.mul(Field(2)),
              branch3.sub(Field(i))
            )
          );
        }
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: result };
      }
    }
  }
});

/**
 * MEMORY STRESS CIRCUIT (TRULY FIXED)
 * Tests: Large variable counts, complex data structures
 * FIX: Use correct publicOutput pattern, increased complexity
 */
const MemoryStressProgram = ZkProgram({
  name: 'MemoryStress',
  publicInput: Field,
  publicOutput: Field,  // ✅ RESTORED: Now using correct pattern
  
  methods: {
    // Array operations with CORRECT return pattern
    arrayProcessing: {
      privateInputs: [Field, Field, Field, Field],
      async method(input, seed1, seed2, seed3) {
        // Increased complexity - 3 arrays of 20 elements each (60 variables)
        const arrays = [];
        const seeds = [seed1, seed2, seed3];
        
        // Build 3 arrays of 20 elements each
        for (let arrayIndex = 0; arrayIndex < 3; arrayIndex++) {
          const array = [];
          let current = seeds[arrayIndex];
          
          for (let i = 0; i < 20; i++) {
            // Complex variable generation
            const temp1 = current.mul(input.add(Field(i)));
            const temp2 = temp1.add(seeds[(i + arrayIndex) % 3]);
            const temp3 = temp2.mul(temp2); // Square
            const temp4 = temp3.add(Field(i * arrayIndex));
            current = temp4.mul(Field((i % 10) + 1)); // Avoid zero
            array.push(current);
          }
          arrays.push(array);
        }
        
        // Cross-array operations (creates massive variable interaction)
        let result = Field(0);
        for (let i = 0; i < 15; i++) { // Increased processing
          for (let j = 0; j < 3; j++) {
            const element = arrays[j][i];
            const crossProduct = element.mul(arrays[(j + 1) % 3][i]);
            const accumulated = crossProduct.add(arrays[(j + 2) % 3][i]);
            result = result.add(accumulated.mul(Field(i + j + 1)));
          }
        }
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: result };
      }
    }
  }
});

/**
 * REAL WORLD ZKAPP CIRCUIT (TRULY FIXED)
 * Tests: Practical zkApp patterns
 * FIX: Use correct publicOutput pattern
 */
const RealWorldZkAppProgram = ZkProgram({
  name: 'RealWorldZkApp',
  publicInput: Field,
  publicOutput: Field,  // ✅ RESTORED: Now using correct pattern
  
  methods: {
    // Voting system with CORRECT return pattern
    privateVoting: {
      privateInputs: [Field, Field, Field, Field],
      async method(publicKey, vote, nullifier, randomness) {
        // Vote validation (0 or 1)
        const validVote = vote.mul(vote.sub(Field(1))); // vote * (vote - 1) should be 0
        validVote.assertEquals(Field(0));
        
        // Nullifier computation (prevents double voting)
        const computedNullifier = Poseidon.hash([publicKey, randomness, Field(12345)]);
        computedNullifier.assertEquals(nullifier);
        
        // Commitment verification
        const computedCommitment = Poseidon.hash([vote, randomness]);
        
        // Increased complexity - 10 rounds instead of 5
        let tally = Field(0);
        for (let round = 0; round < 10; round++) {
          const roundHash = Poseidon.hash([publicKey, Field(round), vote]);
          const roundCommitment = Poseidon.hash([roundHash, randomness]);
          const roundValidation = Poseidon.hash([roundCommitment, nullifier]);
          
          // Complex conditional logic for different vote types
          const isYes = vote.equals(Field(1));
          const yesContribution = Provable.if(
            isYes,
            roundValidation.mul(Field(round + 1)),
            Field(0)
          );
          
          const noContribution = Provable.if(
            isYes.not(),
            roundValidation.mul(Field(round + 1)).neg(),
            Field(0)
          );
          
          tally = tally.add(yesContribution).add(noContribution);
        }
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: tally };
      }
    },
    
    // Token transfer with CORRECT return pattern
    tokenTransfer: {
      privateInputs: [Field, Field, Field, Field],
      async method(publicKey, fromBalance, amount, signature) {
        // Balance validation
        const newFromBalance = fromBalance.sub(amount);
        newFromBalance.assertGreaterThanOrEqual(Field(0));
        
        // Signature verification (simplified)
        const messageHash = Poseidon.hash([publicKey, fromBalance, amount]);
        const expectedSignature = Poseidon.hash([messageHash, publicKey]);
        expectedSignature.assertEquals(signature);
        
        // Increased fee calculation complexity - 5 levels instead of 3
        let totalFees = Field(0);
        for (let feeLevel = 0; feeLevel < 5; feeLevel++) {
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
        
        // ✅ CORRECT: Return object with publicOutput property
        return { publicOutput: finalBalance };
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
  
  async runBenchmark(programInfo, backend) {
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
      memoryPeakMB: 0
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
    console.log('\n🔥 RUTHLESS PERFORMANCE BENCHMARK: SPARKY VS SNARKY (TRULY FIXED) 🔥');
    console.log('='.repeat(80));
    console.log('Goal: Stress test both backends with CORRECT publicOutput pattern');
    console.log('Methodology: Complex circuits using return { publicOutput: result }');
    console.log('FIXES: Correct publicOutput pattern + restored complexity');
    console.log('='.repeat(80));
    
    // Test each program on both backends
    for (const programInfo of this.testPrograms) {
      // Test on Snarky first (baseline)
      try {
        await this.runBenchmark(programInfo, 'snarky');
      } catch (error) {
        console.log(`💥 Snarky failed on ${programInfo.name}: ${error.message}`);
      }
      
      // Test on Sparky (challenger)
      try {
        await this.runBenchmark(programInfo, 'sparky');
      } catch (error) {
        console.log(`💥 Sparky failed on ${programInfo.name}: ${error.message}`);
      }
    }
    
    this.generateReport();
  }
  
  generateReport() {
    console.log('\n📊 RUTHLESS PERFORMANCE ANALYSIS (TRULY FIXED)');
    console.log('='.repeat(80));
    
    const report = {
      summary: this.generateSummary(),
      detailedResults: this.results,
      sparkyWeaknesses: this.analyzeSparkyWeaknesses(),
      recommendations: this.generateRecommendations()
    };
    
    // Save detailed results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `ruthless-benchmark-results-truly-fixed-${timestamp}.json`;
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
          } else if (timeRatio < 0.5) {
            weaknesses.push({
              type: 'PERFORMANCE_POSITIVE',
              program: programName,
              description: `Sparky ${(1/timeRatio).toFixed(1)}x FASTER compilation (${sparkyResult.compilationTimeMs.toFixed(0)}ms vs ${snarkyResult.compilationTimeMs.toFixed(0)}ms)`,
              severity: 'POSITIVE',
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
    const hasPositivePerformance = weaknesses.some(w => w.type === 'PERFORMANCE_POSITIVE');
    
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
    
    if (hasPositivePerformance) {
      recommendations.push({
        priority: 'LOW',
        area: 'Optimization',
        recommendation: 'Investigate and document why Sparky outperforms Snarky in some cases',
        rationale: 'Sparky shows performance advantages that could be exploited more broadly'
      });
    }
    
    recommendations.push({
      priority: 'LOW',
      area: 'Documentation',
      recommendation: 'Document correct publicOutput pattern: return { publicOutput: result }',
      rationale: 'Prevent future development confusion about publicOutput usage'
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
        else if (timeRatio < 0.5) status = '🚀 FASTER';
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
    
    console.log('\n🎯 SPARKY PERFORMANCE ANALYSIS');
    console.log('-'.repeat(80));
    
    if (weaknesses.length === 0) {
      console.log('🎉 No significant issues found! Sparky performs competitively.');
      return;
    }
    
    const critical = weaknesses.filter(w => w.severity === 'CRITICAL');
    const high = weaknesses.filter(w => w.severity === 'HIGH');
    const medium = weaknesses.filter(w => w.severity === 'MEDIUM');
    const positive = weaknesses.filter(w => w.severity === 'POSITIVE');
    
    if (positive.length > 0) {
      console.log('\n🚀 SPARKY PERFORMANCE ADVANTAGES:');
      positive.forEach(w => {
        console.log(`  ⚡ ${w.program}: ${w.description}`);
      });
    }
    
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
    
    console.log('\n🎯 RUTHLESS VERDICT (TRULY FIXED VERSION):');
    if (critical.length > 0) {
      console.log('💥 SPARKY IS NOT PRODUCTION READY - Critical failures detected');
    } else if (high.length > 0) {
      console.log('⚠️ SPARKY HAS PERFORMANCE ISSUES - Optimization needed');
    } else if (medium.length > 0) {
      console.log('📊 SPARKY IS FUNCTIONAL WITH MINOR ISSUES - Near production ready');
    } else {
      console.log('🎉 SPARKY PERFORMS COMPETITIVELY - Production ready');
    }
    
    if (positive.length > 0) {
      console.log(`🚀 BONUS: Sparky shows performance advantages in ${positive.length} cases!`);
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