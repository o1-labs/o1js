/**
 * Test script to compare Poseidon outputs between Sparky and native o1js
 * Uses .mjs extension to avoid TypeScript compilation issues
 */

import { Field, Poseidon } from './dist/node/index.js';
import { performance } from 'perf_hooks';

// Note: We'll manually integrate Sparky results since direct import has issues

async function measureTime(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

async function main() {
  console.log('O1js Native Poseidon Test');
  console.log('=========================\n');
  
  // Test 1: Hash (100, 0)
  console.log('--- Test 1: Hash(100, 0) ---');
  const a = Field(100);
  const b = Field(0);
  
  const [hash, time] = await measureTime(() => Poseidon.hash([a, b]));
  
  console.log(`Result: ${hash.toString()}`);
  console.log(`Time: ${time.toFixed(3)}ms`);
  
  // Compare with expected Sparky result
  console.log('\nExpected (from Sparky):');
  console.log('8540862089960479027598468084103001504332093299703848384261193335348282518119');
  
  // Test 2: Batch performance
  console.log('\n--- Test 2: Batch Performance (1000 hashes) ---');
  const iterations = 1000;
  
  const [, batchTime] = await measureTime(() => {
    for (let i = 0; i < iterations; i++) {
      Poseidon.hash([Field(i), Field(i + 1)]);
    }
  });
  
  console.log(`Total time: ${batchTime.toFixed(3)}ms`);
  console.log(`Average per hash: ${(batchTime / iterations).toFixed(3)}ms`);
  
  // Test 3: Various inputs
  console.log('\n--- Test 3: Various Input Tests ---');
  const testCases = [
    [Field(0), Field(0)],
    [Field(1), Field(1)],
    [Field(100), Field(200)],
    [Field(2n ** 64n), Field(2n ** 32n)]
  ];
  
  for (const [x, y] of testCases) {
    const hash = Poseidon.hash([x, y]);
    console.log(`hash(${x.toString()}, ${y.toString()}) = ${hash.toString()}`);
  }
  
  // Test 4: Array hashing
  console.log('\n--- Test 4: Array Hash Performance ---');
  const arraySizes = [3, 5, 10, 20];
  
  for (const size of arraySizes) {
    const inputs = Array.from({ length: size }, (_, i) => Field(i * 10));
    
    const [, arrayTime] = await measureTime(() => 
      Poseidon.hash(inputs)
    );
    
    console.log(`Array size ${size}: ${arrayTime.toFixed(3)}ms`);
  }
  
  // Summary comparison with Sparky
  console.log('\n--- Performance Comparison ---');
  console.log('Sparky average: 1.662ms per hash');
  console.log(`O1js average: ${(batchTime / iterations).toFixed(3)}ms per hash`);
  console.log(`Speedup: ${((batchTime / iterations) / 1.662).toFixed(2)}x`);
}

main().catch(console.error);