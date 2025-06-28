/**
 * Simple performance test for Snarky Poseidon
 * Uses the crypto bindings directly to avoid build issues
 */

import { Poseidon as PoseidonBigint } from '../bindings/crypto/poseidon.js';
import { performance } from 'perf_hooks';

// Helper to measure execution time
async function measureTime<T>(fn: () => T | Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}

async function main() {
  console.log('Snarky Poseidon Performance Test (BigInt Implementation)');
  console.log('========================================================\n');
  
  // This uses the pure TypeScript/BigInt implementation
  console.log('Note: This tests the BigInt reference implementation, not the OCaml version\n');
  
  // Test 1: Single hash
  console.log('--- Test 1: Single Hash Performance ---');
  const input1 = [100n, 0n];
  
  // Warm-up
  PoseidonBigint.hash(input1);
  
  const [hash1, time1] = await measureTime(() => PoseidonBigint.hash(input1));
  console.log(`hash(100, 0) = ${hash1}`);
  console.log(`Time: ${time1.toFixed(3)}ms`);
  
  // Verify it matches expected value
  const expected = '8540862089960479027598468084103001504332093299703848384261193335348282518119';
  console.log(`Expected:      ${expected}`);
  console.log(`Match: ${hash1.toString() === expected ? '✓' : '✗'}`);
  
  // Test 2: Batch performance
  console.log('\n--- Test 2: Batch Performance ---');
  const batchSizes = [10, 100, 1000, 5000];
  
  for (const size of batchSizes) {
    const inputs = Array.from({ length: size }, (_, i) => [BigInt(i), BigInt(i + 1)]);
    
    const [, batchTime] = await measureTime(() => {
      for (const input of inputs) {
        PoseidonBigint.hash(input);
      }
    });
    
    console.log(`${size} hashes: ${batchTime.toFixed(3)}ms (${(batchTime / size).toFixed(3)}ms per hash)`);
  }
  
  // Test 3: Variable input sizes
  console.log('\n--- Test 3: Variable Input Sizes ---');
  const inputSizes = [2, 3, 5, 10, 15];
  
  for (const size of inputSizes) {
    const input = Array.from({ length: size }, (_, i) => BigInt(i * 10));
    
    // Warm-up
    PoseidonBigint.hash(input);
    
    const [, time] = await measureTime(() => PoseidonBigint.hash(input));
    console.log(`${size} fields: ${time.toFixed(3)}ms`);
  }
  
  // Test 4: Update operation
  console.log('\n--- Test 4: State Update Performance ---');
  const initialState = [0n, 0n, 0n];
  const updateInput = [1n, 2n, 3n];
  
  const [, updateTime] = await measureTime(() => 
    PoseidonBigint.update(initialState, updateInput)
  );
  console.log(`update() time: ${updateTime.toFixed(3)}ms`);
  
  // Test 5: Memory stress test
  console.log('\n--- Test 5: Memory Stress Test ---');
  const stressSize = 10000;
  
  console.log(`Running ${formatNumber(stressSize)} hashes...`);
  const memStart = process.memoryUsage();
  
  const [, stressTime] = await measureTime(() => {
    for (let i = 0; i < stressSize; i++) {
      PoseidonBigint.hash([BigInt(i), BigInt(i * 2)]);
    }
  });
  
  const memEnd = process.memoryUsage();
  const memDelta = (memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024;
  
  console.log(`Time: ${stressTime.toFixed(3)}ms (${(stressTime / stressSize).toFixed(3)}ms per hash)`);
  console.log(`Memory delta: ${memDelta.toFixed(2)}MB`);
  console.log(`Throughput: ~${formatNumber(1000 / (stressTime / stressSize))} hashes/second`);
  
  // Test 6: Compare with legacy implementation
  console.log('\n--- Test 6: Legacy vs Current Implementation ---');
  
  try {
    const { PoseidonLegacy } = await import('../bindings/crypto/poseidon.js');
    
    const testInput = [123n, 456n];
    
    const [current, currentTime] = await measureTime(() => PoseidonBigint.hash(testInput));
    const [legacy, legacyTime] = await measureTime(() => PoseidonLegacy.hash(testInput));
    
    console.log(`Current: ${currentTime.toFixed(3)}ms`);
    console.log(`Legacy:  ${legacyTime.toFixed(3)}ms`);
    console.log(`Results match: ${current === legacy ? '✓' : '✗'}`);
  } catch (e) {
    console.log('Legacy implementation not available');
  }
  
  // Summary and comparison
  console.log('\n--- Performance Summary ---');
  const avgTime = stressTime / stressSize;
  console.log(`Average per hash: ${avgTime.toFixed(3)}ms`);
  console.log(`Throughput: ~${formatNumber(1000 / avgTime)} hashes/second`);
  
  console.log('\n--- Comparison with Sparky ---');
  console.log(`Sparky (WASM): 1.662ms per hash`);
  console.log(`Snarky (BigInt): ${avgTime.toFixed(3)}ms per hash`);
  const speedup = avgTime / 1.662;
  console.log(`Sparky is ${speedup.toFixed(2)}x faster than BigInt implementation`);
  
  console.log('\nNote: This BigInt implementation is NOT the optimized OCaml version.');
  console.log('The actual Snarky performance would be significantly better.');
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});