#!/usr/bin/env node

import { Field, switchBackend, getCurrentBackend } from './dist/node/index.js';

function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function measureMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  return {
    heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
    heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
    external: memoryUsage.external / 1024 / 1024, // MB
    rss: memoryUsage.rss / 1024 / 1024 // MB
  };
}

async function benchmarkBackendSwitching() {
  console.log("Backend Switching Overhead Benchmark");
  console.log("====================================");
  
  const iterations = 10;
  const results = {
    snarkyToSparky: [],
    sparkyToSnarky: [],
    memoryUsage: []
  };
  
  // Warm up
  console.log("Warming up...");
  await switchBackend('snarky');
  await switchBackend('sparky');
  await switchBackend('snarky');
  
  // Measure initial memory
  const initialMemory = measureMemoryUsage();
  results.memoryUsage.push({ phase: 'initial', ...initialMemory });
  
  console.log(`\nRunning ${iterations} switching iterations...`);
  
  for (let i = 0; i < iterations; i++) {
    console.log(`Iteration ${i + 1}/${iterations}`);
    
    // Measure Snarky → Sparky
    const snarkyStart = Date.now();
    await switchBackend('sparky');
    const snarkyToSparkyTime = Date.now() - snarkyStart;
    results.snarkyToSparky.push(snarkyToSparkyTime);
    
    // Measure memory after switching to Sparky
    const sparkyMemory = measureMemoryUsage();
    results.memoryUsage.push({ phase: `sparky_${i}`, ...sparkyMemory });
    
    // Measure Sparky → Snarky
    const sparkyStart = Date.now();
    await switchBackend('snarky');
    const sparkyToSnarkyTime = Date.now() - sparkyStart;
    results.sparkyToSnarky.push(sparkyToSnarkyTime);
    
    // Measure memory after switching to Snarky
    const snarkyMemory = measureMemoryUsage();
    results.memoryUsage.push({ phase: `snarky_${i}`, ...snarkyMemory });
  }
  
  // Calculate statistics
  const avgSnarkyToSparky = results.snarkyToSparky.reduce((a, b) => a + b, 0) / results.snarkyToSparky.length;
  const avgSparkyToSnarky = results.sparkyToSnarky.reduce((a, b) => a + b, 0) / results.sparkyToSnarky.length;
  
  const minSnarkyToSparky = Math.min(...results.snarkyToSparky);
  const maxSnarkyToSparky = Math.max(...results.snarkyToSparky);
  const minSparkyToSnarky = Math.min(...results.sparkyToSnarky);
  const maxSparkyToSnarky = Math.max(...results.sparkyToSnarky);
  
  console.log("\n=== BACKEND SWITCHING PERFORMANCE ===");
  console.log(`Snarky → Sparky: ${formatTime(avgSnarkyToSparky)} avg (${formatTime(minSnarkyToSparky)} min, ${formatTime(maxSnarkyToSparky)} max)`);
  console.log(`Sparky → Snarky: ${formatTime(avgSparkyToSnarky)} avg (${formatTime(minSparkyToSnarky)} min, ${formatTime(maxSparkyToSnarky)} max)`);
  
  // Memory analysis
  const finalMemory = measureMemoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  console.log("\n=== MEMORY USAGE ANALYSIS ===");
  console.log(`Initial Memory: ${initialMemory.heapUsed.toFixed(2)} MB heap, ${initialMemory.rss.toFixed(2)} MB RSS`);
  console.log(`Final Memory: ${finalMemory.heapUsed.toFixed(2)} MB heap, ${finalMemory.rss.toFixed(2)} MB RSS`);
  console.log(`Memory Increase: ${memoryIncrease.toFixed(2)} MB heap`);
  
  // Detect memory patterns
  const sparkyMemoryReadings = results.memoryUsage.filter(m => m.phase.startsWith('sparky_'));
  const snarkyMemoryReadings = results.memoryUsage.filter(m => m.phase.startsWith('snarky_'));
  
  if (sparkyMemoryReadings.length > 0 && snarkyMemoryReadings.length > 0) {
    const avgSparkyMemory = sparkyMemoryReadings.reduce((sum, m) => sum + m.heapUsed, 0) / sparkyMemoryReadings.length;
    const avgSnarkyMemory = snarkyMemoryReadings.reduce((sum, m) => sum + m.heapUsed, 0) / snarkyMemoryReadings.length;
    
    console.log(`Average Sparky Memory: ${avgSparkyMemory.toFixed(2)} MB heap`);
    console.log(`Average Snarky Memory: ${avgSnarkyMemory.toFixed(2)} MB heap`);
    console.log(`Memory Difference: ${(avgSparkyMemory - avgSnarkyMemory).toFixed(2)} MB`);
  }
  
  return {
    avgSnarkyToSparky,
    avgSparkyToSnarky,
    memoryIncrease,
    initialMemory,
    finalMemory
  };
}

async function benchmarkOperationOverhead() {
  console.log("\n=== OPERATION OVERHEAD ANALYSIS ===");
  
  const operations = [
    { name: 'Field Addition', op: () => Field(5).add(Field(7)) },
    { name: 'Field Multiplication', op: () => Field(3).mul(Field(4)) },
    { name: 'Field Square', op: () => Field(5).square() },
    { name: 'Field Equals', op: () => Field(5).equals(Field(7)) }
  ];
  
  const iterations = 1000;
  const results = {};
  
  for (const backend of ['snarky', 'sparky']) {
    await switchBackend(backend);
    console.log(`\nTesting ${backend} backend...`);
    results[backend] = {};
    
    for (const { name, op } of operations) {
      // Warmup
      for (let i = 0; i < 100; i++) {
        try {
          op();
        } catch (error) {
          // Skip warmup errors
        }
      }
      
      // Measure
      const start = process.hrtime.bigint();
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        try {
          op();
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }
      
      const end = process.hrtime.bigint();
      const totalTime = Number(end - start) / 1000000; // Convert to ms
      const avgTime = totalTime / successCount;
      
      results[backend][name] = {
        avgTime,
        successCount,
        errorCount,
        totalTime
      };
      
      console.log(`  ${name}: ${formatTime(avgTime)} avg (${successCount}/${iterations} successful)`);
    }
  }
  
  // Compare results
  console.log("\n=== OVERHEAD COMPARISON ===");
  console.log("Operation          | Snarky Avg | Sparky Avg | Overhead    | Success Rate");
  console.log("-------------------|------------|------------|-------------|-------------");
  
  for (const operation of operations) {
    const snarkyResult = results.snarky[operation.name];
    const sparkyResult = results.sparky[operation.name];
    
    const snarkyAvg = snarkyResult ? snarkyResult.avgTime : 0;
    const sparkyAvg = sparkyResult ? sparkyResult.avgTime : 0;
    const overhead = sparkyAvg > 0 ? (snarkyAvg / sparkyAvg) : 0;
    const successRate = sparkyResult ? (sparkyResult.successCount / iterations * 100) : 0;
    
    console.log(`${operation.name.padEnd(18)} | ${formatTime(snarkyAvg).padEnd(10)} | ${formatTime(sparkyAvg).padEnd(10)} | ${overhead.toFixed(2)}x ${overhead > 1 ? 'slower' : 'faster'} | ${successRate.toFixed(1)}%`);
  }
  
  return results;
}

async function runComprehensiveBenchmark() {
  try {
    const switchingResults = await benchmarkBackendSwitching();
    const operationResults = await benchmarkOperationOverhead();
    
    console.log("\n=== COMPREHENSIVE SUMMARY ===");
    console.log("Backend Switching Performance:");
    console.log(`  Snarky → Sparky: ${formatTime(switchingResults.avgSnarkyToSparky)}`);
    console.log(`  Sparky → Snarky: ${formatTime(switchingResults.avgSparkyToSnarky)}`);
    console.log(`  Memory Overhead: ${switchingResults.memoryIncrease.toFixed(2)} MB`);
    
    console.log("\nRecommendations:");
    if (switchingResults.avgSnarkyToSparky > 1000) {
      console.log("  ⚠️  High backend switching overhead - minimize switching frequency");
    }
    if (switchingResults.memoryIncrease > 100) {
      console.log("  ⚠️  High memory overhead - consider memory management strategies");
    }
    
    console.log("\n=== BENCHMARK COMPLETE ===");
    
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

runComprehensiveBenchmark();