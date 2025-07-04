#!/usr/bin/env node

import { Field, Poseidon, switchBackend, getCurrentBackend } from './dist/node/index.js';

const ITERATIONS = 1000;
const WARMUP_ITERATIONS = 100;

function formatTime(ns) {
  if (ns < 1000) return `${ns.toFixed(2)}ns`;
  if (ns < 1000000) return `${(ns / 1000).toFixed(2)}μs`;
  if (ns < 1000000000) return `${(ns / 1000000).toFixed(2)}ms`;
  return `${(ns / 1000000000).toFixed(2)}s`;
}

function benchmark(name, fn, iterations = ITERATIONS) {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }
  
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  
  const totalTime = Number(end - start);
  const avgTime = totalTime / iterations;
  
  console.log(`  ${name}: ${formatTime(avgTime)} avg (${formatTime(totalTime)} total, ${iterations} iterations)`);
  return avgTime;
}

async function benchmarkBackend(backendName) {
  await switchBackend(backendName);
  console.log(`\n=== ${backendName.toUpperCase()} Backend Performance ===`);
  
  const results = {};
  
  // Field operations
  console.log("\nField Operations:");
  const a = Field(12345);
  const b = Field(67890);
  
  results.fieldAdd = benchmark("Field.add", () => a.add(b));
  results.fieldSub = benchmark("Field.sub", () => a.sub(b));
  results.fieldMul = benchmark("Field.mul", () => a.mul(b));
  results.fieldInv = benchmark("Field.inv", () => a.inv(), 100); // Slower operation
  results.fieldSquare = benchmark("Field.square", () => a.square());
  
  // Poseidon hash
  console.log("\nCryptographic Operations:");
  const inputs = [Field(1), Field(2), Field(3)];
  results.poseidon = benchmark("Poseidon.hash", () => Poseidon.hash(inputs), 100);
  
  // Boolean operations
  console.log("\nBoolean Operations:");
  const bool1 = a.equals(b);
  const bool2 = a.greaterThan(b);
  results.fieldEquals = benchmark("Field.equals", () => a.equals(b));
  results.fieldGreaterThan = benchmark("Field.greaterThan", () => a.greaterThan(b));
  
  return results;
}

async function runComparison() {
  console.log("Backend Performance Comparison");
  console.log("==============================");
  
  try {
    const snarkyResults = await benchmarkBackend('snarky');
    const sparkyResults = await benchmarkBackend('sparky');
    
    console.log("\n=== PERFORMANCE COMPARISON ===");
    console.log("Operation                | Snarky      | Sparky      | Speedup");
    console.log("-------------------------|-------------|-------------|--------");
    
    for (const [op, snarkyTime] of Object.entries(snarkyResults)) {
      const sparkyTime = sparkyResults[op];
      const speedup = snarkyTime / sparkyTime;
      const speedupText = speedup > 1 ? `${speedup.toFixed(2)}x faster` : `${(1/speedup).toFixed(2)}x slower`;
      
      console.log(`${op.padEnd(24)} | ${formatTime(snarkyTime).padEnd(11)} | ${formatTime(sparkyTime).padEnd(11)} | ${speedupText}`);
    }
    
    // Calculate overall performance
    const snarkyTotal = Object.values(snarkyResults).reduce((a, b) => a + b, 0);
    const sparkyTotal = Object.values(sparkyResults).reduce((a, b) => a + b, 0);
    const overallSpeedup = snarkyTotal / sparkyTotal;
    
    console.log("-------------------------|-------------|-------------|--------");
    console.log(`Overall                  | ${formatTime(snarkyTotal).padEnd(11)} | ${formatTime(sparkyTotal).padEnd(11)} | ${overallSpeedup > 1 ? `${overallSpeedup.toFixed(2)}x faster` : `${(1/overallSpeedup).toFixed(2)}x slower`}`);
    
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

runComparison();