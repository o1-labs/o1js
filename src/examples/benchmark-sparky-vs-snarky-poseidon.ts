/**
 * Benchmark comparing Sparky (Rust) vs Snarky (OCaml) Poseidon implementations
 * 
 * This benchmark:
 * 1. Validates that both implementations produce the same outputs
 * 2. Measures performance differences
 * 3. Tests various input sizes and patterns
 */

// Import directly from the modules to avoid export issues
import { Field } from '../lib/provable/wrapped.js';
import { Poseidon } from '../lib/provable/crypto/poseidon.js';
import { initializeBindings } from '../bindings.js';
import { initSparky, getSparky } from '../bindings/sparky/index.js';

// Performance tracking
interface BenchmarkResult {
  name: string;
  sparkyTime: number;
  snarkyTime: number;
  speedup: number;
  outputsMatch: boolean;
  sparkyOutput?: string;
  snarkyOutput?: string;
}

// Helper to convert field element to string for comparison
function fieldToString(field: any): string {
  // Handle both o1js Field and Sparky field representations
  if (field && typeof field.toString === 'function') {
    return field.toString();
  }
  return String(field);
}

// Helper to measure execution time
async function measureTime<T>(fn: () => T | Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return [result, end - start];
}

// Convert Sparky field output to string
function sparkyFieldToString(sparkyField: any): string {
  // Sparky fields are represented as objects with internal structure
  // We need to extract the actual value
  if (sparkyField && typeof sparkyField === 'object') {
    // Try to convert to string representation
    return JSON.stringify(sparkyField);
  }
  return String(sparkyField);
}

// Benchmark functions
async function benchmarkSimpleHash(): Promise<BenchmarkResult> {
  const name = 'Simple hash (100, 0)';
  console.log(`\n${name}`);
  
  // Prepare inputs
  const a = Field(100);
  const b = Field(0);
  
  // Snarky benchmark
  const [snarkyResult, snarkyTime] = await measureTime(() => 
    Poseidon.hash([a, b])
  );
  const snarkyOutput = fieldToString(snarkyResult);
  console.log(`Snarky output: ${snarkyOutput}`);
  console.log(`Snarky time: ${snarkyTime.toFixed(3)}ms`);
  
  // Sparky benchmark
  const sparky = getSparky();
  const field = sparky.field;
  const gates = sparky.gates;
  
  const sparkyA = field.constant(100);
  const sparkyB = field.constant(0);
  
  const [sparkyResult, sparkyTime] = await measureTime(() => 
    gates.poseidonHash2(sparkyA, sparkyB)
  );
  const sparkyOutput = sparkyFieldToString(sparkyResult);
  console.log(`Sparky output: ${sparkyOutput}`);
  console.log(`Sparky time: ${sparkyTime.toFixed(3)}ms`);
  
  // Compare outputs (for now just log them)
  const outputsMatch = false; // Will implement proper comparison
  const speedup = snarkyTime / sparkyTime;
  
  return {
    name,
    sparkyTime,
    snarkyTime,
    speedup,
    outputsMatch,
    sparkyOutput,
    snarkyOutput
  };
}

async function benchmarkBatchHashes(): Promise<BenchmarkResult> {
  const name = 'Batch hashes (1000 operations)';
  console.log(`\n${name}`);
  
  const iterations = 1000;
  
  // Prepare inputs
  const inputs: [Field, Field][] = [];
  for (let i = 0; i < iterations; i++) {
    inputs.push([Field(i), Field(i + 1)]);
  }
  
  // Snarky benchmark
  const [snarkyResults, snarkyTime] = await measureTime(() => {
    const results = [];
    for (const [a, b] of inputs) {
      results.push(Poseidon.hash([a, b]));
    }
    return results;
  });
  console.log(`Snarky time: ${snarkyTime.toFixed(3)}ms (${(snarkyTime / iterations).toFixed(3)}ms per hash)`);
  
  // Sparky benchmark
  const sparky = getSparky();
  const field = sparky.field;
  const gates = sparky.gates;
  
  const [sparkyResults, sparkyTime] = await measureTime(() => {
    const results = [];
    for (let i = 0; i < iterations; i++) {
      const a = field.constant(i);
      const b = field.constant(i + 1);
      results.push(gates.poseidonHash2(a, b));
    }
    return results;
  });
  console.log(`Sparky time: ${sparkyTime.toFixed(3)}ms (${(sparkyTime / iterations).toFixed(3)}ms per hash)`);
  
  const outputsMatch = false; // Will implement proper comparison
  const speedup = snarkyTime / sparkyTime;
  
  return {
    name,
    sparkyTime,
    snarkyTime,
    speedup,
    outputsMatch
  };
}

async function benchmarkLargeInput(): Promise<BenchmarkResult> {
  const name = 'Large input hash (10 fields)';
  console.log(`\n${name}`);
  
  // Prepare inputs
  const inputs = Array.from({ length: 10 }, (_, i) => Field(i * 100));
  
  // Snarky benchmark
  const [snarkyResult, snarkyTime] = await measureTime(() => 
    Poseidon.hash(inputs)
  );
  console.log(`Snarky time: ${snarkyTime.toFixed(3)}ms`);
  
  // Sparky benchmark - need to use hash array
  const sparky = getSparky();
  const field = sparky.field;
  const gates = sparky.gates;
  
  const sparkyInputs = inputs.map(f => field.constant(Number(f.toString())));
  
  const [sparkyResult, sparkyTime] = await measureTime(() => 
    gates.poseidonHashArray(sparkyInputs)
  );
  console.log(`Sparky time: ${sparkyTime.toFixed(3)}ms`);
  
  const outputsMatch = false; // Will implement proper comparison
  const speedup = snarkyTime / sparkyTime;
  
  return {
    name,
    sparkyTime,
    snarkyTime,
    speedup,
    outputsMatch
  };
}

// Main benchmark runner
async function main() {
  console.log('Sparky vs Snarky Poseidon Benchmark');
  console.log('====================================');
  
  // Initialize both systems
  console.log('\nInitializing systems...');
  
  // Initialize Snarky
  const [, snarkyInitTime] = await measureTime(() => initializeBindings());
  console.log(`Snarky initialization: ${snarkyInitTime.toFixed(3)}ms`);
  
  // Initialize Sparky
  const [, sparkyInitTime] = await measureTime(() => initSparky());
  console.log(`Sparky initialization: ${sparkyInitTime.toFixed(3)}ms`);
  
  // Run benchmarks
  const results: BenchmarkResult[] = [];
  
  results.push(await benchmarkSimpleHash());
  results.push(await benchmarkBatchHashes());
  results.push(await benchmarkLargeInput());
  
  // Summary
  console.log('\n\nBenchmark Summary');
  console.log('=================');
  console.log('Name                          | Sparky (ms) | Snarky (ms) | Speedup | Match');
  console.log('------------------------------|-------------|-------------|---------|-------');
  
  for (const result of results) {
    console.log(
      `${result.name.padEnd(30)}| ${result.sparkyTime.toFixed(3).padStart(11)} | ${result.snarkyTime.toFixed(3).padStart(11)} | ${result.speedup.toFixed(2).padStart(7)}x | ${result.outputsMatch ? '✓' : '✗'}`
    );
  }
  
  console.log('\nInitialization times:');
  console.log(`Sparky: ${sparkyInitTime.toFixed(3)}ms`);
  console.log(`Snarky: ${snarkyInitTime.toFixed(3)}ms`);
  
  // Output comparison details
  if (results[0].sparkyOutput && results[0].snarkyOutput) {
    console.log('\nOutput comparison for simple hash:');
    console.log(`Sparky: ${results[0].sparkyOutput}`);
    console.log(`Snarky: ${results[0].snarkyOutput}`);
  }
}

// Run the benchmark
main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});