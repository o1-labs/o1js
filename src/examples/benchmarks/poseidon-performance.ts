/**
 * Comprehensive Poseidon performance benchmark for o1js
 * Tests the actual OCaml Snarky implementation
 */

import { Field, Provable, Poseidon } from 'o1js';
import { performance } from 'perf_hooks';

// Helper functions
function tic(label: string) {
  console.time(label);
}

function toc() {
  console.timeEnd(arguments[0] || 'default');
}

async function measureTime<T>(fn: () => T | Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

// Benchmark functions
async function benchmarkSimpleHash() {
  console.log('\n--- Benchmark 1: Simple Hash ---');
  
  // Test hash(100, 0)
  const a = Field(100);
  const b = Field(0);
  
  // Warm-up
  Poseidon.hash([a, b]);
  
  // Measure
  const iterations = 100;
  const [result, totalTime] = await measureTime(() => {
    let hash;
    for (let i = 0; i < iterations; i++) {
      hash = Poseidon.hash([a, b]);
    }
    return hash;
  });
  
  console.log(`Result: ${result.toString()}`);
  console.log(`Average time: ${(totalTime / iterations).toFixed(3)}ms per hash`);
  
  return totalTime / iterations;
}

async function benchmarkWitnessGeneration() {
  console.log('\n--- Benchmark 2: Witness Generation ---');
  
  const nHashes = 100;
  
  async function circuit() {
    let x = Provable.witness(Field, () => Field(42));
    let hash = x;
    for (let i = 0; i < nHashes; i++) {
      hash = Poseidon.hash([hash, x]);
    }
    return hash;
  }
  
  // Measure witness generation
  const [, time] = await measureTime(() => 
    Provable.runAndCheck(circuit)
  );
  
  console.log(`${nHashes} hashes in circuit: ${time.toFixed(3)}ms`);
  console.log(`Average: ${(time / nHashes).toFixed(3)}ms per hash`);
  
  return time / nHashes;
}

async function benchmarkBatchPerformance() {
  console.log('\n--- Benchmark 3: Batch Performance ---');
  
  const sizes = [100, 1000, 5000, 10000];
  const results: number[] = [];
  
  for (const size of sizes) {
    const inputs = Array.from({ length: size }, (_, i) => [Field(i), Field(i + 1)]);
    
    const [, time] = await measureTime(() => {
      for (const [a, b] of inputs) {
        Poseidon.hash([a, b]);
      }
    });
    
    const avgTime = time / size;
    results.push(avgTime);
    console.log(`${formatNumber(size)} hashes: ${time.toFixed(3)}ms (${avgTime.toFixed(3)}ms per hash)`);
  }
  
  return results[results.length - 1]; // Return the average from largest batch
}

async function benchmarkVariableInputSize() {
  console.log('\n--- Benchmark 4: Variable Input Sizes ---');
  
  const sizes = [2, 3, 5, 10, 15, 20, 30];
  
  for (const size of sizes) {
    const inputs = Array.from({ length: size }, (_, i) => Field(i * 10));
    
    // Warm-up
    Poseidon.hash(inputs);
    
    const iterations = 50;
    const [, time] = await measureTime(() => {
      for (let i = 0; i < iterations; i++) {
        Poseidon.hash(inputs);
      }
    });
    
    console.log(`${size} fields: ${(time / iterations).toFixed(3)}ms`);
  }
}

async function benchmarkStateOperations() {
  console.log('\n--- Benchmark 5: State Operations ---');
  
  // Test initialState
  const iterations = 1000;
  
  const [, initTime] = await measureTime(() => {
    for (let i = 0; i < iterations; i++) {
      Poseidon.initialState();
    }
  });
  console.log(`initialState(): ${(initTime / iterations).toFixed(3)}ms`);
  
  // Test update
  const state = Poseidon.initialState();
  const input = [Field(1), Field(2), Field(3)];
  
  const [, updateTime] = await measureTime(() => {
    for (let i = 0; i < iterations; i++) {
      Poseidon.update(state, input);
    }
  });
  console.log(`update(): ${(updateTime / iterations).toFixed(3)}ms`);
  
  // Test hashWithPrefix
  const [, prefixTime] = await measureTime(() => {
    for (let i = 0; i < iterations; i++) {
      Poseidon.hashWithPrefix('test', [Field(i)]);
    }
  });
  console.log(`hashWithPrefix(): ${(prefixTime / iterations).toFixed(3)}ms`);
}

async function benchmarkMemoryUsage() {
  console.log('\n--- Benchmark 6: Memory Usage ---');
  
  const iterations = 50000;
  const gcInterval = 10000;
  
  // Force garbage collection before test
  if (global.gc) {
    global.gc();
  }
  
  const memStart = process.memoryUsage();
  console.log(`Starting memory: ${(memStart.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
  const [, time] = await measureTime(async () => {
    for (let i = 0; i < iterations; i++) {
      Poseidon.hash([Field(i), Field(i * 2)]);
      
      // Periodic GC to simulate real usage
      if (i % gcInterval === 0 && global.gc) {
        global.gc();
      }
    }
  });
  
  const memEnd = process.memoryUsage();
  const memDelta = (memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024;
  
  console.log(`Ending memory: ${(memEnd.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Memory delta: ${memDelta.toFixed(2)}MB`);
  console.log(`${formatNumber(iterations)} hashes in ${time.toFixed(3)}ms`);
  console.log(`Average: ${(time / iterations).toFixed(3)}ms per hash`);
  
  return time / iterations;
}

// Main benchmark runner
async function main() {
  console.log('O1js Snarky Poseidon Performance Benchmark');
  console.log('==========================================');
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Memory: ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(0)}MB`);
  
  try {
    // Run benchmarks
    const simpleAvg = await benchmarkSimpleHash();
    const witnessAvg = await benchmarkWitnessGeneration();
    const batchAvg = await benchmarkBatchPerformance();
    await benchmarkVariableInputSize();
    await benchmarkStateOperations();
    const memoryAvg = await benchmarkMemoryUsage();
    
    // Summary
    console.log('\n========== SUMMARY ==========');
    console.log(`Simple hash average: ${simpleAvg.toFixed(3)}ms`);
    console.log(`Witness generation average: ${witnessAvg.toFixed(3)}ms`);
    console.log(`Batch average: ${batchAvg.toFixed(3)}ms`);
    console.log(`Memory test average: ${memoryAvg.toFixed(3)}ms`);
    
    // Overall average
    const overallAvg = (simpleAvg + batchAvg + memoryAvg) / 3;
    console.log(`\nOverall average: ${overallAvg.toFixed(3)}ms per hash`);
    console.log(`Throughput: ~${formatNumber(1000 / overallAvg)} hashes/second`);
    
    // Comparison with Sparky
    console.log('\n--- Comparison with Sparky ---');
    console.log(`Sparky (WASM): 1.662ms per hash`);
    console.log(`Snarky (OCaml): ${overallAvg.toFixed(3)}ms per hash`);
    
    if (overallAvg < 1.662) {
      const speedup = 1.662 / overallAvg;
      console.log(`✅ Snarky is ${speedup.toFixed(2)}x faster than Sparky`);
    } else {
      const speedup = overallAvg / 1.662;
      console.log(`❌ Sparky is ${speedup.toFixed(2)}x faster than Snarky`);
    }
    
    // Note about hash value difference
    console.log('\n📝 Note: The BigInt test showed different hash values.');
    console.log('This needs investigation - possibly different Poseidon parameters.');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    console.error('\nMake sure o1js is built properly:');
    console.error('npm run build');
  }
}

// Run with optional GC flag
if (process.argv.includes('--expose-gc')) {
  console.log('Running with garbage collection enabled\n');
}

main().catch(console.error);