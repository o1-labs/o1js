#!/usr/bin/env node

/**
 * SIMPLE BACKEND PERFORMANCE TEST
 * 
 * This test focuses on basic operations to avoid ZkProgram complexity
 * and directly compare Sparky vs Snarky performance on constraint generation.
 */

import { switchBackend, getCurrentBackend } from './dist/node/index.js';
import { Field, Provable, Poseidon } from './dist/node/index.js';
import { performance } from 'perf_hooks';
import * as fs from 'fs';

// ========== Test Operations ==========

async function testBasicFieldOperations(operationCount, backend) {
  console.log(`\n🧪 Testing ${operationCount} field operations on ${backend.toUpperCase()}`);
  
  await switchBackend(backend);
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  try {
    // Test constraint system generation with many operations
    const { rows } = await Provable.constraintSystem(() => {
      let a = Field(1);
      let b = Field(2);
      let result = Field(0);
      
      for (let i = 0; i < operationCount; i++) {
        const temp1 = a.mul(b.add(Field(i)));
        const temp2 = temp1.add(Field(i * 2));
        const temp3 = temp2.mul(temp2); // Square
        result = result.add(temp3);
        
        // Update variables for next iteration
        a = temp1;
        b = temp2;
      }
      
      return result;
    });
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const result = {
      backend,
      operationCount,
      success: true,
      timeMs: endTime - startTime,
      constraintCount: rows,
      memoryUsedMB: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      peakMemoryMB: endMemory.heapUsed / 1024 / 1024
    };
    
    console.log(`✅ Success: ${result.timeMs.toFixed(2)}ms, ${result.constraintCount} constraints, ${result.memoryUsedMB.toFixed(2)}MB memory`);
    return result;
    
  } catch (error) {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    console.log(`💥 Failed: ${error.message}`);
    return {
      backend,
      operationCount,
      success: false,
      error: error.message,
      timeMs: endTime - startTime,
      constraintCount: -1,
      memoryUsedMB: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      peakMemoryMB: endMemory.heapUsed / 1024 / 1024
    };
  }
}

async function testHashOperations(hashCount, backend) {
  console.log(`\n🔒 Testing ${hashCount} hash operations on ${backend.toUpperCase()}`);
  
  await switchBackend(backend);
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  try {
    const { rows } = await Provable.constraintSystem(() => {
      let current = Field(12345);
      const salt = Field(67890);
      
      for (let i = 0; i < hashCount; i++) {
        current = Poseidon.hash([current, salt, Field(i)]);
      }
      
      return current;
    });
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const result = {
      backend,
      hashCount,
      success: true,
      timeMs: endTime - startTime,
      constraintCount: rows,
      memoryUsedMB: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      peakMemoryMB: endMemory.heapUsed / 1024 / 1024
    };
    
    console.log(`✅ Success: ${result.timeMs.toFixed(2)}ms, ${result.constraintCount} constraints, ${result.memoryUsedMB.toFixed(2)}MB memory`);
    return result;
    
  } catch (error) {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    console.log(`💥 Failed: ${error.message}`);
    return {
      backend,
      hashCount,
      success: false,
      error: error.message,
      timeMs: endTime - startTime,
      constraintCount: -1,
      memoryUsedMB: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      peakMemoryMB: endMemory.heapUsed / 1024 / 1024
    };
  }
}

async function testConditionalOperations(conditionCount, backend) {
  console.log(`\n🔀 Testing ${conditionCount} conditional operations on ${backend.toUpperCase()}`);
  
  await switchBackend(backend);
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  try {
    const { rows } = await Provable.constraintSystem(() => {
      let result = Field(100);
      const threshold = Field(50);
      
      for (let i = 0; i < conditionCount; i++) {
        const condition = result.greaterThan(threshold.add(Field(i)));
        const branch1 = result.mul(Field(2));
        const branch2 = result.add(Field(i + 1));
        
        result = Provable.if(condition, branch1, branch2);
      }
      
      return result;
    });
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const result = {
      backend,
      conditionCount,
      success: true,
      timeMs: endTime - startTime,
      constraintCount: rows,
      memoryUsedMB: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      peakMemoryMB: endMemory.heapUsed / 1024 / 1024
    };
    
    console.log(`✅ Success: ${result.timeMs.toFixed(2)}ms, ${result.constraintCount} constraints, ${result.memoryUsedMB.toFixed(2)}MB memory`);
    return result;
    
  } catch (error) {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    console.log(`💥 Failed: ${error.message}`);
    return {
      backend,
      conditionCount,
      success: false,
      error: error.message,
      timeMs: endTime - startTime,
      constraintCount: -1,
      memoryUsedMB: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024,
      peakMemoryMB: endMemory.heapUsed / 1024 / 1024
    };
  }
}

// ========== Main Test Runner ==========

async function runSimplePerformanceTest() {
  console.log('\n🔥 SIMPLE BACKEND PERFORMANCE TEST 🔥');
  console.log('='.repeat(50));
  console.log('Direct comparison of constraint generation performance');
  console.log('Focus: Finding Sparky\'s specific bottlenecks');
  console.log('='.repeat(50));
  
  const results = [];
  
  // Test 1: Arithmetic Operations (scaling test)
  console.log('\n📊 ARITHMETIC OPERATIONS SCALING TEST');
  console.log('-'.repeat(40));
  
  const arithmeticSizes = [10, 25, 50, 100];
  for (const size of arithmeticSizes) {
    // Test Snarky
    const snarkyResult = await testBasicFieldOperations(size, 'snarky');
    results.push({ ...snarkyResult, testType: 'arithmetic' });
    
    // Test Sparky
    const sparkyResult = await testBasicFieldOperations(size, 'sparky');
    results.push({ ...sparkyResult, testType: 'arithmetic' });
    
    // Immediate comparison
    if (snarkyResult.success && sparkyResult.success) {
      const timeRatio = sparkyResult.timeMs / snarkyResult.timeMs;
      const constraintRatio = sparkyResult.constraintCount / snarkyResult.constraintCount;
      
      console.log(`📈 Comparison for ${size} operations:`);
      console.log(`   ⏱️ Time ratio (Sparky/Snarky): ${timeRatio.toFixed(2)}x`);
      console.log(`   📊 Constraint ratio: ${constraintRatio.toFixed(2)}x`);
      
      if (timeRatio > 3.0) {
        console.log(`   🔥 CRITICAL: Sparky is ${timeRatio.toFixed(1)}x slower!`);
      } else if (timeRatio > 1.5) {
        console.log(`   ⚠️ WARNING: Sparky is ${timeRatio.toFixed(1)}x slower`);
      }
    }
  }
  
  // Test 2: Hash Operations
  console.log('\n🔒 HASH OPERATIONS TEST');
  console.log('-'.repeat(30));
  
  const hashSizes = [3, 5, 10, 15];
  for (const size of hashSizes) {
    // Test Snarky
    const snarkyResult = await testHashOperations(size, 'snarky');
    results.push({ ...snarkyResult, testType: 'hash' });
    
    // Test Sparky
    const sparkyResult = await testHashOperations(size, 'sparky');
    results.push({ ...sparkyResult, testType: 'hash' });
    
    // Immediate comparison
    if (snarkyResult.success && sparkyResult.success) {
      const timeRatio = sparkyResult.timeMs / snarkyResult.timeMs;
      console.log(`🔒 Hash comparison for ${size} hashes: ${timeRatio.toFixed(2)}x slower`);
    }
  }
  
  // Test 3: Conditional Operations
  console.log('\n🔀 CONDITIONAL OPERATIONS TEST');
  console.log('-'.repeat(35));
  
  const conditionalSizes = [5, 10, 20];
  for (const size of conditionalSizes) {
    // Test Snarky
    const snarkyResult = await testConditionalOperations(size, 'snarky');
    results.push({ ...snarkyResult, testType: 'conditional' });
    
    // Test Sparky
    const sparkyResult = await testConditionalOperations(size, 'sparky');
    results.push({ ...sparkyResult, testType: 'conditional' });
    
    // Immediate comparison
    if (snarkyResult.success && sparkyResult.success) {
      const timeRatio = sparkyResult.timeMs / snarkyResult.timeMs;
      console.log(`🔀 Conditional comparison for ${size} conditions: ${timeRatio.toFixed(2)}x slower`);
    }
  }
  
  // Generate comprehensive analysis
  generateDetailedAnalysis(results);
  
  return results;
}

function generateDetailedAnalysis(results) {
  console.log('\n📋 DETAILED PERFORMANCE ANALYSIS');
  console.log('='.repeat(60));
  
  // Group results by test type
  const arithmeticResults = results.filter(r => r.testType === 'arithmetic');
  const hashResults = results.filter(r => r.testType === 'hash');
  const conditionalResults = results.filter(r => r.testType === 'conditional');
  
  console.log('\n📊 ARITHMETIC OPERATIONS SUMMARY');
  console.log('-'.repeat(40));
  printTestTypeSummary(arithmeticResults, 'operationCount');
  
  console.log('\n🔒 HASH OPERATIONS SUMMARY');
  console.log('-'.repeat(30));
  printTestTypeSummary(hashResults, 'hashCount');
  
  console.log('\n🔀 CONDITIONAL OPERATIONS SUMMARY');
  console.log('-'.repeat(35));
  printTestTypeSummary(conditionalResults, 'conditionCount');
  
  // Overall analysis
  const allSnarkyResults = results.filter(r => r.backend === 'snarky' && r.success);
  const allSparkyResults = results.filter(r => r.backend === 'sparky' && r.success);
  
  if (allSnarkyResults.length > 0 && allSparkyResults.length > 0) {
    const avgSnarkyTime = allSnarkyResults.reduce((sum, r) => sum + r.timeMs, 0) / allSnarkyResults.length;
    const avgSparkyTime = allSparkyResults.reduce((sum, r) => sum + r.timeMs, 0) / allSparkyResults.length;
    const avgSnarkyMemory = allSnarkyResults.reduce((sum, r) => sum + r.memoryUsedMB, 0) / allSnarkyResults.length;
    const avgSparkyMemory = allSparkyResults.reduce((sum, r) => sum + r.memoryUsedMB, 0) / allSparkyResults.length;
    
    console.log('\n🎯 OVERALL PERFORMANCE COMPARISON');
    console.log('-'.repeat(40));
    console.log(`⏱️ Average Time - Snarky: ${avgSnarkyTime.toFixed(2)}ms, Sparky: ${avgSparkyTime.toFixed(2)}ms (${(avgSparkyTime/avgSnarkyTime).toFixed(2)}x)`);
    console.log(`💾 Average Memory - Snarky: ${avgSnarkyMemory.toFixed(2)}MB, Sparky: ${avgSparkyMemory.toFixed(2)}MB (${(avgSparkyMemory/avgSnarkyMemory).toFixed(2)}x)`);
  }
  
  // Identify critical issues
  const criticalIssues = identifyCriticalIssues(results);
  
  console.log('\n🔥 CRITICAL ISSUES ANALYSIS');
  console.log('-'.repeat(30));
  
  if (criticalIssues.length === 0) {
    console.log('✅ No critical performance issues detected');
  } else {
    criticalIssues.forEach(issue => {
      console.log(`💥 ${issue.severity}: ${issue.description}`);
      if (issue.recommendation) {
        console.log(`   🔧 Recommendation: ${issue.recommendation}`);
      }
    });
  }
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `simple-performance-results-${timestamp}.json`;
  
  const report = {
    timestamp: new Date().toISOString(),
    testType: 'simple_backend_performance',
    results,
    criticalIssues,
    summary: {
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length
    }
  };
  
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed results saved to: ${filename}`);
}

function printTestTypeSummary(results, sizeKey) {
  const sizes = [...new Set(results.map(r => r[sizeKey]))].sort((a, b) => a - b);
  
  console.log('Size'.padEnd(8) + 'Snarky'.padEnd(12) + 'Sparky'.padEnd(12) + 'Ratio'.padEnd(8) + 'Status');
  console.log('-'.repeat(50));
  
  for (const size of sizes) {
    const snarkyResult = results.find(r => r[sizeKey] === size && r.backend === 'snarky');
    const sparkyResult = results.find(r => r[sizeKey] === size && r.backend === 'sparky');
    
    if (snarkyResult && sparkyResult) {
      const snarkyTime = snarkyResult.success ? `${snarkyResult.timeMs.toFixed(0)}ms` : 'FAIL';
      const sparkyTime = sparkyResult.success ? `${sparkyResult.timeMs.toFixed(0)}ms` : 'FAIL';
      
      let ratio = 'N/A';
      let status = '❓';
      
      if (snarkyResult.success && sparkyResult.success) {
        const timeRatio = sparkyResult.timeMs / snarkyResult.timeMs;
        ratio = `${timeRatio.toFixed(1)}x`;
        
        if (timeRatio > 5.0) status = '🔥 CRITICAL';
        else if (timeRatio > 2.0) status = '⚠️ SLOW';
        else if (timeRatio > 1.2) status = '📊 SLOWER';
        else status = '✅ OK';
      } else if (!sparkyResult.success) {
        status = '💥 FAILED';
      }
      
      console.log(`${size}`.padEnd(8) + 
                  snarkyTime.padEnd(12) + 
                  sparkyTime.padEnd(12) + 
                  ratio.padEnd(8) + 
                  status);
    }
  }
}

function identifyCriticalIssues(results) {
  const issues = [];
  
  // Check for failures
  const failures = results.filter(r => !r.success && r.backend === 'sparky');
  if (failures.length > 0) {
    issues.push({
      severity: 'CRITICAL',
      description: `Sparky failed on ${failures.length} test cases`,
      recommendation: 'Fix compilation/constraint generation failures',
      details: failures.map(f => `${f.testType} (${f.operationCount || f.hashCount || f.conditionCount}): ${f.error}`)
    });
  }
  
  // Check for severe performance degradation
  const testTypes = ['arithmetic', 'hash', 'conditional'];
  for (const testType of testTypes) {
    const typeResults = results.filter(r => r.testType === testType && r.success);
    const snarkyResults = typeResults.filter(r => r.backend === 'snarky');
    const sparkyResults = typeResults.filter(r => r.backend === 'sparky');
    
    if (snarkyResults.length > 0 && sparkyResults.length > 0) {
      const avgSnarkyTime = snarkyResults.reduce((sum, r) => sum + r.timeMs, 0) / snarkyResults.length;
      const avgSparkyTime = sparkyResults.reduce((sum, r) => sum + r.timeMs, 0) / sparkyResults.length;
      const ratio = avgSparkyTime / avgSnarkyTime;
      
      if (ratio > 5.0) {
        issues.push({
          severity: 'CRITICAL',
          description: `${testType} operations are ${ratio.toFixed(1)}x slower in Sparky`,
          recommendation: `Profile and optimize ${testType} constraint generation`
        });
      } else if (ratio > 2.0) {
        issues.push({
          severity: 'HIGH',
          description: `${testType} operations are ${ratio.toFixed(1)}x slower in Sparky`,
          recommendation: `Investigate ${testType} performance bottlenecks`
        });
      }
    }
  }
  
  return issues;
}

// ========== Main Execution ==========

async function main() {
  try {
    console.log('🚀 Starting simple backend performance test...');
    await runSimplePerformanceTest();
    console.log('\n✅ Performance test completed!');
  } catch (error) {
    console.error('💥 Performance test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runSimplePerformanceTest };