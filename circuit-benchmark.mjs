#!/usr/bin/env node

import { Field, Circuit, switchBackend, getCurrentBackend } from './dist/node/index.js';

function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function benchmarkCircuitCompilation(backendName) {
  await switchBackend(backendName);
  console.log(`\n=== ${backendName.toUpperCase()} Circuit Compilation ===`);
  
  const results = {};
  
  // Simple circuit
  console.log("Compiling simple circuit...");
  const simpleStart = Date.now();
  const simpleCircuit = await Circuit.compile(
    () => {
      const a = Field(10);
      const b = Field(20);
      return a.add(b);
    },
    { name: 'simple' }
  );
  const simpleTime = Date.now() - simpleStart;
  results.simple = simpleTime;
  console.log(`Simple circuit: ${formatTime(simpleTime)}`);
  
  // Medium complexity circuit
  console.log("Compiling medium circuit...");
  const mediumStart = Date.now();
  const mediumCircuit = await Circuit.compile(
    () => {
      const inputs = Array.from({ length: 10 }, (_, i) => Field(i + 1));
      let result = Field(0);
      for (const input of inputs) {
        result = result.add(input.mul(input));
      }
      return result;
    },
    { name: 'medium' }
  );
  const mediumTime = Date.now() - mediumStart;
  results.medium = mediumTime;
  console.log(`Medium circuit: ${formatTime(mediumTime)}`);
  
  return results;
}

async function runCircuitBenchmarks() {
  console.log("Circuit Compilation Benchmarks");
  console.log("==============================");
  
  try {
    const snarkyResults = await benchmarkCircuitCompilation('snarky');
    const sparkyResults = await benchmarkCircuitCompilation('sparky');
    
    console.log("\n=== CIRCUIT COMPILATION COMPARISON ===");
    console.log("Circuit Type    | Snarky      | Sparky      | Speedup");
    console.log("----------------|-------------|-------------|--------");
    
    for (const [type, snarkyTime] of Object.entries(snarkyResults)) {
      const sparkyTime = sparkyResults[type];
      const speedup = snarkyTime / sparkyTime;
      const speedupText = speedup > 1 ? `${speedup.toFixed(2)}x faster` : `${(1/speedup).toFixed(2)}x slower`;
      
      console.log(`${type.padEnd(15)} | ${formatTime(snarkyTime).padEnd(11)} | ${formatTime(sparkyTime).padEnd(11)} | ${speedupText}`);
    }
    
  } catch (error) {
    console.error("Circuit benchmark failed:", error);
  }
}

runCircuitBenchmarks();