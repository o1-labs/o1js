/**
 * Simple benchmark comparing Sparky vs Snarky Poseidon implementations
 * Uses minimal imports to avoid build issues
 */

import { initSparky, getSparky } from '../bindings/sparky/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Performance helper
async function measureTime<T>(fn: () => T | Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

// Import and initialize the OCaml bindings manually
async function initSnarky() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  // Import the compiled OCaml bindings
  const snarkyModule = await import('../bindings/compiled/node_bindings/o1js_node.bc.cjs');
  
  // Initialize the bindings
  await snarkyModule.default();
  
  return snarkyModule;
}

async function main() {
  console.log('Sparky vs Snarky Poseidon Benchmark (Simplified)');
  console.log('================================================\n');
  
  // Initialize Sparky
  console.log('Initializing Sparky...');
  const [, sparkyInitTime] = await measureTime(() => initSparky());
  console.log(`✓ Sparky initialized in ${sparkyInitTime.toFixed(3)}ms`);
  
  // Initialize Snarky (if possible)
  console.log('\nInitializing Snarky...');
  let snarky: any;
  try {
    const [snarkyModule, snarkyInitTime] = await measureTime(() => initSnarky());
    snarky = snarkyModule;
    console.log(`✓ Snarky initialized in ${snarkyInitTime.toFixed(3)}ms`);
  } catch (error) {
    console.log('✗ Could not initialize Snarky directly, will use Sparky-only benchmark');
    console.error('Error:', error);
  }
  
  // Get Sparky instance
  const sparky = getSparky();
  const field = sparky.field;
  const gates = sparky.gates;
  
  console.log('\n--- Test 1: Simple Hash (100, 0) ---');
  
  // Sparky hash
  const sparkyA = field.constant(100);
  const sparkyB = field.constant(0);
  
  const [sparkyResult, sparkyTime] = await measureTime(() => 
    gates.poseidonHash2(sparkyA, sparkyB)
  );
  
  console.log(`Sparky result: ${JSON.stringify(sparkyResult, null, 2)}`);
  console.log(`Sparky time: ${sparkyTime.toFixed(3)}ms`);
  
  // Expected result from Sparky tests
  console.log('\nExpected hash value (from Sparky tests):');
  console.log('8540862089960479027598468084103001504332093299703848384261193335348282518119');
  
  console.log('\n--- Test 2: Batch Performance (1000 hashes) ---');
  
  const iterations = 1000;
  const [, batchTime] = await measureTime(() => {
    for (let i = 0; i < iterations; i++) {
      const a = field.constant(i);
      const b = field.constant(i + 1);
      gates.poseidonHash2(a, b);
    }
  });
  
  console.log(`Batch time: ${batchTime.toFixed(3)}ms`);
  console.log(`Average per hash: ${(batchTime / iterations).toFixed(3)}ms`);
  
  console.log('\n--- Test 3: Array Hash Performance ---');
  
  // Test with different array sizes
  const arraySizes = [3, 5, 10, 20];
  
  for (const size of arraySizes) {
    const inputs = Array.from({ length: size }, (_, i) => field.constant(i * 10));
    
    const [, arrayTime] = await measureTime(() => 
      gates.poseidonHashArray(inputs)
    );
    
    console.log(`Array size ${size}: ${arrayTime.toFixed(3)}ms`);
  }
  
  console.log('\n--- Test 4: Constraint System Impact ---');
  
  const cs = sparky.constraintSystem;
  const initialRows = cs.rows(null);
  console.log(`Initial constraint rows: ${initialRows}`);
  
  // Do some hashes
  for (let i = 0; i < 10; i++) {
    const a = field.constant(i * 100);
    const b = field.constant(i * 200);
    gates.poseidonHash2(a, b);
  }
  
  const finalRows = cs.rows(null);
  console.log(`Final constraint rows: ${finalRows}`);
  console.log(`Constraints per hash: ${(finalRows - initialRows) / 10}`);
  
  console.log('\n--- Summary ---');
  console.log(`Sparky initialization: ${sparkyInitTime.toFixed(3)}ms`);
  console.log(`Performance: ${(batchTime / iterations).toFixed(3)}ms per hash`);
  console.log(`Constraints: ${(finalRows - initialRows) / 10} per hash`);
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});