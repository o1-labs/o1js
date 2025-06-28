/**
 * Benchmark for native o1js Snarky Poseidon implementation
 * This measures the OCaml-based implementation's performance
 */

import { performance } from 'perf_hooks';

// Helper to measure execution time
async function measureTime<T>(fn: () => T | Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

// Helper to format large numbers
function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

async function main() {
  console.log('O1js Snarky Poseidon Performance Benchmark');
  console.log('==========================================\n');
  
  try {
    // Dynamic imports to handle potential build issues
    console.log('Loading o1js modules...');
    const initStart = performance.now();
    
    // Import required modules
    const { Field } = await import('../lib/provable/wrapped.js');
    const { Poseidon } = await import('../lib/provable/crypto/poseidon.js');
    const { initializeBindings, isReady } = await import('../bindings.js');
    
    // Initialize bindings
    if (!isReady) {
      await initializeBindings();
    }
    
    const initEnd = performance.now();
    console.log(`✓ O1js initialized in ${(initEnd - initStart).toFixed(3)}ms\n`);
    
    // Test 1: Single hash performance
    console.log('--- Test 1: Single Hash Performance ---');
    console.log('Input: hash(100, 0)');
    
    const a = Field(100);
    const b = Field(0);
    
    // Warm-up run
    Poseidon.hash([a, b]);
    
    // Measure single hash
    const [hash1, time1] = await measureTime(() => Poseidon.hash([a, b]));
    console.log(`Result: ${hash1.toString()}`);
    console.log(`Time: ${time1.toFixed(3)}ms`);
    
    // Test 2: Batch performance
    console.log('\n--- Test 2: Batch Performance ---');
    const batchSizes = [10, 100, 1000, 5000];
    
    for (const size of batchSizes) {
      const inputs: [any, any][] = Array.from({ length: size }, (_, i) => 
        [Field(i), Field(i + 1)]
      );
      
      const [, batchTime] = await measureTime(() => {
        for (const [x, y] of inputs) {
          Poseidon.hash([x, y]);
        }
      });
      
      console.log(`${size} hashes: ${batchTime.toFixed(3)}ms (${(batchTime / size).toFixed(3)}ms per hash)`);
    }
    
    // Test 3: Different input sizes
    console.log('\n--- Test 3: Variable Input Size Performance ---');
    const inputSizes = [2, 3, 5, 10, 15, 20, 30];
    
    for (const size of inputSizes) {
      const inputs = Array.from({ length: size }, (_, i) => Field(i * 10));
      
      // Warm-up
      Poseidon.hash(inputs);
      
      const [, hashTime] = await measureTime(() => Poseidon.hash(inputs));
      console.log(`${size} fields: ${hashTime.toFixed(3)}ms`);
    }
    
    // Test 4: Memory test - many sequential hashes
    console.log('\n--- Test 4: Memory Stress Test ---');
    const memTestSize = 10000;
    console.log(`Running ${formatNumber(memTestSize)} sequential hashes...`);
    
    const memStart = process.memoryUsage();
    const [, memTime] = await measureTime(() => {
      for (let i = 0; i < memTestSize; i++) {
        Poseidon.hash([Field(i), Field(i * 2)]);
      }
    });
    const memEnd = process.memoryUsage();
    
    console.log(`Time: ${memTime.toFixed(3)}ms (${(memTime / memTestSize).toFixed(3)}ms per hash)`);
    console.log(`Memory delta: ${((memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024).toFixed(2)}MB`);
    
    // Test 5: Special values
    console.log('\n--- Test 5: Special Values Test ---');
    const specialTests = [
      { name: 'Zero values', inputs: [Field(0), Field(0)] },
      { name: 'Max field', inputs: [Field(-1), Field(-1)] },
      { name: 'Powers of 2', inputs: [Field(2n ** 32n), Field(2n ** 64n)] },
      { name: 'Large numbers', inputs: [Field(10n ** 18n), Field(10n ** 19n)] }
    ];
    
    for (const test of specialTests) {
      const [hash, time] = await measureTime(() => Poseidon.hash(test.inputs));
      console.log(`${test.name}: ${time.toFixed(3)}ms`);
    }
    
    // Test 6: Poseidon state operations
    console.log('\n--- Test 6: Poseidon State Operations ---');
    
    // Test initialState
    const [initState, initStateTime] = await measureTime(() => Poseidon.initialState());
    console.log(`initialState(): ${initStateTime.toFixed(3)}ms`);
    
    // Test update
    const testInput = [Field(1), Field(2), Field(3)];
    const [updatedState, updateTime] = await measureTime(() => 
      Poseidon.update(initState, testInput)
    );
    console.log(`update(): ${updateTime.toFixed(3)}ms`);
    
    // Test hashWithPrefix
    const [prefixHash, prefixTime] = await measureTime(() => 
      Poseidon.hashWithPrefix('test', [Field(123)])
    );
    console.log(`hashWithPrefix(): ${prefixTime.toFixed(3)}ms`);
    
    // Summary statistics
    console.log('\n--- Performance Summary ---');
    
    // Calculate average from batch test
    const avgBatchTime = batchSizes.reduce((sum, size, i) => {
      if (i === 0) return sum; // Skip first warmup
      return sum + (batchTime / size);
    }, 0) / (batchSizes.length - 1);
    
    console.log(`Initialization: ${(initEnd - initStart).toFixed(3)}ms`);
    console.log(`Single hash (warmed up): ${time1.toFixed(3)}ms`);
    console.log(`Average per hash (batch): ~${(memTime / memTestSize).toFixed(3)}ms`);
    console.log(`Throughput: ~${formatNumber(1000 / (memTime / memTestSize))} hashes/second`);
    
    // Comparison with Sparky
    console.log('\n--- Comparison with Sparky ---');
    console.log('Sparky average: 1.662ms per hash');
    console.log(`Snarky average: ${(memTime / memTestSize).toFixed(3)}ms per hash`);
    const speedup = 1.662 / (memTime / memTestSize);
    if (speedup > 1) {
      console.log(`Snarky is ${speedup.toFixed(2)}x faster`);
    } else {
      console.log(`Sparky is ${(1/speedup).toFixed(2)}x faster`);
    }
    
  } catch (error) {
    console.error('Benchmark failed:', error);
    console.error('\nNote: This benchmark requires o1js to be built.');
    console.error('Try running: npm run build');
  }
}

// Run the benchmark
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});